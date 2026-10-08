import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  publicLinksMutations,
  publicLinksQueries,
} from "@/services/public-links/handler/public-links.queries";
import type { PublicLinkSource } from "@/services/public-links/type/public-link.type";
import type { SortState } from "../_types/sources.type";

function sortPublicLinks(links: PublicLinkSource[], sort: SortState) {
  const direction = sort.dir === "asc" ? 1 : -1;
  return [...links].sort((a, b) => {
    if (sort.key === "name") return direction * a.title.localeCompare(b.title);
    return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
  });
}

export function usePublicLinkTab() {
  const { toast } = useToast();

  const linksQuery = useQuery(publicLinksQueries.list());
  const createLink = useMutation(publicLinksMutations.create());
  const activateLink = useMutation(publicLinksMutations.activate());
  const deleteLink = useMutation(publicLinksMutations.delete());

  const [expandedPublicLinks, setExpandedPublicLinks] = useState<string[]>([]);
  const [linkSort, setLinkSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [pdfLinkDialogOpen, setPdfLinkDialogOpen] = useState(false);
  const [pdfSourceUrl, setPdfSourceUrl] = useState("");
  const [pdfSourceTitle, setPdfSourceTitle] = useState("");
  const [pdfLinkError, setPdfLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!linksQuery.isError) return;
    toast({ title: "Error", description: "Failed to load public links", variant: "destructive" });
  }, [linksQuery.isError, toast]);

  const publicLinks = linksQuery.data ?? [];
  const activePublicLinkIds = new Set(
    publicLinks.filter((link) => link.status === "active").map((link) => link.link_id),
  );

  const handleConnectLinkOnly = async () => {
    const trimmedUrl = pdfSourceUrl.trim();
    if (!trimmedUrl) {
      setPdfLinkError("Please paste a link first");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setPdfLinkError("Please enter a valid URL");
      return;
    }

    setPdfLinkError(null);
    try {
      await createLink.mutateAsync({ title: pdfSourceTitle.trim() || undefined, url: trimmedUrl });
      setPdfLinkDialogOpen(false);
      setPdfSourceUrl("");
      setPdfSourceTitle("");
      toast({
        title: "Link source saved",
        description: "Public link saved to database.",
        variant: "success",
      });
    } catch {
      setPdfLinkError("Could not save this link source. Please try again.");
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
      { onError: () => toast({ title: "Failed to update active status", variant: "destructive" }) },
    );
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
    pdfSourceUrl,
    setPdfSourceUrl,
    pdfSourceTitle,
    setPdfSourceTitle,
    pdfLinkError,
    setPdfLinkError,
    savingPublicLink: createLink.isPending,
    handleConnectLinkOnly,
    deletePublicLink,
    togglePublicLinkActive,
    togglePublicLinkExpansion,
  };
}
