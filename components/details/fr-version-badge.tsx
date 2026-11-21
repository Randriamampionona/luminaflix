"use client";

import { useFrStatus } from "@/lib/fr-status-client";
import type { MediaKind } from "@/lib/media";

/** "VF + VOSTFR" / "VF" / "VOSTFR" when the title is available in French (same check as the cards). */
export default function FrVersionBadge({ kind, id }: { kind: MediaKind; id: number }) {
  const status = useFrStatus(kind, id, true);
  const label =
    status === "both"
      ? "VF + VOSTFR"
      : status === "vf"
        ? "VF"
        : status === "vostfr"
          ? "VOSTFR"
          : status === "fr"
            ? "VF"
            : null;
  if (!label) return null;
  return (
    <span className="rounded-md bg-cyan-500 px-2 py-0.5 text-[10px] font-black tracking-wider text-black">{label}</span>
  );
}
