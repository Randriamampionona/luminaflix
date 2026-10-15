import type { Metadata } from "next";
import AnimatedLogo from "@/components/brand/animated-logo";
import LaunchRedirect from "@/components/brand/launch-redirect";

export const metadata: Metadata = { title: "LuminaFlix", robots: { index: false, follow: false } };

const TARGET = "/?source=pwa";

/**
 * Start page of the installed app (manifest start_url). The service worker
 * serves it straight from its cache, so the phone's own splash screen only
 * flashes and the animated vector logo appears right away; then the app moves
 * on to the home page.
 */
export default function LaunchPage() {
  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-6"
      style={{ background: "#020202" }}
    >
      <AnimatedLogo size={132} />
      <p className="text-2xl font-black tracking-tighter text-white uppercase italic">
        Lumina<span className="text-cyan-400">Flix</span>
      </p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/5 rounded-full bg-cyan-400 animate-[lf-boot-bar_1.1s_ease-in-out_infinite]" />
      </div>
      <LaunchRedirect to={TARGET} />
      {/* Safety net if JavaScript is slow or fails: plain redirect after 4 s. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){if(location.pathname==="/launch")location.replace(${JSON.stringify(TARGET)})},4000);`,
        }}
      />
    </div>
  );
}
