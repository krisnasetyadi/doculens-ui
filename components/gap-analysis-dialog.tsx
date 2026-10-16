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
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/date";
import { pdfCollectionsApi } from "@/services/pdf-collections/handler/pdf-collections.api";
import type { PdfCollection } from "@/services/pdf-collections/type/pdf-collection.type";
import { GapAnalysisApi } from "@/services/resources/gap-analysis-api";
import type { GapAnalysisRequest, GapAnalysisResponse, GapAnalysisRun } from "@/services";
import { useToast, errorToast } from "@/hooks/use-toast";
import { ApiError } from "@/services/api-error";
import { cn } from "@/lib/utils";
import { HTTP_URL_MESSAGE, isHttpUrl, splitLines } from "@/lib/validations/url";
import { getFileTypeLabel } from "@/lib/file-type";
import { sourceFoldersQueries } from "@/services/source-folders/handler/source-folders.queries";
import {
  CAPTION_CLASS,
  LABEL_CLASS,
  SECTION_TITLE_CLASS,
} from "@/components/workspace/settings-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, NoResults } from "@/components/empty-state";
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
import { FormField } from "@/components/forms/form-field";
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
import { IconButton } from "@/components/icon-button";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { Panel } from "@/components/panel";
import { Notice } from "@/components/notice";

const REDIRECT_COUNTDOWN_SECONDS = 3;
const GAP_FORM_ID = "gap-analysis-form";

const gapAnalysisSchema = z.object({
  referenceId: z.string().min(1, "Select a framework to compare against"),
  targetIds: z.array(z.string()).min(1, "Select at least one company document"),
  frameworkName: z.string().trim().min(1, "Enter a framework name"),
});
type GapAnalysisValues = z.infer<typeof gapAnalysisSchema>;
const EMPTY_GAP_ANALYSIS: GapAnalysisValues = { referenceId: "", targetIds: [], frameworkName: "" };

/** "Add from PDF URL": one link for the reference, one or more (a line each) for company documents. */
const singleLinkSchema = z.object({
  urls: z.string().trim().min(1, "Enter a PDF link").refine(isHttpUrl, { message: HTTP_URL_MESSAGE }),
});
const multipleLinksSchema = z.object({
  urls: z.string().superRefine((value, ctx) => {
    const lines = splitLines(value);
    if (lines.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter at least one PDF link" });
      return;
    }
    const bad = lines.findIndex((line) => !isHttpUrl(line));
    if (bad === -1) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: lines.length === 1 ? HTTP_URL_MESSAGE : `${HTTP_URL_MESSAGE} on line ${bad + 1}`,
    });
  }),
});
type AddFromLinkValues = { urls: string };

/** The server's 400 for upload-from-urls, about the link(s) the user pasted. */
function linkRefusalMessage(serverMessage: string, count: number) {
  if (serverMessage.startsWith("No readable text")) {
    return count === 1 ? "No readable text was found in this PDF" : "No readable text was found in these PDFs";
  }
  return count === 1
    ? "Use a link that opens a PDF file directly, without signing in"
    : "Use links that each open a PDF file directly, without signing in";
}

/** Soft tint per file type, same hues the Sources page uses for its type icons. */
const TYPE_BADGE_VARIANT: Record<string, "destructive" | "info" | "success"> = {
  PDF: "destructive",
  DOC: "info",
  DOCX: "info",
  CSV: "success",
  XLSX: "success",
};

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
  titleId,
  children,
}: {
  number: number;
  title: ReactNode;
  /** Lets the section's control use its title as its accessible name (aria-labelledby). */
  titleId?: string;
  description: string;
  aside?: ReactNode;
  divider?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex min-h-0 shrink-0 gap-3.5 py-3.5", divider && "border-t border-border", className)}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-manrope text-[11.7612px] font-bold text-primary-foreground">
        {number}
      </span>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className={cn(SECTION_TITLE, "leading-5")}>{title}</h3>
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
  onToggleOpen,
  onAdd,
  onCancel,
  multiline,
  disabled = false,
}: {
  open: boolean;
  onToggleOpen: () => void;
  /** Resolves to a message for the link field when the server refused the link(s), or null when
   * they were added (the caller closes the panel) or a toast was shown. */
  onAdd: (urls: string[]) => Promise<string | null>;
  onCancel: () => void;
  multiline: boolean;
  /** Locks the whole panel (toggle, inputs, and both buttons) separately
   * from its own link-upload request, e.g. while a gap analysis run is in
   * flight and no field should move. */
  disabled?: boolean;
}) {
  const form = useForm<AddFromLinkValues>({
    resolver: zodResolver(multiline ? multipleLinksSchema : singleLinkSchema),
    defaultValues: { urls: "" },
  });
  const loading = form.formState.isSubmitting;

  // Every opening starts clean: no link left from last time and no message.
  useEffect(() => {
    if (open) form.reset({ urls: "" });
  }, [open, form]);

  const submit = form.handleSubmit(async ({ urls }) => {
    const linkError = await onAdd(splitLines(urls));
    if (linkError) form.setError("urls", { message: linkError }, { shouldFocus: true });
  });

  if (!open) {
    return (
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onToggleOpen}
        disabled={disabled}
        className="gap-1.5 self-start"
      >
        <FilePlus2 className="size-3" />
        Add from PDF URL
      </Button>
    );
  }

  return (
    <Panel padding="sm">
      <form noValidate onSubmit={submit} className="space-y-2.5">
        <FormField
          control={form.control}
          name="urls"
          description={`The link must point directly to a PDF file${multiline ? ". One link per line, all merged into one new collection" : ""}.`}
          render={(field) =>
            multiline ? (
              <Textarea
                {...field}
                aria-label="PDF links"
                placeholder={"https://example.com/document-1.pdf\nhttps://example.com/document-2.pdf"}
                disabled={loading || disabled}
              />
            ) : (
              <Input
                {...field}
                type="url"
                aria-label="PDF link"
                placeholder="https://example.com/document.pdf"
                disabled={loading || disabled}
              />
            )
          }
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" loading={loading} loadingText="Adding…" disabled={disabled}>
            Add
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={loading || disabled}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
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
  const form = useForm<GapAnalysisValues>({
    resolver: zodResolver(gapAnalysisSchema),
    defaultValues: EMPTY_GAP_ANALYSIS,
  });
  const referenceId = useWatch({ control: form.control, name: "referenceId" });
  const targetIds = useWatch({ control: form.control, name: "targetIds" });
  // Read during render so react-hook-form re-renders this component on submit; read only inside an
  // event handler, the proxy never subscribes and keeps returning the first value (false).
  const { isSubmitted } = form.formState;
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GapAnalysisResponse | null>(null);

  const [refLinkOpen, setRefLinkOpen] = useState(false);
  const [targetLinkOpen, setTargetLinkOpen] = useState(false);

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
          title: "Couldn't load collections",
          description: "Close and reopen this dialog to try again.",
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
          title: "Couldn't load history",
          description: "Close and reopen the history to try again.",
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
          title: "Couldn't delete this run",
          description: `"${run.framework_name}" is still there. Try again.`,
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

  // A value changed from outside its own field is re-checked the way typing would be: only once the
  // user has submitted, so no message appears before the first submit.
  const revalidate = () => ({ shouldValidate: isSubmitted, shouldDirty: true });

  const toggleTarget = (id: string) => {
    const current = form.getValues("targetIds");
    form.setValue("targetIds", current.includes(id) ? current.filter((t) => t !== id) : [...current, id], revalidate());
  };

  /** Choosing a reference also drops it from the targets: a collection can't
   * be compared against itself, and its row is locked in the table below. */
  const selectReference = (id: string) => {
    form.setValue("referenceId", id, revalidate());
    if (!id) return;
    const current = form.getValues("targetIds");
    if (current.includes(id)) form.setValue("targetIds", current.filter((t) => t !== id), revalidate());
  };

  const selectableIds = pdfCollections.map((c) => c.collection_id).filter((id) => id !== referenceId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => targetIds.includes(id));
  const toggleAll = () => form.setValue("targetIds", allSelected ? [] : selectableIds, revalidate());

  /** Pasted URL(s) become one new PDF collection (upload-from-urls merges them
   * into a single collection_id), which then behaves like any uploaded
   * collection, so no separate "link" code path is needed anywhere else.
   * The single-line reference field always yields exactly one URL; only the
   * multiline target field (one link per line, per its own helper text) can yield several.
   * Resolves to a message for the link field when the server refused the link(s). */
  const addCollectionFromUrls = (urls: string[], mode: "reference" | "target"): Promise<string | null> =>
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
        } else {
          form.setValue("targetIds", [...form.getValues("targetIds"), res.collection_id], revalidate());
          setTargetLinkOpen(false);
        }
        toast({
          title: "Link added",
          description: `${res.file_count} document(s) from the link were merged into 1 new collection.`,
          variant: "success",
        });
        return null;
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 400) return linkRefusalMessage(err.message, urls.length);
        toast(errorToast("Couldn't add from link", err, "Check your connection and try again."));
        return null;
      });


  const handleRun = form.handleSubmit((values) => {
    setRunning(true);
    setResult(null);
    const body: GapAnalysisRequest = {
      skill_id: "compliance_gap_check",
      reference_collection_ids: [values.referenceId],
      framework_name: values.frameworkName,
      target_collection_ids: values.targetIds,
    };
    GapAnalysisApi.run<GapAnalysisResponse>(body as unknown as Record<string, unknown>)
      .then((data) => {
        setResult(data);
        clearPendingRedirect();
        const runId = data.run.run_id;
        let secondsLeft = REDIRECT_COUNTDOWN_SECONDS;
        const t = toast({
          title: "Analysis complete",
          description: `Opening the full result in ${secondsLeft} seconds…`,
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
            title: "Analysis complete",
            description: `Opening the full result in ${secondsLeft} seconds…`,
            variant: "success",
          });
        }, 1000);
        pendingRedirectRef.current = { timer, dismiss: t.dismiss };
      })
      .catch((err) =>
        toast(errorToast("Couldn't run the gap analysis", err)),
      )
      .finally(() => setRunning(false));
  });

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
      form.reset(EMPTY_GAP_ANALYSIS);
      setRefLinkOpen(false);
      setTargetLinkOpen(false);
      setHistoryOpen(false);
      setHistorySearch("");
    }
    onOpenChange(next);
  };

  const showForm = !historyOpen && !result && !running;
  const selectedCount = targetIds.length;
  const hasFooter = showForm || (!!result && !running && !historyOpen);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className={cn("flex w-full flex-col gap-0 border-border bg-card p-0 font-inter shadow-[0_24px_70px_rgba(24,32,51,0.15)] sm:max-w-[752.7168px] border-l-[0.9801px] dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)] [&>button:last-child]:right-5 sm:[&>button:last-child]:right-9 [&>button:last-child]:top-6 [&>button:last-child]:p-1 [&>button:last-child]:text-foreground [&>button:last-child]:opacity-80 [&>button:last-child:hover]:opacity-100", DRAWER_SCALE_CLASS)}
      >
        {/* Title block left, History right, plain close button at the far right
            (sm:pr-[76.23px] keeps History clear of it); an inset hairline closes
            the header instead of a full-bleed border. */}
        <SheetHeader className="gap-0 bg-card px-5 pb-4 pt-6 pr-14 sm:px-9 sm:pr-[76.23px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <SheetTitle className="font-manrope text-base font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                  Compliance Gap Check
                </SheetTitle>
              </div>
              <SheetDescription className="mt-1 text-[11.7612px] leading-4 text-muted-foreground">
                Compare company documents against a selected compliance framework.
              </SheetDescription>
            </div>
            {!running && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setHistoryOpen((prev) => !prev)}
                className="shrink-0"
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
              titleId="gap-reference-title"
              title="Reference framework"
              description="Select a standard or framework to compare against."
            >
              <FormField
                control={form.control}
                name="referenceId"
                render={(field) => (
                  <SearchableSelect
                    id={field.id}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={field["aria-invalid"]}
                    aria-describedby={field["aria-describedby"]}
                    aria-labelledby="gap-reference-title"
                    size="sm"
                    contentClassName={cn(DRAWER_SCALE_CLASS, "border-[0.9801px]")}
                    items={pdfCollections.map((c) => ({
                      value: c.collection_id,
                      label: collectionLabel(c),
                    }))}
                    value={field.value}
                    onValueChange={(v) => selectReference(v ?? "")}
                    disabled={collectionsLoading}
                    icon={<ShieldCheck className="size-3.5 text-muted-foreground" />}
                    placeholder={collectionsLoading ? "Loading collections…" : "Select a framework"}
                    searchPlaceholder="Search collections…"
                  />
                )}
              />
              <AddFromLinkPanel
                open={refLinkOpen}
                onToggleOpen={() => setRefLinkOpen(true)}
                onAdd={(urls) => addCollectionFromUrls(urls, "reference")}
                onCancel={() => setRefLinkOpen(false)}
                multiline={false}
              />
            </Section>

            <Section
              number={2}
              divider
              titleId="gap-targets-title"
              title="Company documents"
              description="Select the documents you want to include in the analysis."
              aside={
                <Badge variant="info">{selectedCount} selected</Badge>
              }
            >
              <FormField
                control={form.control}
                name="targetIds"
                render={(field) => (
                  <>
                  {collectionsSkeleton ? (
                    <Panel role="status" padding="sm" className="space-y-2">
                      <span className="sr-only">Loading documents…</span>
                      {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-7 w-full" aria-hidden="true" />
                      ))}
                    </Panel>
                  ) : pdfCollections.length === 0 ? (
                    <EmptyState
                      size="compact"
                      icon={FileText}
                      heading="No documents yet"
                      description="Upload files on the Sources page, or add one from a PDF URL below."
                    />
                  ) : (
                    <Panel
                      role="group"
                      aria-labelledby="gap-targets-title"
                      aria-describedby={field["aria-describedby"]}
                      className="custom-scrollbar max-h-64 overflow-y-auto"
                    >
                      <table data-slot="table" className="w-full caption-bottom text-xs">
                        <TableHeader className="sticky top-0 z-10 bg-[#f1f4fa] dark:bg-muted/60 shadow-[inset_0_-0.9801px_0_var(--border)] [&_tr]:border-b-0!">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-7 w-10 pl-3">
                              <Checkbox
                                ref={field.ref}
                                id={field.id}
                                aria-invalid={field["aria-invalid"]}
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
                            const checked = targetIds.includes(id);
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
                                    <Badge variant={TYPE_BADGE_VARIANT[type] ?? "secondary"} className="w-10">
                                      {type}
                                    </Badge>
                                    <TruncatedTooltip label={label}>
                                      <span className="truncate text-xs">{label}</span>
                                    </TruncatedTooltip>
                                    {isReference && (
                                      <Badge variant="secondary">Reference</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden max-w-0 w-32 py-1.5 text-[10.7811px] text-muted-foreground sm:table-cell">
                                  <TruncatedTooltip label={folderLabel(c.folder_id)}>
                                    <span className="block truncate">{folderLabel(c.folder_id)}</span>
                                  </TruncatedTooltip>
                                </TableCell>
                                <TableCell className="hidden py-1.5 pr-4 text-right text-[10.7811px] text-muted-foreground sm:table-cell">
                                  {formatDate(c.created_at)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </table>
                    </Panel>
                  )}
                  </>
                )}
              />
              <AddFromLinkPanel
                open={targetLinkOpen}
                onToggleOpen={() => setTargetLinkOpen(true)}
                onAdd={(urls) => addCollectionFromUrls(urls, "target")}
                onCancel={() => setTargetLinkOpen(false)}
                multiline
              />
            </Section>

            {/* The <form> holds only the text field. The selects and checkboxes above join it through
                react-hook-form, not the DOM: inside a <form>, a Radix checkbox re-dispatches a click from a
                hidden input whenever it changes, and the clickable table rows turned that into another
                toggle (Select all looped forever). Enter here, or Run in the footer (form=), submits. */}
            <form id={GAP_FORM_ID} noValidate onSubmit={handleRun} className="contents">
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
                <FormField
                  control={form.control}
                  name="frameworkName"
                  render={(field) => (
                    <Input
                      {...field}
                      aria-label="Framework name"
                      placeholder='e.g. "ISO 27001", "ISO 9001", or any internal SOP'
                    />
                  )}
                />
              </Section>
            </form>

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
                    <EmptyState
                      size="compact"
                      icon={History}
                      heading="No history yet"
                      description="Gap analysis runs you complete will show up here."
                    />
                  )}

                  {!historySkeleton && historyRuns.length > 0 && filteredHistoryRuns.length === 0 && (
                    <NoResults query={historySearch} onClear={() => setHistorySearch("")} />
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
                              {run.status} · {formatDateTime(run.created_at)}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <IconButton
                              danger
                              label="Delete from history"
                              type="button"
                              size="sm"
                              onClick={(e) => handleDeleteRun(e, run)}
                              loading={deleting}
                            >
                              <Trash2 className="size-3.5" />
                            </IconButton>
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          </ItemActions>
                        </Item>
                      );
                    })}
                </div>
              )}

              {!historyOpen && running && (
                <EmptyState
                  size="compact"
                  icon={Spinner}
                  heading="Running gap analysis"
                  description="This can take a while for large frameworks."
                />
              )}

              {!historyOpen && result && !running && (
                <div className="space-y-3">
                  <EmptyState
                    size="compact"
                    icon={CircleCheck}
                    heading="Analysis complete"
                    description={`${result.items.length} items analyzed for "${result.run.framework_name}". The full table (item, file, evidence, recommendation) opens on its own page.`}
                  />
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
                  >
                    Cancel
                  </Button>
                  <Button type="submit" form={GAP_FORM_ID}>
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
                >
                  New run
                </Button>
                <Button onClick={() => handleViewRun(result!.run.run_id)}>
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
