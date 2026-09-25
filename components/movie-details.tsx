"use client";

import { Slot } from "@radix-ui/react-slot";
import type { MediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import { useMediaDetails } from "./media/media-details-provider";

/**
 * Wraps any clickable element (hero "More info", featured banner…) so it
 * opens the shared details dialog. API unchanged from the previous version.
 */
export default function MovieDetails({
  movie,
  children,
  type = "movie",
}: {
  movie: Movie;
  children: React.ReactElement;
  type?: MediaKind;
}) {
  const openDetails = useMediaDetails();
  return <Slot onClick={() => openDetails(movie, type)}>{children}</Slot>;
}
