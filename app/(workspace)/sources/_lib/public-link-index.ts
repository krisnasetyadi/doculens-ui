import type { PublicLinkSource } from "@/services/public-links/type/public-link.type";

export type IndexBadgeTone = "info" | "success" | "destructive" | "secondary";

/** What a link's index badge says (MS-907). A link is searchable once it has an index; a rebuild
 * that is running or failed keeps the previous one in use, so it still reads as usable. */
export function publicLinkIndexBadge(
  link: Pick<PublicLinkSource, "index_status" | "index_progress" | "index_ready">,
): { label: string; tone: IndexBadgeTone } {
  switch (link.index_status) {
    case "queued":
      return { label: "Queued", tone: "info" };
    case "indexing":
      return {
        label: link.index_progress ? `Indexing ${link.index_progress}%` : "Indexing",
        tone: "info",
      };
    case "failed":
      return { label: link.index_ready ? "Sync failed" : "Failed", tone: "destructive" };
    case "ready":
      return { label: "Ready", tone: "success" };
    default:
      return { label: "Waiting to index", tone: "secondary" };
  }
}

const IN_PROGRESS = new Set(["pending", "queued", "indexing"]);

/** Whether a list still has a link waiting for or being indexed, so it is fetched again until none is.
 * A build that stopped reporting won't move by itself, so it doesn't keep the list polling. */
export function hasIndexingLink(
  links: Pick<PublicLinkSource, "index_status" | "index_stale">[] | undefined,
): boolean {
  return (links ?? []).some((link) => IN_PROGRESS.has(link.index_status) && !link.index_stale);
}

/** Sync waits while a build is queued or running, except one that stopped reporting: Sync restarts it. */
export function canSyncPublicLink(link: Pick<PublicLinkSource, "index_status" | "index_stale">): boolean {
  return !(link.index_status === "queued" || link.index_status === "indexing") || link.index_stale;
}
