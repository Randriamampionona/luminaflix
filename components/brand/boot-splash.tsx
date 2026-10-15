import AnimatedLogo from "./animated-logo";

/**
 * Startup screen of the installed app (PWA). Rendered in the server HTML, so
 * it appears instantly — before any JavaScript — with the vector logo drawing
 * itself (sharp on every screen, unlike the OS splash built from a PNG icon).
 *
 * Only visible in standalone mode (CSS media query), only on a cold start (once
 * per app session), and removed ~1 s after the page has loaded.
 */
const BOOT_SCRIPT = `(function () {
  var el = document.getElementById("lf-boot");
  if (!el) return;
  if (location.pathname === "/launch") { el.remove(); return; }
  try {
    if (sessionStorage.getItem("lf_booted")) { el.remove(); return; }
    sessionStorage.setItem("lf_booted", "1");
  } catch (_) {}
  function hide() {
    setTimeout(function () {
      el.classList.add("lf-boot-hide");
      setTimeout(function () { el.remove(); }, 600);
    }, 1100);
  }
  if (document.readyState === "complete") hide();
  else window.addEventListener("load", hide, { once: true });
})();`;

export default function BootSplash() {
  return (
    <>
      <div
        id="lf-boot"
        aria-hidden
        className="fixed inset-0 z-[300] flex-col items-center justify-center gap-6 bg-[#020202]"
      >
        <AnimatedLogo size={132} />
        <p className="text-2xl font-black tracking-tighter text-white uppercase italic">
          Lumina<span className="text-cyan-400">Flix</span>
        </p>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/5 rounded-full bg-cyan-400 animate-[lf-boot-bar_1.1s_ease-in-out_infinite]" />
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
    </>
  );
}
