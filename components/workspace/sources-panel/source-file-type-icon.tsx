import { useEffect, useState } from "react";
import { Check, FileSpreadsheet, FileText, FileType2, Loader2, MessageCircle, Table2, X, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UPLOAD_STAGE_LABELS, type UploadStage } from "@/services/upload-progress";
import type { UploadStatus } from "./sources-types";

const TYPE_VISUALS: Record<string, { icon: LucideIcon; background: string; color: string }> = {
  PDF: { icon: FileText, background: "bg-red-50 dark:bg-[#42222d]", color: "text-red-600 dark:text-red-400" },
  DOC: { icon: FileType2, background: "bg-blue-50 dark:bg-[#20365e]", color: "text-blue-600 dark:text-[#82a5ff]" },
  DOCX: { icon: FileType2, background: "bg-blue-50 dark:bg-[#20365e]", color: "text-blue-600 dark:text-[#82a5ff]" },
  CSV: { icon: Table2, background: "bg-emerald-50 dark:bg-[#17443d]", color: "text-emerald-600 dark:text-[#50d5a5]" },
  XLSX: { icon: FileSpreadsheet, background: "bg-emerald-50 dark:bg-[#17443d]", color: "text-emerald-600 dark:text-[#50d5a5]" },
  TXT: { icon: FileText, background: "bg-violet-50 dark:bg-[#342550]", color: "text-violet-700 dark:text-[#b69cff]" },
  WhatsApp: { icon: MessageCircle, background: "bg-green-50 dark:bg-[#173c2b]", color: "text-green-600 dark:text-green-400" },
};

const OTHER_VISUAL = { icon: FileText, background: "bg-yellow-50 dark:bg-[#473415]", color: "text-yellow-700 dark:text-amber-400" };
const RESULT_BADGE_DURATION_MS = 2500;

export function SourceFileTypeIcon({
  type,
  status,
  progress = 0,
  stage = "reading",
  finishedAt,
}: {
  type: string;
  status: UploadStatus;
  progress?: number;
  stage?: UploadStage;
  finishedAt?: number;
}) {
  const [showBadge, setShowBadge] = useState(() =>
    status === "uploading" || (finishedAt !== undefined && Date.now() - finishedAt < RESULT_BADGE_DURATION_MS),
  );

  useEffect(() => {
    if (status === "uploading") {
      setShowBadge(true);
      return;
    }
    const remaining = finishedAt === undefined ? 0 : RESULT_BADGE_DURATION_MS - (Date.now() - finishedAt);
    setShowBadge(remaining > 0);
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setShowBadge(false), remaining);
    return () => window.clearTimeout(timer);
  }, [status, finishedAt]);

  const visual = TYPE_VISUALS[type] ?? OTHER_VISUAL;
  const Icon = visual.icon;
  const StatusGlyph = status === "uploading" ? Loader2 : status === "error" ? X : Check;
  const statusColor = status === "uploading" ? "bg-primary" : status === "error" ? "bg-red-400" : "bg-emerald-500";

  return (
    <span className="relative inline-flex size-8 shrink-0">
      <span
        role="img"
        aria-label={`${type} source`}
        className={`flex size-8 items-center justify-center rounded-full ${visual.background}`}
      >
        <Icon className={`size-4 ${visual.color}`} aria-hidden="true" />
      </span>
      {showBadge && <Badge
        role={status === "uploading" ? "progressbar" : "img"}
        aria-label={status === "uploading" ? "Source preparation" : status === "error" ? "Upload failed" : "Upload complete"}
        aria-valuemin={status === "uploading" ? 0 : undefined}
        aria-valuemax={status === "uploading" ? 100 : undefined}
        aria-valuenow={status === "uploading" ? progress : undefined}
        aria-valuetext={status === "uploading" ? `${UPLOAD_STAGE_LABELS[stage]}: ${progress}%` : undefined}
        className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card p-0 text-white [&>svg]:size-2.5 ${statusColor}`}
      >
        <StatusGlyph className={status === "uploading" ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden="true" />
      </Badge>}
    </span>
  );
}
