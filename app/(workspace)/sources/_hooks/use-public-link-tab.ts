import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useToast } from "@/hooks/use-toast";
import { publicLinksApi } from "@/services/public-links/handler/public-links.api";
import type { PublicLinkSource } from "@/services/public-links/type/public-link.type";
import type { SortState } from "../_types/sources.type";

export function usePublicLinkTab() {
  const { toast } = useToast();

  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false);
  const [publicLinks, setPublicLinks] = useState<PublicLinkSource[]>([]);
  const [activePublicLinkIds, setActivePublicLinkIds] = useState<Set<string>>(new Set());
  const [expandedPublicLinks, setExpandedPublicLinks] = useState<string[]>([]);
  const [linkSort, setLinkSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [pdfLinkDialogOpen, setPdfLinkDialogOpen] = useState(false);
  const [pdfSourceUrl, setPdfSourceUrl] = useState("");
  const [pdfSourceTitle, setPdfSourceTitle] = useState("");
  const [pdfLinkError, setPdfLinkError] = useState<string | null>(null);
  const [savingPublicLink, setSavingPublicLink] = useState(false);

  const fetchPublicLinks = () => {
    setLoadingPublicLinks(true);
    publicLinksApi.list()
      .then((links) => {
        setPublicLinks(links);
        const activeIds = links
          .filter((link) => link.status === "active")
          .map((link) => link.link_id);
        setActivePublicLinkIds(new Set(activeIds));
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load public links",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingPublicLinks(false));
  };

  useEffect(() => {
    fetchPublicLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    setSavingPublicLink(true);
    setPdfLinkError(null);

    try {
      await publicLinksApi.create({
        title: pdfSourceTitle.trim() || undefined,
        url: trimmedUrl,
      });

      await fetchPublicLinks();

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
    } finally {
      setSavingPublicLink(false);
    }
  };

  const deletePublicLink = async (linkId: string) => {
    try {
      await publicLinksApi.delete(linkId);
      await fetchPublicLinks();
      toast({
        title: "Link deleted",
        description: "It's been removed from your sources.",
        variant: "success",
      });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const togglePublicLinkActive = async (linkId: string, active: boolean) => {
    publicLinksApi.activate({ link_id: linkId, active })
      .then(() => {
        setActivePublicLinkIds((prev) => {
          const next = new Set(prev);
          if (active) {
            next.add(linkId);
          } else {
            next.delete(linkId);
          }
          return next;
        });
        setPublicLinks((prev) =>
          prev.map((link) =>
            link.link_id === linkId
              ? { ...link, status: active ? "active" : "inactive" }
              : link,
          ),
        );
      })
      .catch(() => {
        toast({ title: "Failed to update active status", variant: "destructive" });
      });
  };

  const togglePublicLinkExpansion = (linkId: string) => {
    setExpandedPublicLinks((prev) =>
      prev.includes(linkId)
        ? prev.filter((id) => id !== linkId)
        : [...prev, linkId],
    );
  };

  const sortPublicLinks = (
    links: PublicLinkSource[],
    sort: SortState,
  ) => {
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...links].sort((a, b) => {
      if (sort.key === "name") {
        return direction * a.title.localeCompare(b.title);
      }
      return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
    });
  };

  const linkSources = sortPublicLinks(publicLinks, linkSort);

  return {
    loadingPublicLinks,
    linkSources,
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
    savingPublicLink,
    handleConnectLinkOnly,
    deletePublicLink,
    togglePublicLinkActive,
    togglePublicLinkExpansion,
  };
}
