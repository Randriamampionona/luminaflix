/**
 * PostCSS fallbacks for legacy WebKit / Chromium engines (Smart TV browsers:
 * Samsung Tizen 4+, LG webOS 5+, older Android TV WebViews — Chromium 56-87).
 * Runs after Tailwind and postcss-preset-env (see postcss.config.mjs).
 *
 * Every fallback is either placed BEFORE the modern declaration (old engines
 * keep it, modern ones override it), or inside `@supports not (...)` blocks
 * that modern browsers skip — so modern rendering is unchanged.
 *
 *  - inset: …            → top / right / bottom / left first          (Chromium < 87)
 *  - 100dvh / svh / lvh  → 100vh first                                (Chromium < 108)
 *  - gap / row-gap / …   → grid-gap / grid-row-gap / … first          (Chromium < 66)
 *  - translate / scale / rotate properties → transform: …()           (Chromium < 104)
 *  - :where() / :is() selectors → unwrapped copies                    (Chromium < 88)
 *  - aspect-ratio        → padding-top ratio box                      (Chromium < 88)
 *  - @property defaults  → plain custom-property defaults             (Chromium < 85)
 * (Cascade layers, logical properties, nesting and media ranges are
 *  handled by postcss-preset-env.)
 */
const LEGACY = "not (aspect-ratio: 1 / 1)"; // ≈ Chromium < 88 / Safari < 15
const NO_TRANSLATE = "not (translate: 0)"; // ≈ Chromium < 104 / Safari < 14.1

/** Splits on top-level commas / spaces (ignores those inside parentheses). */
function splitTop(value, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && (sep === " " ? /\s/.test(ch) : ch === sep)) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** "a:where(.x,.y) b" → ["a.x b", "a.y b"] (also :is). Recursive, keeps order. */
function expandPseudo(selector) {
  const m = /:(where|is)\(/.exec(selector);
  if (!m) return [selector];
  let depth = 1;
  let i = m.index + m[0].length;
  const start = i;
  for (; i < selector.length && depth > 0; i++) {
    if (selector[i] === "(") depth++;
    if (selector[i] === ")") depth--;
  }
  const inner = selector.slice(start, i - 1);
  const before = selector.slice(0, m.index);
  const after = selector.slice(i);
  const out = [];
  for (const arg of splitTop(inner, ",")) {
    for (const expanded of expandPseudo(joinCompound(before, arg) + after)) out.push(expanded);
  }
  return out;
}

/** Index just after the last top-level combinator (space > + ~) in `sel`, or 0. */
function lastCombinatorEnd(sel) {
  let depth = 0;
  let end = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && /[\s>+~]/.test(ch)) end = i + 1;
  }
  return end;
}

/** Merges two compound selectors; a type selector (or *) must come first. */
function mergeCompound(a, b) {
  const typeRe = /^([a-zA-Z][\w-]*|\*)/;
  const ta = (typeRe.exec(a) || [""])[0];
  const tb = (typeRe.exec(b) || [""])[0];
  const ra = a.slice(ta.length);
  const rb = b.slice(tb.length);
  let type = tb && tb !== "*" ? tb : ta && ta !== "*" ? ta : "";
  if (!type && !ra && !rb && (ta || tb)) type = "*";
  return type + ra + rb;
}

/**
 * Replaces `before:is(arg)` by an equivalent plain selector: the last compound
 * of `arg` merges with the compound `before` ends with, the rest of `arg` goes
 * in front — ".x:is(.peer:checked~*)>svg" → ".peer:checked~.x>svg".
 * (For two complex selectors this is an approximation; it only feeds the
 * legacy-engine fallback.)
 */
function joinCompound(before, arg) {
  if (!before || /[\s>+~(,]$/.test(before)) return before + arg;
  const b = lastCombinatorEnd(before);
  const a = lastCombinatorEnd(arg);
  return before.slice(0, b) + arg.slice(0, a) + mergeCompound(before.slice(b), arg.slice(a));
}

const isKeyframes = (node) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === "atrule" && /keyframes$/.test(p.name)) return true;
  return false;
};

module.exports = () => ({
  postcssPlugin: "legacy-tv",
  OnceExit(root, { AtRule, Rule, Declaration }) {
    // Theme ratios (e.g. --aspect-video: 16 / 9) for aspect-ratio: var(--aspect-…)
    const ratios = {};
    root.walkDecls(/^--aspect-/, (d) => (ratios[d.prop] = d.value));

    const legacyBlocks = []; // [afterNode, rule] pairs, inserted at the end

    root.walkDecls((d) => {
      const rule = d.parent;
      if (!rule || rule.type !== "rule" || isKeyframes(d)) return;

      // inset → longhands
      if (d.prop === "inset") {
        const v = splitTop(d.value, " ");
        const [t, r = t, b = t, l = r] = v;
        if (!rule.some((n) => n.type === "decl" && n.prop === "top")) {
          d.cloneBefore({ prop: "top", value: t });
          d.cloneBefore({ prop: "right", value: r });
          d.cloneBefore({ prop: "bottom", value: b });
          d.cloneBefore({ prop: "left", value: l });
        }
      }

      // dynamic viewport units → vh / vw first
      if (/\d(?:dvh|svh|lvh|dvw|svw|lvw)\b/.test(d.value) && !d.prop.startsWith("--")) {
        d.cloneBefore({ value: d.value.replace(/(\d)(?:d|s|l)v(h|w)\b/g, "$1v$2") });
      }

      // gap → grid-gap (old Chromium grid)
      const gapMap = { gap: "grid-gap", "row-gap": "grid-row-gap", "column-gap": "grid-column-gap" };
      if (gapMap[d.prop]) d.cloneBefore({ prop: gapMap[d.prop] });
    });

    // translate / scale / rotate → transform (only where those properties are unknown)
    root.walkRules((rule) => {
      if (isKeyframes(rule)) return;
      const parts = [];
      rule.each((n) => {
        if (n.type !== "decl") return;
        if (n.prop === "translate") {
          const [x, y = "0"] = splitTop(n.value, " ");
          parts.push(`translate(${x}, ${y})`);
        } else if (n.prop === "scale") {
          const [x, y = x] = splitTop(n.value, " ");
          parts.push(`scale(${x}, ${y})`);
        } else if (n.prop === "rotate" && !/\s/.test(n.value.trim())) {
          parts.push(`rotate(${n.value})`);
        }
      });
      if (!parts.length) return;
      const at = new AtRule({ name: "supports", params: NO_TRANSLATE });
      at.append(
        new Rule({ selector: rule.selector }).append(new Declaration({ prop: "transform", value: parts.join(" ") })),
      );
      legacyBlocks.push([rule, at]);
    });

    // :where() / :is() → unwrapped copies; aspect-ratio → padding box
    root.walkRules((rule) => {
      if (isKeyframes(rule)) return;
      const legacyRules = [];
      if (/:(where|is)\(/.test(rule.selector)) {
        const selectors = rule.selectors.flatMap(expandPseudo);
        legacyRules.push(rule.clone({ selectors }));
      }
      rule.each((n) => {
        if (n.type !== "decl" || n.prop !== "aspect-ratio") return;
        let value = n.value.trim();
        const v = /^var\((--[\w-]+)\)$/.exec(value);
        if (v && ratios[v[1]]) value = ratios[v[1]];
        const m = /^([\d.]+)\s*(?:\/\s*([\d.]+))?$/.exec(value);
        if (!m) return;
        const pct = ((Number(m[2] || 1) / Number(m[1])) * 100).toFixed(4);
        const base = rule.selectors.map((s) => s.replace(/::?(before|after)$/, ""));
        legacyRules.push(
          new Rule({ selectors: base.map((s) => `${s}::before`) }).append(
            { prop: "content", value: '""' },
            { prop: "float", value: "left" },
            { prop: "padding-top", value: `${pct}%` },
          ),
          new Rule({ selectors: base.map((s) => `${s}::after`) }).append(
            { prop: "content", value: '""' },
            { prop: "display", value: "block" },
            { prop: "clear", value: "both" },
          ),
        );
      });
      if (!legacyRules.length) return;
      const at = new AtRule({ name: "supports", params: LEGACY });
      legacyRules.forEach((r) => at.append(r));
      legacyBlocks.push([rule, at]);
    });

    // Tailwind's @property defaults are only given to Safari/Firefox without
    // @property: give them to old Chromium too (gradients, shadows, transforms).
    root.walkAtRules("supports", (at) => {
      if (/-webkit-hyphens/.test(at.params) && /margin-trim/.test(at.params)) {
        const copy = new AtRule({ name: "supports", params: LEGACY });
        at.each((n) => copy.append(n.clone()));
        legacyBlocks.push([at, copy]);
      }
    });

    // Insert right after their source so the cascade order is kept.
    for (const [after, block] of legacyBlocks) {
      if (after.parent) after.after(block);
    }
  },
});
module.exports.postcss = true;
