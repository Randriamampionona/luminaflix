import { Suspense } from "react";
import { ListingBodySkeleton } from "@/components/skeletons/listing-skeletons";
import type { Movie, TMDBResponse } from "@/typing";
import { Await } from "./await";
import { MediaListing } from "./media-listing";
import { InlineSkeleton } from "./skeletons";

type ListingProps = Omit<React.ComponentProps<typeof MediaListing>, "items" | "totalPages">;

/**
 * Listing results behind a *keyed* <Suspense>.
 *
 * BUG FIX (skeletons): pagination, filters and sort only change the query
 * string, so the route segment stays the same and `loading.tsx` never shows —
 * the old grid just froze until the new one was ready. A new `streamKey`
 * (derived from the search params) remounts the boundary, so the grid
 * skeleton appears immediately while the header and filters stay in place.
 */
export function StreamedListing({
  data,
  streamKey,
  transform,
  ...listing
}: ListingProps & {
  data: Promise<TMDBResponse>;
  streamKey: string;
  /** Optional per-item mapping (e.g. add the original title). */
  transform?: (item: Movie) => Movie;
}) {
  return (
    <Suspense key={streamKey} fallback={<ListingBodySkeleton />}>
      <Await promise={data}>
        {(result) => (
          <MediaListing
            {...listing}
            items={transform ? result.results.map(transform) : result.results}
            totalPages={result.total_pages}
          />
        )}
      </Await>
    </Suspense>
  );
}

/** A value derived from the same promise (e.g. "1,234 movies") in the header. */
export function StreamedText<T>({
  data,
  streamKey,
  children,
}: {
  data: Promise<T>;
  streamKey: string;
  children: (value: T) => React.ReactNode;
}) {
  return (
    <Suspense key={streamKey} fallback={<InlineSkeleton className="w-32" />}>
      <Await promise={data}>{children}</Await>
    </Suspense>
  );
}
