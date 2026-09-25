/**
 * Renders `children(value)` once `promise` resolves. Put it inside a
 * <Suspense> so the fallback streams immediately while the data loads:
 *
 *   <Suspense fallback={<GridSkeleton />}>
 *     <Await promise={data}>{(d) => <Results data={d} />}</Await>
 *   </Suspense>
 *
 * The same promise can feed several boundaries (e.g. a count in the header
 * and the grid below) without fetching twice.
 */
export async function Await<T>({
  promise,
  children,
}: {
  promise: Promise<T>;
  children: (value: T) => React.ReactNode | Promise<React.ReactNode>;
}) {
  return children(await promise);
}
