"use client";

// Skill 1 (Compliance Gap Check) UI. Generic by design: reference/target
// collections and framework_name are all user-picked, nothing here is
// ISO-specific. Skill 2 (scenario_regulatory_impact) is not offered: it's
// scaffold-only on the backend and not validated for real decisions yet.
//
// Look: shares the Settings dialog's tokens (workspace/settings-ui) so both
// surfaces read as one product: card-tone pane, 14px bordered cards, one action
// blue, #182033 headings over #56627a captions, 8px radius. Sizes stay on the
// drawer's own compact scale (px): title 18 / section title 13 / control + body
// 12 / helper + meta 11 / micro 10; controls 32 tall (28 for secondary actions).

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { pdfCollectionsApi } from "@/services/pdf-collections/handler/pdf-collections.api";
import type { PdfCollection } from "@/services/pdf-collections/type/pdf-collection.type";
import { GapAnalysisApi } from "@/services/resources/gap-analysis-api";
import type { GapAnalysisRequest, GapAnalysisResponse, GapAnalysisRun } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getFileTypeLabel } from "@/lib/file-type";
import { sourceFoldersQueries } from "@/services/source-folders/handler/source-folders.queries";
import {
  BUTTON_SM_CLASS,
  CAPTION_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  Notice,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SECTION_TITLE_CLASS,
} from "@/components/workspace/settings-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/fields/searchable-select";
import { DANGER_ICON_BUTTON_CLASS } from "@/lib/danger-styles";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleCheck,
  FilePlus2,
  FileSearch,
  FileText,
  History,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

const REDIRECT_COUNTDOWN_SECONDS = 3;

/** Soft tint per file type, same hues the Sources page uses for its type icons. */
const TYPE_TONE: Record<string, string> = {
  PDF: "bg-[#fbeeee] text-[#bd4f52] dark:bg-red-950/40 dark:text-red-400",
  DOC: "bg-accent text-primary-pressed dark:bg-blue-950/40 dark:text-blue-400",
  DOCX: "bg-accent text-primary-pressed dark:bg-blue-950/40 dark:text-blue-400",
  CSV: "bg-[#e9f4ee] text-[#3f8a6b] dark:bg-emerald-950/40 dark:text-emerald-400",
  XLSX: "bg-[#e9f4ee] text-[#3f8a6b] dark:bg-emerald-950/40 dark:text-emerald-400",
  TXT: "bg-[#efebfb] text-[#6a52c0] dark:bg-violet-950/40 dark:text-violet-400",
};
const DEFAULT_TONE = "bg-muted text-muted-foreground";

/** Input and Textarea ship `text-base md:text-sm`, which beats a plain
 * `text-xs` on desktop, so the md: size has to be set as well. */
// The drawer is sized at 98% of the stock scale (what 110% browser zoom gave
// the old 89.1%): Tailwind's spacing and type variables are scaled here
// instead of using CSS zoom, so the drawer lays out at real pixels. Literal px values in this file are written pre-scaled (x0.98).
// The select list is portaled out of the drawer, so it carries the same class.
// The [&_.border*] variants scale the literal 1px borders the way zoom did, so
// the browser snaps them to device pixels identically; the sheet's own and the
// popover's own border are set where each is rendered.
// Appended `leading-*` below: tailwind-merge drops an earlier leading class
// when a later text-size class is merged in.
const DRAWER_SCALE_CLASS =
  "text-base [--spacing:0.245025rem] [--text-xs:0.735075rem] [--text-sm:0.8575875rem] [--text-base:0.9801rem] [--text-lg:1.1026125rem] [--radius:0.49005rem] [&_.border]:border-[0.9801px] [&_.border-t]:border-t-[0.9801px] [&_.border-b]:border-b-[0.9801px] [&_.border-l]:border-l-[0.9801px] [&_.border-r]:border-r-[0.9801px] [&_.border-0]:border-0!";

// Settings' tokens whose px sizes are literals, pre-scaled for this drawer.
const SECTION_TITLE = cn(SECTION_TITLE_CLASS, "text-xs");
const CAPTION = cn(CAPTION_CLASS, "text-[10.7811px] leading-4");
const LABEL = cn(LABEL_CLASS, "text-[10.7811px]");
// Written out, not cn()-merged: tailwind-merge reads font-['Manrope'] as a
// weight and drops it when font-bold follows.
const BADGE_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-md px-[6.8607px] py-1 font-['Manrope'] text-[9.801px] font-bold uppercase leading-none tracking-[0.06em]";
const BADGE = {
  blue: `${BADGE_BASE} bg-accent text-primary-hover dark:bg-primary/15 dark:text-primary`,
  neutral: `${BADGE_BASE} bg-[#eef1f6] text-muted-foreground dark:bg-muted`,
};

const FIELD_CLASS = cn(INPUT_CLASS, "h-9 px-[10.7811px]");
/** Settings' button looks, one step taller than the row buttons. */
const ACTION_SECONDARY_CLASS = cn(SECONDARY_BUTTON_CLASS, "h-9 px-3.5");
const ACTION_PRIMARY_CLASS = cn(PRIMARY_BUTTON_CLASS, "h-9 px-3.5");

/** One numbered section of the form: the step number sits in its own column,
 * and title, helper line, optional right-hand control and the content all
 * line up in the column beside it. Sections are split by an inset hairline
 * (`divider`), not boxed. */
function Section({
  number,
  title,
  description,
  aside,
  divider,
  className,
  children,
}: {
  number: number;
  title: ReactNode;
  description: string;
  aside?: ReactNode;
  divider?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex min-h-0 shrink-0 gap-3.5 py-3.5", divider && "border-t border-border", className)}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-['Manrope'] text-[11.7612px] font-bold text-primary-foreground">
        {number}
      </span>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn(SECTION_TITLE, "leading-5")}>{title}</h3>
            <p className={CAPTION}>{description}</p>
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Collapsed-by-default "add from PDF URL" affordance, used for both the
 * reference and the company documents. Downloads whatever the pasted URL(s)
 * point to and merges them into ONE new PDF collection (upload-from-urls),
 * which then behaves exactly like any other uploaded collection. Links must
 * point directly at a PDF file, not an arbitrary webpage. */
function AddFromLinkPanel({
  open,
  value,
  onValueChange,
  onToggleOpen,
  onSubmit,
  onCancel,
  loading,
  multiline,
  disabled = false,
}: {
  open: boolean;
  value: string;
  onValueChange: (v: string) => void;
  onToggleOpen: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  multiline: boolean;
  /** Locks the whole panel (toggle, inputs, and both buttons) separately
   * from `loading`, which only covers this panel's own link-upload request,
   * e.g. while a gap analysis run is in flight and no field should move. */
  disabled?: boolean;
}) {
  if (!open) {
    return (
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onToggleOpen}
        disabled={disabled}
        className="h-auto gap-1.5 self-start p-0 text-[10.7811px] font-bold text-primary hover:text-primary-hover"
      >
        <FilePlus2 className="size-3" />
        Add from PDF URL
      </Button>
    );
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-xs">
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={"https://example.com/document-1.pdf\nhttps://example.com/document-2.pdf"}
          className="min-h-16 rounded-lg border-border bg-card px-[10.7811px] text-xs shadow-xs md:text-xs placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-primary/10"
          disabled={loading || disabled}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="https://example.com/document.pdf"
          className={FIELD_CLASS}
          disabled={loading || disabled}
        />
      )}
      <p className={CAPTION}>
        The link must point directly to a PDF file
        {multiline ? ". One link per line, all merged into one new collection" : ""}.
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" className={cn(PRIMARY_BUTTON_CLASS, BUTTON_SM_CLASS)} onClick={onSubmit} disabled={loading || disabled || !value.trim()}>
          {loading && <Spinner className="size-3.5" />}
          Add
        </Button>
        <Button type="button" size="sm" variant="outline" className={cn(SECONDARY_BUTTON_CLASS, BUTTON_SM_CLASS)} onClick={onCancel} disabled={loading || disabled}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface GapAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GapAnalysisDialog({ open, onOpenChange }: GapAnalysisDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [pdfCollections, setPdfCollections] = useState<PdfCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  // Set once a fetch has settled. The fetch effects run after the first paint, so `loading` alone
  // is still false on the first frame and the empty state would flash before the skeleton.
  const [collectionsFetched, setCollectionsFetched] = useState(false);
  const [referenceId, setReferenceId] = useState<string>("");
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set());
  const [frameworkName, setFrameworkName] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GapAnalysisResponse | null>(null);

  const [refLinkOpen, setRefLinkOpen] = useState(false);
  const [refLinkValue, setRefLinkValue] = useState("");
  const [addingRefLink, setAddingRefLink] = useState(false);
  const [targetLinkOpen, setTargetLinkOpen] = useState(false);
  const [targetLinkValue, setTargetLinkValue] = useState("");
  const [addingTargetLink, setAddingTargetLink] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRuns, setHistoryRuns] = useState<GapAnalysisRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [deletingRunIds, setDeletingRunIds] = useState<Set<string>>(new Set());

  // Auto-redirect-after-success state is kept in a ref (not React state)
  // since the countdown ticks via setInterval and only ever needs to
  // mutate a toast that's already been dispatched, not trigger a render.
  const pendingRedirectRef = useRef<{ timer: ReturnType<typeof setInterval>; dismiss: () => void } | null>(null);

  const clearPendingRedirect = () => {
    if (pendingRedirectRef.current) {
      clearInterval(pendingRedirectRef.current.timer);
      pendingRedirectRef.current.dismiss();
      pendingRedirectRef.current = null;
    }
  };

  useEffect(() => () => clearPendingRedirect(), []);

  useEffect(() => {
    if (!open) return;
    setCollectionsLoading(true);
    pdfCollectionsApi.list()
      .then(setPdfCollections)
      .catch(() =>
        toast({
          title: "Gagal memuat collection",
          description: "Coba tutup dan buka dialog ini lagi.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        setCollectionsLoading(false);
        setCollectionsFetched(true);
      });
  }, [open, toast]);

  // Folder names for the Folder column. Cosmetic, so a failure just leaves the
  // lookup empty (rows then read "Folder" instead of a name) and shows no toast.
  const { data: folders = [] } = useQuery({ ...sourceFoldersQueries.list(), enabled: open });

  useEffect(() => {
    if (!open || !historyOpen) return;
    setHistoryLoading(true);
    GapAnalysisApi.listRuns<GapAnalysisRun[]>()
      .then((data) => setHistoryRuns(Array.isArray(data) ? data : []))
      .catch(() =>
        toast({
          title: "Gagal memuat riwayat",
          description: "Coba tutup dan buka riwayat lagi.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        setHistoryLoading(false);
        setHistoryFetched(true);
      });
  }, [open, historyOpen, toast]);

  /** History rows (and a finished run's auto-redirect countdown) open
   * straight into the dedicated results page: it has the width a
   * data-dense table needs, which this drawer doesn't. */
  const handleViewRun = (runId: string) => {
    clearPendingRedirect();
    handleClose(false);
    router.push(`/compliance/${runId}`);
  };

  const handleDeleteRun = (e: MouseEvent, run: GapAnalysisRun) => {
    e.stopPropagation();
    setHistoryRuns((prev) => prev.filter((r) => r.run_id !== run.run_id));
    setDeletingRunIds((prev) => new Set(prev).add(run.run_id));
    GapAnalysisApi.deleteRun(run.run_id)
      .catch(() => {
        setHistoryRuns((prev) =>
          prev.some((r) => r.run_id === run.run_id)
            ? prev
            : [...prev, run].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              ),
        );
        toast({
          title: "Gagal menghapus riwayat",
          description: `"${run.framework_name}" masih ada. Coba lagi.`,
          variant: "destructive",
        });
      })
      .finally(() =>
        setDeletingRunIds((prev) => {
          const next = new Set(prev);
          next.delete(run.run_id);
          return next;
        }),
      );
  };

  // Skeletons are for the first load only: reopening the dialog or the history refreshes in the
  // background with the list already on screen, and that list stays.
  const collectionsSkeleton = pdfCollections.length === 0 && (collectionsLoading || !collectionsFetched);
  const historySkeleton = historyRuns.length === 0 && (historyLoading || !historyFetched);
  const filteredHistoryRuns = historyRuns.filter((run) =>
    run.framework_name.toLowerCase().includes(historySearch.trim().toLowerCase()),
  );

  /** "Parent / Child" for a nested folder, "All Files" for the root. */
  const folderLabel = (folderId?: string) => {
    if (!folderId) return "All Files";
    const byId = new Map(folders.map((f) => [f.folder_id, f]));
    const names: string[] = [];
    for (let f = byId.get(folderId); f && names.length < 8; f = f.parent_folder_id ? byId.get(f.parent_folder_id) : undefined) {
      names.unshift(f.name);
    }
    return names.length ? names.join(" / ") : "Folder";
  };

  const collectionLabel = (c: PdfCollection) => c.title || c.file_names?.[0] || c.collection_id;

  const toggleTarget = (id: string) => {
    setTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Choosing a reference also drops it from the targets: a collection can't
   * be compared against itself, and its row is locked in the table below. */
  const selectReference = (id: string) => {
    setReferenceId(id);
    if (!id) return;
    setTargetIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectableIds = pdfCollections.map((c) => c.collection_id).filter((id) => id !== referenceId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => targetIds.has(id));
  const toggleAll = () => setTargetIds(allSelected ? new Set() : new Set(selectableIds));

  /** Pasted URL(s) become one new PDF collection (upload-from-urls merges them
   * into a single collection_id), which then behaves like any uploaded
   * collection, so no separate "link" code path is needed anywhere else.
   * Newline-only splitting: the single-line reference Input can't contain a
   * newline, so it always yields exactly one URL; only the multiline target
   * Textarea (one link per line, per its own helper text) can yield several. */
  const addCollectionFromUrls = (raw: string, mode: "reference" | "target") => {
    const urls = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    const setLoading = mode === "reference" ? setAddingRefLink : setAddingTargetLink;
    setLoading(true);
    pdfCollectionsApi.uploadFromUrls({ urls })
      .then((res) => {
        const newCollection: PdfCollection = {
          collection_id: res.collection_id,
          document_count: res.file_count,
          created_at: new Date().toISOString(),
          file_names: res.file_names || [],
          title: res.title,
        };
        setPdfCollections((prev) => [newCollection, ...prev]);
        if (mode === "reference") {
          selectReference(res.collection_id);
          setRefLinkOpen(false);
          setRefLinkValue("");
        } else {
          setTargetIds((prev) => new Set(prev).add(res.collection_id));
          setTargetLinkOpen(false);
          setTargetLinkValue("");
        }
        toast({
          title: "Link ditambahkan",
          description: `${res.file_count} dokumen dari link digabung jadi 1 collection baru.`,
          variant: "success",
        });
      })
      .catch((err) =>
        toast({
          title: "Gagal menambah dari link",
          description:
            err instanceof Error ? err.message : "Pastikan link mengarah langsung ke file PDF yang bisa diakses publik.",
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  };

  const canSubmit = !!referenceId && targetIds.size > 0 && !!frameworkName.trim() && !running;

  const handleRun = () => {
    if (!canSubmit) return;
    setRunning(true);
    setResult(null);
    const body: GapAnalysisRequest = {
      skill_id: "compliance_gap_check",
      reference_collection_ids: [referenceId],
      framework_name: frameworkName.trim(),
      target_collection_ids: Array.from(targetIds),
    };
    GapAnalysisApi.run<GapAnalysisResponse>(body as unknown as Record<string, unknown>)
      .then((data) => {
        setResult(data);
        clearPendingRedirect();
        const runId = data.run.run_id;
        let secondsLeft = REDIRECT_COUNTDOWN_SECONDS;
        const t = toast({
          title: "Analisis selesai",
          description: `Mengalihkan ke hasil lengkap dalam ${secondsLeft} detik…`,
          variant: "success",
        });
        const timer = setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft <= 0) {
            handleViewRun(runId);
            return;
          }
          t.update({
            id: t.id,
            title: "Analisis selesai",
            description: `Mengalihkan ke hasil lengkap dalam ${secondsLeft} detik…`,
            variant: "success",
          });
        }, 1000);
        pendingRedirectRef.current = { timer, dismiss: t.dismiss };
      })
      .catch((err) =>
        toast({
          title: "Gap analysis gagal",
          description: err instanceof Error ? err.message : "Coba lagi.",
          variant: "destructive",
        }),
      )
      .finally(() => setRunning(false));
  };

  const handleClose = (next: boolean) => {
    // Closing while a run is in flight only hides the drawer: the request
    // keeps going, and reopening shows the same running state instead of a
    // blank form. Its own success/error toast still fires
    // wherever the user is. Nothing running: close and reset as before.
    if (!next && running) {
      onOpenChange(false);
      return;
    }
    if (!next) {
      clearPendingRedirect();
      setResult(null);
      setReferenceId("");
      setTargetIds(new Set());
      setFrameworkName("");
      setRefLinkOpen(false);
      setRefLinkValue("");
      setTargetLinkOpen(false);
      setTargetLinkValue("");
      setHistoryOpen(false);
      setHistorySearch("");
    }
    onOpenChange(next);
  };

  const showForm = !historyOpen && !result && !running;
  const selectedCount = targetIds.size;
  const hasFooter = showForm || (!!result && !running && !historyOpen);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className={cn("flex w-full flex-col gap-0 border-border bg-card p-0 font-['Inter'] shadow-[0_24px_70px_rgba(24,32,51,0.15)] sm:max-w-[752.7168px] border-l-[0.9801px] dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)] [&>button:last-child]:right-5 sm:[&>button:last-child]:right-9 [&>button:last-child]:top-6 [&>button:last-child]:p-1 [&>button:last-child]:text-foreground [&>button:last-child]:opacity-80 [&>button:last-child:hover]:opacity-100", DRAWER_SCALE_CLASS)}
      >
        {/* Title block left, History right, plain close button at the far right
            (sm:pr-[76.23px] keeps History clear of it); an inset hairline closes
            the header instead of a full-bleed border. */}
        <SheetHeader className="gap-0 bg-card px-5 pb-4 pt-6 pr-14 sm:px-9 sm:pr-[76.23px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <SheetTitle className="font-['Manrope'] text-base font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                  Compliance Gap Check
                </SheetTitle>
              </div>
              <SheetDescription className="mt-1 text-[11.7612px] leading-4 text-muted-foreground">
                Compare company documents against a selected compliance framework.
              </SheetDescription>
            </div>
            {!running && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryOpen((prev) => !prev)}
                className={cn(SECONDARY_BUTTON_CLASS, BUTTON_SM_CLASS, "shrink-0")}
              >
                {historyOpen ? <ArrowLeft className="size-3.5" /> : <History className="size-3.5" />}
                {historyOpen ? "Back" : "History"}
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="mx-5 shrink-0 border-t border-border sm:mx-9" />

        {showForm && (
          <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 sm:px-9">
            <Section
              number={1}
              title="Reference framework"
              description="Select a standard or framework to compare against."
            >
              <SearchableSelect
                size="sm"
                contentClassName={cn(DRAWER_SCALE_CLASS, "border-[0.9801px]")}
                items={pdfCollections.map((c) => ({
                  value: c.collection_id,
                  label: collectionLabel(c),
                }))}
                value={referenceId}
                onValueChange={(v) => selectReference(v ?? "")}
                disabled={collectionsLoading}
                icon={<ShieldCheck className="size-3.5 text-muted-foreground" />}
                className="h-10 rounded-lg border-border bg-card text-xs shadow-xs hover:border-foreground/20 hover:bg-card"
                placeholder={collectionsLoading ? "Loading collections…" : "Select a framework"}
                searchPlaceholder="Search collections…"
                emptyMessage="No matching collection."
              />
              <AddFromLinkPanel
                open={refLinkOpen}
                value={refLinkValue}
                onValueChange={setRefLinkValue}
                onToggleOpen={() => setRefLinkOpen(true)}
                onSubmit={() => addCollectionFromUrls(refLinkValue, "reference")}
                onCancel={() => {
                  setRefLinkOpen(false);
                  setRefLinkValue("");
                }}
                loading={addingRefLink}
                multiline={false}
              />
            </Section>

            <Section
              number={2}
              divider
              title="Company documents"
              description="Select the documents you want to include in the analysis."
              aside={
                <span className={BADGE.blue}>{selectedCount} selected</span>
              }
            >
              {collectionsSkeleton ? (
                <div role="status" className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <span className="sr-only">Loading documents…</span>
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-7 w-full" aria-hidden="true" />
                  ))}
                </div>
              ) : pdfCollections.length === 0 ? (
                <Empty className="border border-dashed p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="size-8 [&_svg:not([class*='size-'])]:size-4">
                      <FileText />
                    </EmptyMedia>
                    <EmptyTitle className="text-[12.7413px]">No documents yet</EmptyTitle>
                    <EmptyDescription className="text-[10.7811px]">
                      Upload files on the Sources page, or add one from a PDF URL below.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="custom-scrollbar max-h-64 overflow-y-auto rounded-xl border border-border bg-card">
                  <table data-slot="table" className="w-full caption-bottom text-xs">
                    <TableHeader className="sticky top-0 z-10 bg-[#f1f4fa] dark:bg-muted/60 shadow-[inset_0_-0.9801px_0_var(--border)] [&_tr]:border-b-0!">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-7 w-10 pl-3">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAll}
                            disabled={selectableIds.length === 0}
                            aria-label="Select all documents"
                            className="size-3.5 [&_svg]:size-3"
                          />
                        </TableHead>
                        <TableHead className="h-7 text-[9.801px] font-semibold text-foreground/70">Document</TableHead>
                        <TableHead className="hidden h-7 w-32 text-[9.801px] font-semibold text-foreground/70 sm:table-cell">
                          Folder
                        </TableHead>
                        <TableHead className="hidden h-7 w-28 pr-4 text-right text-[9.801px] font-semibold text-foreground/70 sm:table-cell">
                          Added
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pdfCollections.map((c) => {
                        const id = c.collection_id;
                        const label = collectionLabel(c);
                        const type = getFileTypeLabel(c.file_names?.[0]) ?? "FILE";
                        const isReference = id === referenceId;
                        const checked = targetIds.has(id);
                        return (
                          <TableRow
                            key={id}
                            data-state={checked ? "selected" : undefined}
                            onClick={() => !isReference && toggleTarget(id)}
                            className={cn(
                              "transition-colors hover:bg-accent/40 data-[state=selected]:bg-accent",
                              isReference ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                            )}
                          >
                            <TableCell className="w-10 py-1.5 pl-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleTarget(id)}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isReference}
                                aria-label={`Select ${label}`}
                                className="size-3.5 [&_svg]:size-3"
                              />
                            </TableCell>
                            <TableCell className="max-w-0 py-1.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "w-10 justify-center rounded-md border-0 px-0 py-0.5 font-['Manrope'] text-[9.801px] font-bold tracking-[0.06em]",
                                    TYPE_TONE[type] ?? DEFAULT_TONE,
                                  )}
                                >
                                  {type}
                                </Badge>
                                <span className="truncate text-xs" title={label}>
                                  {label}
                                </span>
                                {isReference && (
                                  <span className={BADGE.neutral}>Reference</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden max-w-0 w-32 py-1.5 text-[10.7811px] text-muted-foreground sm:table-cell">
                              <span className="block truncate" title={folderLabel(c.folder_id)}>
                                {folderLabel(c.folder_id)}
                              </span>
                            </TableCell>
                            <TableCell className="hidden py-1.5 pr-4 text-right text-[10.7811px] text-muted-foreground sm:table-cell">
                              {dayjs(c.created_at).format("D MMM YYYY")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </table>
                </div>
              )}
              <AddFromLinkPanel
                open={targetLinkOpen}
                value={targetLinkValue}
                onValueChange={setTargetLinkValue}
                onToggleOpen={() => setTargetLinkOpen(true)}
                onSubmit={() => addCollectionFromUrls(targetLinkValue, "target")}
                onCancel={() => {
                  setTargetLinkOpen(false);
                  setTargetLinkValue("");
                }}
                loading={addingTargetLink}
                multiline
              />
            </Section>

            <Section
              number={3}
              divider
              title={
                <>
                  Framework name <span className={cn(LABEL, "font-normal")}>(free label)</span>
                </>
              }
              description="A label to identify this analysis in your history."
            >
              <Input
                id="gap-framework-name"
                aria-label="Framework name"
                value={frameworkName}
                onChange={(e) => setFrameworkName(e.target.value)}
                placeholder='e.g. "ISO 27001", "ISO 9001", or any internal SOP'
                className={FIELD_CLASS}
              />
            </Section>

            <Notice tone="info" className="mb-5 shrink-0 gap-1.5 px-2.5 py-2 text-[10.7811px] leading-4 [&_svg]:size-3">
              Additional analysis types (e.g. Scenario/Regulatory Impact) will be available in future updates.
            </Notice>
          </div>
        )}

        {!showForm && (
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 py-5 sm:px-9">
              {historyOpen && (
                <div className="space-y-2">
                  {historyRuns.length > 0 && (
                    <InputGroup className="h-8">
                      <InputGroupAddon>
                        <Search className="size-3.5" />
                      </InputGroupAddon>
                      <InputGroupInput
                        className="text-xs md:text-xs"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder="Search history by framework name"
                      />
                    </InputGroup>
                  )}

                  {historySkeleton && (
                    <div role="status" className="space-y-2">
                      <span className="sr-only">Loading history…</span>
                      {Array.from({ length: 3 }, (_, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
                          aria-hidden="true"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-2/3" />
                            <Skeleton className="h-3 w-4/5" />
                          </div>
                          <Skeleton className="size-5 rounded-full" />
                        </div>
                      ))}
                    </div>
                  )}

                  {!historySkeleton && historyRuns.length === 0 && (
                    <Empty className="border border-dashed p-6">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="size-8 [&_svg:not([class*='size-'])]:size-4">
                          <History />
                        </EmptyMedia>
                        <EmptyTitle className="text-[12.7413px]">No history yet</EmptyTitle>
                        <EmptyDescription className="text-[10.7811px]">
                          Gap analysis runs you complete will show up here.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}

                  {!historySkeleton && historyRuns.length > 0 && filteredHistoryRuns.length === 0 && (
                    <Empty className="border border-dashed p-6">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="size-8 [&_svg:not([class*='size-'])]:size-4">
                          <Search />
                        </EmptyMedia>
                        <EmptyTitle className="text-[12.7413px]">No matches</EmptyTitle>
                        <EmptyDescription className="text-[10.7811px]">
                          Nothing in history matches &quot;{historySearch}&quot;.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}

                  {!historySkeleton &&
                    filteredHistoryRuns.map((run) => {
                      const deleting = deletingRunIds.has(run.run_id);
                      return (
                        <Item
                          key={run.run_id}
                          variant="outline"
                          size="sm"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleViewRun(run.run_id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleViewRun(run.run_id);
                          }}
                          className={cn(
                            "cursor-pointer bg-card hover:bg-accent/50",
                            deleting && "pointer-events-none opacity-60",
                          )}
                        >
                          <ItemContent>
                            <ItemTitle className="text-xs">{run.framework_name}</ItemTitle>
                            <ItemDescription className="text-[10.7811px]">
                              {run.status} · {dayjs(run.created_at).format("D MMM YYYY, HH:mm")}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => handleDeleteRun(e, run)}
                              disabled={deleting}
                              title="Delete from history"
                              aria-label="Delete from history"
                              className={`size-7 ${DANGER_ICON_BUTTON_CLASS}`}
                            >
                              {deleting ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
                            </Button>
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          </ItemActions>
                        </Item>
                      );
                    })}
                </div>
              )}

              {!historyOpen && running && (
                <Empty className="p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="size-8 [&_svg:not([class*='size-'])]:size-4">
                      <Spinner className="size-4" />
                    </EmptyMedia>
                    <EmptyTitle className="text-[12.7413px]">Running gap analysis</EmptyTitle>
                    <EmptyDescription className="text-[10.7811px]">
                      This can take a while for large frameworks.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}

              {!historyOpen && result && !running && (
                <div className="space-y-3">
                  <Empty className="border border-dashed p-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="size-8 [&_svg:not([class*='size-'])]:size-4">
                        <CircleCheck />
                      </EmptyMedia>
                      <EmptyTitle className="text-[12.7413px]">Analysis complete</EmptyTitle>
                      <EmptyDescription className="text-[10.7811px]">
                        {result.items.length} items analyzed for &quot;{result.run.framework_name}&quot;. The full
                        table (item, file, evidence, recommendation) opens on its own page.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                  {result.disclaimer && (
                    <p className="border-l-[1.9602px] pl-3 text-[10.7811px] italic text-muted-foreground">{result.disclaimer}</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {hasFooter && (
          <SheetFooter className="mt-0 gap-0 bg-card p-0 px-5 sm:px-9">
            <div className="flex flex-col gap-2 border-t border-border py-4 sm:flex-row sm:items-center sm:justify-between">
            {showForm ? (
              <>
                <p className={CAPTION}>
                  {selectedCount === 0
                    ? "No documents selected"
                    : `${selectedCount} ${selectedCount === 1 ? "document" : "documents"} selected`}
                </p>
                <div className="flex items-center gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClose(false)}
                    className={ACTION_SECONDARY_CLASS}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleRun} disabled={!canSubmit} className={ACTION_PRIMARY_CLASS}>
                    Run Gap Analysis
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    clearPendingRedirect();
                    setResult(null);
                  }}
                  className={ACTION_SECONDARY_CLASS}
                >
                  New run
                </Button>
                <Button onClick={() => handleViewRun(result!.run.run_id)} className={ACTION_PRIMARY_CLASS}>
                  <FileSearch className="size-3.5" />
                  View full results
                </Button>
              </div>
            )}
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
