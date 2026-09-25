"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { handleMediaReaction, toggleFavorite } from "@/action/stream-actions";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { applyReaction, type MediaInteraction, type MediaRef } from "@/lib/media-interactions";

type PendingAction = "like" | "dislike" | "favorite" | null;

/**
 * State + handlers for the player's Like / Dislike / Favorite buttons.
 *
 * - Optimistic: icons and counts change on click, then are replaced by the
 *   server's authoritative state (or rolled back on failure).
 * - Signed-out users get the Clerk sign-in modal (returning to this exact
 *   episode) plus a toast explaining why.
 * - One request at a time, so rapid clicks can't desync the UI.
 */
export function useMediaActions(mediaRef: MediaRef, initial: MediaInteraction) {
  const t = useTranslations("actions");
  const router = useRouter();
  const { isLoaded, requireAuth } = useAuthGate();
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState<PendingAction>(null);
  const inFlight = useRef(false);

  const ensureSignedIn = (message: string) => {
    if (requireAuth()) return true;
    if (isLoaded) toast.info(message);
    return false;
  };

  const react = async (action: "like" | "dislike") => {
    if (inFlight.current || !ensureSignedIn(t("signInToReact"))) return;
    inFlight.current = true;

    const previous = state;
    setState(applyReaction(previous, action));
    setPending(action);

    try {
      const result = await handleMediaReaction({ ...mediaRef, action });
      if (result.success) {
        setState((current) => ({ ...current, ...result.interaction }));
      } else {
        setState(previous);
        toast.error(result.error === "UNAUTHORIZED" ? t("signInToReact") : t("error"));
      }
    } catch {
      setState(previous);
      toast.error(t("error"));
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const favorite = async () => {
    if (inFlight.current || !ensureSignedIn(t("signInToSave"))) return;
    inFlight.current = true;

    const wasFavorite = state.isFavorite;
    setState((current) => ({ ...current, isFavorite: !wasFavorite }));
    setPending("favorite");

    try {
      const result = await toggleFavorite(mediaRef);
      if (result.success) {
        setState((current) => ({ ...current, isFavorite: result.added }));
        if (result.added) {
          toast.success(t("addedFavorite"), {
            action: { label: t("viewFavorites"), onClick: () => router.push("/favorites") },
          });
        } else {
          toast.success(t("removedFavorite"));
        }
      } else {
        setState((current) => ({ ...current, isFavorite: wasFavorite }));
        toast.error(result.error === "UNAUTHORIZED" ? t("signInToSave") : t("error"));
      }
    } catch {
      setState((current) => ({ ...current, isFavorite: wasFavorite }));
      toast.error(t("error"));
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  return {
    state,
    pending,
    /** Buttons stay disabled until Clerk knows whether the user is signed in. */
    ready: isLoaded,
    like: () => react("like"),
    dislike: () => react("dislike"),
    favorite,
  };
}
