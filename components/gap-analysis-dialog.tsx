"use client";

// Skill 1 (Compliance Gap Check) UI. Generic by design — reference/target
// collections and framework_name are all user-picked, nothing here is
// ISO-specific. Skill 2 (scenario_regulatory_impact) is shown disabled:
// it's scaffold-only on the backend and not validated for real decisions yet.

import { useEffect, useState } from "react";
import { GapAnalysisApi, PdfCollectionsApi } from "@/services";
import type {
  GapAnalysisRequest,
  GapAnalysisResponse,
  GapAnalysisItem,
  PdfCollection,
} from "@/services";
import { getAuthHeader } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Download, ShieldCheck } from "lucide-react";

/** Truncated text that reveals the full value in a tooltip on hover/focus —
 * used for table cells whose content (item titles, evidence, recommendations)
 * can be arbitrarily long free-text from the LLM. */
function TruncatedCell({
  text,
  lines = 1,
}: {
  text: string;
  lines?: 1 | 2 | 3;
}) {
  const clampClass = lines === 1 ? "truncate" : lines === 2 ? "line-clamp-2" : "line-clamp-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`block ${clampClass} cursor-default`}>{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-wrap text-left">{text}</TooltipContent>
    </Tooltip>
  );
}

const STATUS_LABEL: Record<string, string> = {
  met: "Terpenuhi",
  partial: "Sebagian",
  not_met: "Belum",
  unknown: "Tidak jelas",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  met: "default",
  partial: "secondary",
  not_met: "destructive",
  unknown: "outline",
};

/** Download an export — a separate path from viewing the full result in-app;
 * download is for taking the report outside the app, not the only way to see it. */
async function downloadExport(runId: string, format: "markdown" | "pdf") {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const res = await fetch(
    `${baseUrl}/api/v1/analysis/gap-analysis/${runId}/export?format=${format}`,
    { headers: getAuthHeader() },
  );
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gap-analysis-${runId}.${format === "pdf" ? "pdf" : "md"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface GapAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GapAnalysisDialog({ open, onOpenChange }: GapAnalysisDialogProps) {
  const { toast } = useToast();
  const [pdfCollections, setPdfCollections] = useState<PdfCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [referenceId, setReferenceId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [frameworkName, setFrameworkName] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GapAnalysisResponse | null>(null);
  const [downloading, setDownloading] = useState<"markdown" | "pdf" | null>(null);

  useEffect(() => {
    if (!open) return;
    setCollectionsLoading(true);
    PdfCollectionsApi.get<PdfCollection[]>()
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

  const collectionLabel = (c: PdfCollection) => c.title || c.file_names?.[0] || c.collection_id;

  const sameCollectionSelected = !!referenceId && !!targetId && referenceId === targetId;

  const canSubmit =
    !!referenceId && !!targetId && !sameCollectionSelected && !!frameworkName.trim() && !running;

  const handleRun = () => {
    if (!canSubmit) return;
    setRunning(true);
    setResult(null);
    const body: GapAnalysisRequest = {
      skill_id: "compliance_gap_check",
      reference_collection_ids: [referenceId],
      framework_name: frameworkName.trim(),
      target_collection_id: targetId,
    };
    GapAnalysisApi.store<GapAnalysisResponse>(body as unknown as Record<string, unknown>)
      .then((data) => setResult(data))
      .catch((err) =>
        toast({
          title: "Gap analysis gagal",
          description: err instanceof Error ? err.message : "Coba lagi.",
          variant: "destructive",
        }),
      )
      .finally(() => setRunning(false));
  };

  const handleDownload = (format: "markdown" | "pdf") => {
    if (!result) return;
    setDownloading(format);
    downloadExport(result.run.run_id, format)
      .catch((err) =>
        toast({
          title: "Download gagal",
          description: err instanceof Error ? err.message : "Coba lagi.",
          variant: "destructive",
        }),
      )
      .finally(() => setDownloading(null));
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setResult(null);
      setReferenceId("");
      setTargetId("");
      setFrameworkName("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto font-['Inter']">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-['Manrope'] font-extrabold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Compliance Gap Check
          </DialogTitle>
          <DialogDescription className="font-['Inter']">
            Bandingkan dokumen perusahaan terhadap standar/framework apa pun yang sudah diupload
            sebagai collection — ISO 27001 cuma contoh, framework_name bebas diisi.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            {!collectionsLoading && pdfCollections.length === 0 && (
              <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                Belum ada PDF collection. Upload dokumen di halaman Sources dulu, baru kembali ke sini.
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
                Reference collection (standar/framework)
              </label>
              <Select value={referenceId} onValueChange={setReferenceId} disabled={collectionsLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={collectionsLoading ? "Memuat collection…" : "Pilih collection standar…"}
                  />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {pdfCollections.map((c) => (
                    <SelectItem key={c.collection_id} value={c.collection_id}>
                      <span className="truncate min-w-0 flex-1" title={collectionLabel(c)}>
                        {collectionLabel(c)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
                Target collection (dokumen perusahaan)
              </label>
              <Select value={targetId} onValueChange={setTargetId} disabled={collectionsLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={collectionsLoading ? "Memuat collection…" : "Pilih collection dokumen perusahaan…"}
                  />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {pdfCollections.map((c) => (
                    <SelectItem key={c.collection_id} value={c.collection_id}>
                      <span className="truncate min-w-0 flex-1" title={collectionLabel(c)}>
                        {collectionLabel(c)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sameCollectionSelected && (
                <p className="text-xs text-destructive">
                  Target harus berbeda dari reference collection — pilih collection lain.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
                Nama framework (label bebas)
              </label>
              <Input
                value={frameworkName}
                onChange={(e) => setFrameworkName(e.target.value)}
                placeholder='mis. "ISO 27001", "ISO 9001", atau SOP internal apa pun'
              />
            </div>

            <p className="text-[11px] text-muted-foreground/70">
              Skill lain (Scenario/Regulatory Impact — mis. kasus pajak) masih scaffold, belum
              tersedia di sini sampai divalidasi.
            </p>
          </div>
        )}

        {running && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Menjalankan gap analysis — bisa butuh waktu untuk framework besar…
          </div>
        )}

        {result && !running && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map((status) => (
                <Badge key={status} variant={STATUS_VARIANT[status]}>
                  {result.summary[status as keyof typeof result.summary] ?? 0} {STATUS_LABEL[status]}
                </Badge>
              ))}
            </div>

            {result.disclaimer && (
              <p className="text-[11px] text-muted-foreground/70 italic border-l-2 border-border pl-2">
                {result.disclaimer}
              </p>
            )}

            <div className="border rounded-xl max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[180px]">Item</TableHead>
                    <TableHead className="text-xs w-[90px]">Status</TableHead>
                    <TableHead className="text-xs">Evidence</TableHead>
                    <TableHead className="text-xs">Rekomendasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-6">
                        Tidak ada item yang berhasil diekstrak dari reference collection.
                      </TableCell>
                    </TableRow>
                  )}
                  {result.items.map((item: GapAnalysisItem, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-medium align-top max-w-[180px]">
                        <TruncatedCell text={item.label} lines={2} />
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground align-top max-w-[220px]">
                        {item.evidence ? <TruncatedCell text={item.evidence} lines={3} /> : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground align-top max-w-[220px]">
                        {item.recommendation ? <TruncatedCell text={item.recommendation} lines={3} /> : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {!result ? (
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
              <Button variant="outline" onClick={() => setResult(null)} className="rounded-xl font-['Manrope'] font-semibold">
                Run baru
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload("markdown")}
                disabled={downloading !== null}
                className="rounded-xl font-['Manrope'] font-semibold"
              >
                {downloading === "markdown" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Markdown
              </Button>
              <Button
                onClick={() => handleDownload("pdf")}
                disabled={downloading !== null}
                className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
              >
                {downloading === "pdf" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                PDF
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
