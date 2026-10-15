/** Tiny connectivity check used by the offline screen ("Try again"). Never cached. */
export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
export const HEAD = GET;
