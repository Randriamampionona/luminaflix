import type { Metadata } from "next";
import { LOGO_COLORS, LOGO_PIECES, LOGO_VIEWBOX } from "@/components/brand/logo-shapes";
import LaunchRedirect from "@/components/brand/launch-redirect";

export const metadata: Metadata = { title: "LuminaFlix", robots: { index: false, follow: false } };

/**
 * Start page of the installed app (manifest start_url and shortcuts). The
 * service worker serves it straight from its cache, so the phone's own splash
 * only flashes and the animated vector logo appears right away; then the app
 * moves on to `?to=` or the home page.
 *
 * Fully self-contained (inline styles + keyframes) so it renders even if the
 * site's CSS or JavaScript isn't available yet, and the inline script leaves
 * the page after 3.5 s no matter what.
 */
const FALLBACK_SCRIPT = `setTimeout(function () {
  if (location.pathname !== "/launch") return;
  var to = new URLSearchParams(location.search).get("to");
  var path = to && to.charAt(0) === "/" && to.charAt(1) !== "/" ? to : "/";
  location.replace(path + (path.indexOf("?") > -1 ? "&" : "?") + "source=pwa");
}, 3500);`;

const STYLES = `
.lf-launch{position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:#020202}
.lf-launch-word{margin:0;font:italic 900 24px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:-.05em;text-transform:uppercase;color:#fff}
.lf-launch-word span{color:#22d3ee}
.lf-launch-track{width:160px;height:4px;overflow:hidden;border-radius:9999px;background:rgba(255,255,255,.1)}
.lf-launch-bar{width:40%;height:100%;border-radius:9999px;background:#22d3ee;animation:lf-launch-bar 1.1s ease-in-out infinite}
.lf-launch-piece{stroke-dasharray:1;stroke-dashoffset:1;fill-opacity:0;animation:lf-launch-draw .75s cubic-bezier(.65,0,.35,1) var(--d) forwards,lf-launch-fill .45s ease-out calc(var(--d) + .55s) forwards}
@keyframes lf-launch-draw{to{stroke-dashoffset:0}}
@keyframes lf-launch-fill{to{fill-opacity:1}}
@keyframes lf-launch-bar{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
@media (prefers-reduced-motion:reduce){.lf-launch-piece{animation:none;stroke-dashoffset:0;fill-opacity:1}.lf-launch-bar{animation:none}}`;

export default function LaunchPage() {
  return (
    <div className="lf-launch">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <svg viewBox={LOGO_VIEWBOX} width={132} height={132} role="img" aria-label="LuminaFlix">
        <defs>
          <filter id="lf-launch-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {LOGO_PIECES.map((piece, index) => {
          const color = LOGO_COLORS[piece.color];
          return (
            <polygon
              key={piece.points}
              points={piece.points}
              pathLength={1}
              fill={color}
              stroke={color}
              strokeWidth={3}
              strokeLinejoin="round"
              filter={piece.color === "cyan" ? "url(#lf-launch-glow)" : undefined}
              className="lf-launch-piece"
              style={{ "--d": `${index * 140}ms` } as React.CSSProperties}
            />
          );
        })}
      </svg>
      <p className="lf-launch-word">
        Lumina<span>Flix</span>
      </p>
      <div className="lf-launch-track">
        <div className="lf-launch-bar" />
      </div>
      <LaunchRedirect />
      <script dangerouslySetInnerHTML={{ __html: FALLBACK_SCRIPT }} />
    </div>
  );
}
