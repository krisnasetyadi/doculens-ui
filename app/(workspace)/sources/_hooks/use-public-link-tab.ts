import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast, errorToast } from "@/hooks/use-toast";
import { ApiError } from "@/services/api-error";
import { HTTP_URL_MESSAGE } from "@/lib/validations/url";
import { hasIndexingLink } from "../_lib/public-link-index";
import {
  publicLinksMutations,
  publicLinksQueries,
} from "@/services/public-links/handler/public-links.queries";
import type { PublicLinkSource } from "@/services/public-links/type/public-link.type";
import type { SortState } from "../_types/sources.type";
import type { PublicLinkValues } from "../_lib/source-forms";

function sortPublicLinks(links: PublicLinkSource[], sort: SortState) {
  const direction = sort.dir === "asc" ? 1 : -1;
  return [...links].sort((a, b) => {
    if (sort.key === "name") return direction * a.title.localeCompare(b.title);
    return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
  });
}

const INDEXING_POLL_MS = 3000;

export function usePublicLinkTab() {
  const { toast } = useToast();

  // Fetched again every few seconds while a link is being indexed, so its progress moves (MS-907).
  const linksQuery = useQuery({
    ...publicLinksQueries.list(),
    refetchInterval: (query) => (hasIndexingLink(query.state.data) ? INDEXING_POLL_MS : false),
  });
  const createLink = useMutation(publicLinksMutations.create());
  const activateLink = useMutation(publicLinksMutations.activate());
  const syncLink = useMutation(publicLinksMutations.sync());
  const deleteLink = useMutation(publicLinksMutations.delete());

  const [expandedPublicLinks, setExpandedPublicLinks] = useState<string[]>([]);
  const [linkSort, setLinkSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [pdfLinkDialogOpen, setPdfLinkDialogOpen] = useState(false);

  useEffect(() => {
    if (!linksQuery.isError) return;
    toast({ title: "Couldn't load public links", description: "Check your connection and try again.", variant: "destructive" });
  }, [linksQuery.isError, toast]);

  const publicLinks = linksQuery.data ?? [];
  const activePublicLinkIds = new Set(
    publicLinks.filter((link) => link.status === "active").map((link) => link.link_id),
  );

  /** Resolves to a message for the URL field when the server refused the URL, otherwise null
   * (saved and closed, or a toast was shown and the dialog stays open with what was typed). */
  const saveLink = async (values: PublicLinkValues): Promise<string | null> => {
    try {
      await createLink.mutateAsync({ title: values.title || undefined, url: values.url });
      setPdfLinkDialogOpen(false);
      toast({
        title: "Link added",
        description: "Its files are being indexed. It's switched on once it's ready.",
        variant: "success",
      });
      return null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) return HTTP_URL_MESSAGE;
      toast(errorToast("Couldn't save this link source", err));
      return null;
    }
  };

  /** Resolves to false when the delete failed (the toast is shown), so the confirm dialog stays open. */
  const deletePublicLink = async (linkId: string): Promise<boolean> => {
    try {
      await deleteLink.mutateAsync(linkId);
      toast({
        title: "Link deleted",
        description: "It's been removed from your sources.",
        variant: "success",
      });
      return true;
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
      return false;
    }
  };

  const togglePublicLinkActive = (linkId: string, active: boolean) => {
    activateLink.mutate(
      { link_id: linkId, active },
      { onError: (err) => toast(errorToast("Couldn't update this link", err)) },
    );
  };

  const syncPublicLink = (linkId: string) => {
    syncLink.mutate(linkId, {
      onSuccess: ({ result }) =>
        toast(
          result === "up_to_date"
            ? { title: "Already up to date", description: "No files were added, removed or renamed.", variant: "success" }
            : { title: "Syncing", description: "The link changed, so its files are being indexed again.", variant: "success" },
        ),
      onError: (err) => toast(errorToast("Couldn't sync this link", err)),
    });
  };

  const togglePublicLinkExpansion = (linkId: string) => {
    setExpandedPublicLinks((prev) =>
      prev.includes(linkId) ? prev.filter((id) => id !== linkId) : [...prev, linkId],
    );
  };

  return {
    loadingPublicLinks: linksQuery.isLoading,
    linkSources: sortPublicLinks(publicLinks, linkSort),
    activePublicLinkIds,
    expandedPublicLinks,
    linkSort,
    setLinkSort,
    pdfLinkDialogOpen,
    setPdfLinkDialogOpen,
    savingPublicLink: createLink.isPending,
    saveLink,
    deletePublicLink,
    togglePublicLinkActive,
    syncPublicLink,
    syncingLinkId: syncLink.isPending ? syncLink.variables : null,
    togglePublicLinkExpansion,
  };
}
