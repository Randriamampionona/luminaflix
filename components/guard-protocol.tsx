"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, RefreshCcw, Terminal } from "lucide-react";

const IS_PROD = process.env.NODE_ENV === "production";

export default function GuardProtocol({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [reason, setReason] = useState<"ADBLOCK" | "IDM" | null>(null);

  // --- LOCKDOWN: DISALLOW INTERFACE MANIPULATION ---
  const enforceLockdown = useCallback((e: any) => {
    if (!IS_PROD) return;
    if (e.type === "contextmenu") {
      e.preventDefault();
      return false;
    }
    if (
      e.keyCode === 123 || // F12
      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
      (e.ctrlKey && e.keyCode === 85) // Ctrl+U
    ) {
      e.preventDefault();
      return false;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("contextmenu", enforceLockdown);
    document.addEventListener("keydown", enforceLockdown);

    const detectInterference = async () => {
      // 1. ADBLOCK DETECTION (Honey-pot fetch)
      const googleAdUrl =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      try {
        await fetch(new Request(googleAdUrl), {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
        });
      } catch (error) {
        setReason("ADBLOCK");
        setIsBlocked(true);
        return;
      }

      // 2. IDM DETECTION (Attribute Probe)
      const checkIDM = () => {
        const idmAttributes = ["__idm_id__", "idm_extension"];
        const hasIDM = document.body
          .getAttributeNames()
          .some((attr) => idmAttributes.includes(attr));
        if (hasIDM) {
          setReason("IDM");
          setIsBlocked(true);
        }
      };
      checkIDM();
    };

    detectInterference();

    return () => {
      document.removeEventListener("contextmenu", enforceLockdown);
      document.removeEventListener("keydown", enforceLockdown);
    };
  }, [enforceLockdown]);

  // --- DOM INTEGRITY: RELOAD IF OVERLAY IS TAMPERED WITH ---
  useEffect(() => {
    if (isBlocked) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node: any) => {
            if (node.id === "lumina-guard-overlay") {
              window.location.reload();
            }
          });
        });
      });

      observer.observe(document.body, { childList: true });
      return () => observer.disconnect();
    }
  }, [isBlocked]);

  if (isBlocked) {
    return (
      <div
        id="lumina-guard-overlay"
        className="fixed inset-0 w-screen h-screen z-999999 bg-zinc-950 flex flex-col items-center justify-center p-8 text-center select-none overflow-hidden"
      >
        {/* Background Decorative Element */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <ShieldAlert className="w-12 h-12 text-red-500" />
              </div>
              <Terminal className="absolute -bottom-2 -right-2 w-8 h-8 text-white bg-black p-1.5 rounded-lg border border-white/20" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">
              Terminal <span className="text-red-500">Lockdown</span>
            </h1>
            <div className="inline-block px-4 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">
                Protocol Error: {reason}_INTERFERENCE
              </span>
            </div>
          </div>

          <div className="max-w-md space-y-6">
            <p className="text-zinc-400 text-xs md:text-sm uppercase tracking-widest font-bold leading-relaxed">
              Lumina Architecture has detected{" "}
              <span className="text-white underline decoration-red-500 underline-offset-4">
                {reason === "ADBLOCK" ? "an Ad-Blocker" : "IDM Interception"}
              </span>
              . To maintain secure link integrity, please{" "}
              <span className="text-cyan-400">disable the extension</span> and
              initiate a system rescan.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="group relative flex items-center gap-3 mx-auto px-12 py-5 bg-white hover:bg-cyan-500 transition-all duration-500 rounded-2xl"
            >
              <RefreshCcw className="w-4 h-4 text-black group-hover:rotate-180 transition-transform duration-700" />
              <span className="text-black font-black text-xs uppercase tracking-[0.2em]">
                Rescan & Reload Link
              </span>
              <div className="absolute -inset-1 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="pt-12">
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">
              Lumina Core Security Division — v4.0.2
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
