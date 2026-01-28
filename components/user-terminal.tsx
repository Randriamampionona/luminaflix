"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import { useRef } from "react";

export default function UserTerminal() {
  const { user, isLoaded } = useUser();
  const userBtnRef = useRef<HTMLDivElement>(null);

  if (!isLoaded || !user) return null;

  return (
    <div className="group relative flex items-center gap-3 pl-4 pr-1 py-3 xl:py-1 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-md hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
      {/* USER METADATA */}
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase italic tracking-tighter text-white leading-none">
            {user.firstName || "Operator"}
          </span>
          <ShieldCheck className="w-3 h-3 text-cyan-500" />
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-zinc-500 group-hover:text-cyan-400 transition-colors">
            Level 01 Access
          </span>
          <div className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
          </div>
        </div>
      </div>

      {/* AVATAR WRAPPER */}
      <div className="relative">
        <div className="absolute -inset-1 bg-linear-to-tr from-cyan-500 to-blue-600 rounded-full opacity-20 group-hover:opacity-100 blur-xs transition-opacity duration-500" />
        <div className="relative bg-black rounded-full flex items-center justify-center">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "w-9.5 h-9.5 rounded-full border border-white/10",
                userButtonPopoverCard:
                  "bg-zinc-950 border border-white/10 backdrop-blur-xl",
                userButtonPopoverActionButtonText:
                  "text-white font-bold uppercase tracking-widest text-[10px]",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </div>

      {/* DECORATIVE CORNER */}
      <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-cyan-500/50 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
