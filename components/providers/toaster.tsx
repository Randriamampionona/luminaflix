"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border-line-strong",
          title: "!font-bold",
        },
      }}
    />
  );
}
