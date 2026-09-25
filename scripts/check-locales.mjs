// Verifies every locale has exactly the same keys (and array lengths) as en.json.
// Usage: node scripts/check-locales.mjs
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../locales/", import.meta.url);
const load = (file) => JSON.parse(readFileSync(new URL(file, dir), "utf8"));

function shape(value, prefix = "", out = new Map()) {
  if (Array.isArray(value)) {
    out.set(prefix, `array(${value.length})`);
    value.forEach((item, i) => shape(item, `${prefix}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) shape(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out.set(prefix, typeof value);
  }
  return out;
}

const reference = shape(load("en.json"));
let failed = false;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const current = shape(load(file));
  const missing = [...reference.keys()].filter((k) => !current.has(k));
  const extra = [...current.keys()].filter((k) => !reference.has(k));
  const mismatched = [...reference.keys()].filter((k) => current.has(k) && current.get(k) !== reference.get(k));
  if (missing.length || extra.length || mismatched.length) {
    failed = true;
    console.error(`✗ ${file}`, { missing, extra, mismatched });
  } else {
    console.log(`✓ ${file} matches en.json (${reference.size} entries)`);
  }
}
process.exit(failed ? 1 : 0);
