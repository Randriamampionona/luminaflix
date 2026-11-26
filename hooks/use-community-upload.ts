"use client";

import { useSyncExternalStore } from "react";
import { uploadStore } from "@/lib/community/upload-store";

/** The app-wide community upload (lib/community/upload-store.ts). */
export function useCommunityUpload() {
  return useSyncExternalStore(uploadStore.subscribe, uploadStore.getState, uploadStore.getServerState);
}
