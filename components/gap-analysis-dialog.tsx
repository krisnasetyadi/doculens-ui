"use client";

// Skill 1 (Compliance Gap Check) UI. Generic by design — reference/target
// collections and framework_name are all user-picked, nothing here is
// ISO-specific. Skill 2 (scenario_regulatory_impact) is shown disabled:
// it's scaffold-only on the backend and not validated for real decisions yet.

import { useEffect, useRef, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PdfCollectionApi } from "@/services/resources/pdf-collection-api";
import { GapAnalysisApi } from "@/services/resources/gap-analysis-api";
import type {
  GapAnalysisRequest,
  GapAnalysisResponse,
  GapAnalysisRun,
  PdfCollection,
  UploadResponse,
} from "@/services";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { SearchableSelect } from "@/components/fields/searchable-select";
import { Loader2, ShieldCheck, BookMarked, Building2, Tag, Link2, History, ArrowLeft, Search, Trash2, FileSearch } from "lucide-react";

const REDIRECT_COUNTDOWN_SECONDS = 3;

/** Small numbered header for each step of the dialog form — consistent icon
 * + label treatment so the (now 3-way) form reads as clear steps rather than
 * a loose stack of fields. */
function SectionHeader({
  icon: Icon,
  step,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  step: number;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-['Manrope'] shrink-0">
        {step}
      </span>
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">{children}</label>
    </div>
  );
}

/** Collapsed-by-default "add from link" affordance — reused for both the
 * reference and target sections. Downloads whatever the pasted URL(s) point
 * to and merges them into ONE new PDF collection (upload-from-urls), which
 * then behaves exactly like any other uploaded collection. Links must point
 * directly at a PDF file, not an arbitrary webpage. */
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
  /** Locks the whole panel — toggle, inputs, and both buttons — separately
   * from `loading` (which only covers this panel's own link-upload request),
   * e.g. while a gap analysis run is in flight and no field should move. */
  disabled?: boolean;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        disabled={disabled}
        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none"
      >
        <Link2 className="h-3 w-3" />
        Atau tambah dari link PDF
      </button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border p-2.5 bg-muted/20">
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={"https://contoh.com/dokumen1.pdf\nhttps://contoh.com/dokumen2.pdf"}
          className="text-xs min-h-16"
          disabled={loading || disabled}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="https://contoh.com/dokumen.pdf"
          className="text-xs h-8"
          disabled={loading || disabled}
        />
      )}
      <p className="text-[10px] text-muted-foreground">
        Link harus mengarah langsung ke file PDF
        {multiline ? " — satu link per baris, semua digabung jadi satu collection baru" : ""}.
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={loading || disabled || !value.trim()}
          className="h-7 text-xs rounded-lg font-['Manrope'] font-bold"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
          Tambah
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={loading || disabled}
          className="h-7 text-xs rounded-lg font-['Manrope'] font-semibold"
        >
          Batal
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
  const [historySearch, setHistorySearch] = useState("");
  const [deletingRunIds, setDeletingRunIds] = useState<Set<string>>(new Set());

  // Auto-redirect-after-success state — kept in a ref (not React state)
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
    PdfCollectionApi.list<PdfCollection[]>()
      .then((data) => setPdfCollections(Array.isArray(data) ? data : []))
      .catch(() =>
        toast({
          title: "Gagal memuat collection",
          description: "Coba tutup dan buka dialog ini lagi.",
          variant: "destructive",
        }),
      )
      .finally(() => setCollectionsLoading(false));
  }, [open, toast]);

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
      .finally(() => setHistoryLoading(false));
  }, [open, historyOpen, toast]);

  /** History rows (and a finished run's auto-redirect countdown) open
   * straight into the dedicated results page — it has the width a
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
          description: `"${run.framework_name}" masih ada — coba lagi.`,
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

  const filteredHistoryRuns = historyRuns.filter((run) =>
    run.framework_name.toLowerCase().includes(historySearch.trim().toLowerCase()),
  );

  const collectionLabel = (c: PdfCollection) => c.title || c.file_names?.[0] || c.collection_id;

  const toggleTarget = (id: string) => {
    setTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const referenceSelectedAsTarget = !!referenceId && targetIds.has(referenceId);

  /** Pasted URL(s) → one new PDF collection (upload-from-urls merges them
   * into a single collection_id), which then behaves like any uploaded
   * collection — no separate "link" code path needed anywhere else.
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
    PdfCollectionApi.uploadFromUrls<UploadResponse>({ urls })
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
          setReferenceId(res.collection_id);
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

  const canSubmit =
    !!referenceId && targetIds.size > 0 && !referenceSelectedAsTarget && !!frameworkName.trim() && !running;

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

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-4xl flex flex-col gap-0 p-0 font-['Inter']"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5 pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <SheetTitle className="flex items-center gap-2 font-['Manrope'] font-extrabold text-foreground">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Compliance Gap Check
              </SheetTitle>
              <SheetDescription className="font-['Inter']">
                Bandingkan dokumen perusahaan terhadap standar/framework apa pun yang sudah diupload
                sebagai collection — ISO 27001 cuma contoh, framework_name bebas diisi.
              </SheetDescription>
            </div>
            {!running && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen((prev) => !prev)}
                className="h-8 shrink-0 rounded-lg font-['Manrope'] font-semibold text-xs"
              >
                {historyOpen ? (
                  <>
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                    Kembali
                  </>
                ) : (
                  <>
                    <History className="h-3.5 w-3.5 mr-1.5" />
                    Riwayat
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {historyOpen && (
          <div className="space-y-2">
            {historyRuns.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari riwayat berdasarkan judul framework…"
                  className="h-8 text-xs pl-8"
                />
              </div>
            )}

            {historyLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat riwayat…
              </div>
            )}
            {!historyLoading && historyRuns.length === 0 && (
              <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                Belum ada riwayat gap analysis run.
              </p>
            )}
            {!historyLoading && historyRuns.length > 0 && filteredHistoryRuns.length === 0 && (
              <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                Tidak ada riwayat yang cocok dengan "{historySearch}".
              </p>
            )}
            {!historyLoading &&
              filteredHistoryRuns.map((run) => (
                <div
                  key={run.run_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewRun(run.run_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleViewRun(run.run_id);
                  }}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer data-[disabled=true]:opacity-60 data-[disabled=true]:pointer-events-none"
                  data-disabled={deletingRunIds.has(run.run_id)}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold truncate">{run.framework_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {run.skill_id} · {run.status} · {new Date(run.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRun(e, run)}
                      disabled={deletingRunIds.has(run.run_id)}
                      className="p-1.5 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
                      title="Hapus riwayat"
                      aria-label="Hapus riwayat"
                    >
                      {deletingRunIds.has(run.run_id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-muted-foreground" />
                  </div>
                </div>
              ))}
          </div>
        )}

        {!historyOpen && !result && (
          <div className="space-y-3">
            {!collectionsLoading && pdfCollections.length === 0 && !refLinkOpen && (
              <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                Belum ada PDF collection. Upload dokumen di halaman Sources, atau tambah langsung dari link di bawah.
              </p>
            )}

            <div className="space-y-1.5 rounded-xl border border-border/60 p-3">
              <SectionHeader icon={BookMarked} step={1}>
                Reference collection (standar/framework)
              </SectionHeader>
              <SearchableSelect
                items={pdfCollections.map((c) => ({
                  value: c.collection_id,
                  label: collectionLabel(c),
                }))}
                value={referenceId}
                onValueChange={(v) => setReferenceId(v ?? "")}
                disabled={collectionsLoading || running}
                placeholder={collectionsLoading ? "Memuat collection…" : "Pilih collection standar…"}
                searchPlaceholder="Cari collection…"
                emptyMessage="Tidak ada collection yang cocok."
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
                disabled={running}
              />
            </div>

            <div className="space-y-1.5 rounded-xl border border-border/60 p-3">
              <SectionHeader icon={Building2} step={2}>
                Target collection (dokumen perusahaan) — bisa pilih beberapa file untuk dapat verdict per file
              </SectionHeader>
              {collectionsLoading ? (
                <p className="text-xs text-muted-foreground px-1">Memuat collection…</p>
              ) : pdfCollections.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-border/60 rounded-xl p-1.5">
                  {pdfCollections.map((c) => (
                    <label
                      key={c.collection_id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        running ? "cursor-not-allowed opacity-60" : "hover:bg-muted/30 cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={targetIds.has(c.collection_id)}
                        onCheckedChange={() => toggleTarget(c.collection_id)}
                        disabled={running}
                      />
                      <span className="flex-1 min-w-0 text-sm truncate" title={collectionLabel(c)}>
                        {collectionLabel(c)}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {referenceSelectedAsTarget && (
                <p className="text-xs text-destructive">
                  Target tidak boleh sama dengan reference collection — hilangkan dari pilihan target.
                </p>
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
                disabled={running}
              />
            </div>

            <div className="space-y-1.5 rounded-xl border border-border/60 p-3">
              <SectionHeader icon={Tag} step={3}>
                Nama framework (label bebas)
              </SectionHeader>
              <Input
                value={frameworkName}
                onChange={(e) => setFrameworkName(e.target.value)}
                placeholder='mis. "ISO 27001", "ISO 9001", atau SOP internal apa pun'
                disabled={running}
              />
            </div>

            <p className="text-[11px] text-muted-foreground/70 px-1">
              Skill lain (Scenario/Regulatory Impact — mis. kasus pajak) masih scaffold, belum
              tersedia di sini sampai divalidasi.
            </p>
          </div>
        )}

        {!historyOpen && running && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Menjalankan gap analysis — bisa butuh waktu untuk framework besar…
          </div>
        )}

        {!historyOpen && result && !running && (
          <div className="space-y-4">
            {result.disclaimer && (
              <p className="text-[11px] text-muted-foreground/70 italic border-l-2 border-border pl-2">
                {result.disclaimer}
              </p>
            )}

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center space-y-1">
              <p className="text-sm font-semibold">
                {result.items.length} item dianalisis untuk &quot;{result.run.framework_name}&quot;
              </p>
              <p className="text-xs text-muted-foreground">
                Tabel lengkap (Item, File, Evidence, Rekomendasi) dibuka di halaman tersendiri
                supaya tidak perlu scroll horizontal untuk baca setiap baris.
              </p>
            </div>
          </div>
        )}
        </div>

        <SheetFooter className="border-t border-border/60 px-6 py-4 flex-row justify-end gap-2">
          {historyOpen ? null : !result ? (
            <Button
              onClick={handleRun}
              disabled={!canSubmit}
              className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Jalankan Gap Analysis
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  clearPendingRedirect();
                  setResult(null);
                }}
                className="rounded-xl font-['Manrope'] font-semibold"
              >
                Run baru
              </Button>
              <Button
                onClick={() => handleViewRun(result.run.run_id)}
                className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
              >
                <FileSearch className="h-4 w-4 mr-2" />
                Lihat Hasil Lengkap
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
