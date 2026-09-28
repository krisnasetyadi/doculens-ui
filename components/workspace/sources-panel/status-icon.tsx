import { CheckCircle2, XCircle } from "lucide-react";
import type { UploadStatus } from "./sources-types";
import { UPLOAD_STAGE_LABELS, type UploadStage } from "@/services/upload-progress";

export function StatusIcon({ status, progress = 0, stage = "reading" }: { status: UploadStatus; progress?: number; stage?: UploadStage }) {
  if (status === "uploading")
    return (
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4 text-primary shrink-0 -rotate-90"
        role="progressbar"
        aria-label="Source preparation"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${UPLOAD_STAGE_LABELS[stage]}: ${progress}%`}
      >
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
        <circle
          cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - progress}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none"
        />
      </svg>
    );
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
}
