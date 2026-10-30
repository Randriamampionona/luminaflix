import Script from "next/script";
import { PREFS_BOOT_SCRIPT } from "@/lib/user-prefs";

/** Applies the data-saver preference before the first paint (no flash of full-size images). */
export default function PrefsScript() {
  return (
    <Script id="lf-prefs" strategy="beforeInteractive">
      {PREFS_BOOT_SCRIPT}
    </Script>
  );
}
