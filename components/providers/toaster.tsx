"use client";

import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!bg-zinc-950 !border-white/10 !rounded-2xl",
          title: "!font-bold",
        },
      }}
    />
  );
}
