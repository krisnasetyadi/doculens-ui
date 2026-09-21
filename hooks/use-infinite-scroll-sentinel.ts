import { useEffect, useRef } from "react";

/** Attach the returned ref to a sentinel element after the last loaded row —
 * once it scrolls into view, onLoadMore fires. Shared by every "loads
 * automatically while scrolling" table in the sources panel. */
export function useInfiniteScrollSentinel(
  hasMore: boolean,
  onLoadMore: () => void,
  loadedCount: number,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      // Observe the table's scroll viewport, not the page behind the modal.
      { root: node.parentElement, rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // Recheck after rows are appended, but not on loading/error rerenders.
  }, [hasMore, loadedCount]);

  return sentinelRef;
}
