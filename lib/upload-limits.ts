// MS-504: the client-side half of the upload limits. The server enforces the
// same three limits and is the one that decides; this only gives the answer
// before a byte is sent. Kept free of app imports so it can run under
// `node --test`.

export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export interface UploadLimits {
  maxFileBytes: number;
  maxBatchFiles: number;
}

/** Used until the workspace's real limits arrive (or when they can't be read). */
export const DEFAULT_UPLOAD_LIMITS: UploadLimits = {
  maxFileBytes: 50 * MB,
  maxBatchFiles: 10,
};

export const QUOTA_EXCEEDED_MESSAGE = "Storage Limit Reached. Please delete older files to free up space.";

/** "50 MB", "819 MB", "4.2 GB". Whole numbers stay whole. Rounds down, so a
 * workspace with 4.97 GB used never reads "5 GB / 5 GB" while it still has
 * room. Same rule as the server, so a limit reads the same in a banner and
 * in the API error. */
export function formatBytes(bytes: number): string {
  const [value, unit] = bytes >= GB ? [bytes / GB, "GB"] : [bytes / MB, "MB"];
  const text = (Math.floor(value * 10 + 1e-9) / 10).toFixed(1).replace(/\.0$/, "");
  return `${text} ${unit}`;
}

export function fileTooLargeMessage(limits: UploadLimits): string {
  return `File exceeds the ${formatBytes(limits.maxFileBytes)} maximum size limit.`;
}

export function batchTooLargeMessage(limits: UploadLimits): string {
  return `You can only upload up to ${limits.maxBatchFiles} files at a time.`;
}

export function uploadLimitsFrom(
  usage: { max_file_bytes: number; max_batch_files: number } | null | undefined,
): UploadLimits {
  return usage
    ? { maxFileBytes: usage.max_file_bytes, maxBatchFiles: usage.max_batch_files }
    : DEFAULT_UPLOAD_LIMITS;
}

/** The message for a selection with too many files, or null if it is fine.
 * The whole selection is refused, not trimmed: which files a user meant to
 * leave out is theirs to decide. */
export function batchLimitError(count: number, limits: UploadLimits): string | null {
  return count > limits.maxBatchFiles ? batchTooLargeMessage(limits) : null;
}

export interface RejectedFile<T> {
  file: T;
  error: string;
  reason: "size" | "quota";
}

/** Split a selection into the files that may be sent and the ones that may not.
 *
 * Files are taken in selection order against the space left, so the same
 * selection always gives the same result. Without this the outcome would
 * follow whichever request the server happened to see first, because each
 * file is its own request. A file that does not fit is skipped and a smaller
 * one after it may still fit. `remainingBytes` is null when the usage is
 * unknown; the server then decides alone. */
export function screenFiles<T extends { size: number }>(
  files: T[],
  limits: UploadLimits,
  remainingBytes: number | null,
): { accepted: T[]; rejected: RejectedFile<T>[] } {
  const accepted: T[] = [];
  const rejected: RejectedFile<T>[] = [];
  let remaining = remainingBytes;

  for (const file of files) {
    if (file.size > limits.maxFileBytes) {
      rejected.push({ file, error: fileTooLargeMessage(limits), reason: "size" });
    } else if (remaining !== null && file.size > remaining) {
      rejected.push({ file, error: QUOTA_EXCEEDED_MESSAGE, reason: "quota" });
    } else {
      accepted.push(file);
      if (remaining !== null) remaining -= file.size;
    }
  }
  return { accepted, rejected };
}

/** Same severity scale as the token quota bars: primary below 80%, amber from
 * 80%, destructive once nothing more fits. */
export function usageSeverity(percent: number, blocked: boolean): "ok" | "warn" | "full" {
  if (blocked) return "full";
  return percent >= 80 ? "warn" : "ok";
}

/** One file's result in an upload batch, as far as the limits banner cares. */
export interface LimitOutcome {
  name: string;
  /** Set when the file never made it in. */
  error?: string;
  warning?: string;
  /** Why it was refused, when a size or storage limit was the reason. */
  limit?: "size" | "quota";
  size?: number;
}

export interface UploadNotice {
  tone: "error" | "warning";
  title: string;
  message: string;
  /** Per-file results, kept for a multi-file batch so it is clear which
   * files went in and which did not (AC5). Empty for a single file. */
  results: LimitOutcome[];
  /** A storage-quota failure: offer to free up space or upgrade. */
  quota: boolean;
}

export const QUOTA_NOTICE_MESSAGE = "Please delete older files to free up space, or upgrade your plan.";

/** The banner for a finished batch that hit at least one limit. */
export function summarizeUpload(outcomes: LimitOutcome[]): UploadNotice {
  const failed = outcomes.filter((o) => o.error);
  const uploaded = outcomes.length - failed.length;
  const quota = failed.some((o) => o.limit === "quota");
  const results = outcomes.length > 1 ? outcomes : [];

  if (uploaded > 0) {
    const count = failed.length;
    return {
      tone: "warning",
      title: `${uploaded} of ${outcomes.length} files uploaded`,
      message: `${count} ${count === 1 ? "file was" : "files were"} not uploaded. The reason is next to each file.`,
      results,
      quota,
    };
  }

  if (failed.length === 1) {
    const [only] = failed;
    return only.limit === "quota"
      ? { tone: "error", title: "Storage Limit Reached", message: QUOTA_NOTICE_MESSAGE, results, quota }
      : { tone: "error", title: "Upload blocked", message: only.error ?? "", results, quota };
  }

  return {
    tone: "error",
    title: "Nothing was uploaded",
    message: quota
      ? `Storage Limit Reached. ${QUOTA_NOTICE_MESSAGE}`
      : "None of the files could be uploaded. The reason is next to each file.",
    results,
    quota,
  };
}

/** Shown while the workspace is full, before anyone has tried to upload. */
export const STORAGE_FULL_NOTICE: UploadNotice = {
  tone: "error",
  title: "Storage Limit Reached",
  message: QUOTA_NOTICE_MESSAGE,
  results: [],
  quota: true,
};
