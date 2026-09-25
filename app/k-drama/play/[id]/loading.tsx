import { EpisodeWatchSkeleton } from "@/components/skeletons/watch-skeletons";

// K-drama has a single source group, so the player shows no language tabs.
export default function Loading() {
  return <EpisodeWatchSkeleton tabs={false} />;
}
