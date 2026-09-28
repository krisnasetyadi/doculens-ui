export const UPLOAD_STAGE_LABELS = {
  reading: "Reading document",
  preparing: "Preparing source",
  saving: "Saving source",
  ready: "Complete",
} as const;

export type UploadStage = keyof typeof UPLOAD_STAGE_LABELS;

export interface SourceUploadProgress {
  stage: UploadStage;
  progress: number;
  /** Set once the backend's first event arrives — the id to restore this
   * upload's progress by after a reload (see use-files-tab.ts). */
  uploadId?: string;
}

/** Shape of `GET .../uploads/{id}` — the same checkpoints the SSE stream
 * carried, kept queryable for a short while after a reload. */
export interface UploadSnapshot {
  status: "uploading" | "success" | "error";
  stage: UploadStage | null;
  progress: number | null;
  error?: string;
  result?: { collection_id: string; file_count?: number; message_count?: number };
}

/** Reads a growing NDJSON response body incrementally (XHR hands back the
 * whole `responseText` so far on every progress tick). A complete line is
 * unambiguous the moment its trailing "\n" is seen -- there's no need to
 * guess whether more lines are still coming, since the ready/error event's
 * own type is what marks the stream done, not the chunk boundary. */
export class UploadProgressStream<T> {
  private offset = 0;
  private progress = 0;
  private result?: T;
  private ready = false;

  constructor(private onProgress: (update: SourceUploadProgress) => void) {}

  read(text: string) {
    let end: number;
    while ((end = text.indexOf("\n", this.offset)) !== -1) {
      const line = text.slice(this.offset, end).trim();
      this.offset = end + 1;
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === "error") throw new Error(event.detail || "Failed to prepare source");
      if (this.ready) throw new Error("Unexpected progress after source was ready");
      if (event.type === "ready") {
        if (!event.result?.collection_id || event.result.status !== "success") {
          throw new Error("Invalid source result");
        }
        this.result = event.result as T;
        this.ready = true;
        continue;
      }
      if (event.type !== "progress" || !["reading", "preparing", "saving"].includes(event.stage)
        || typeof event.progress !== "number" || !Number.isFinite(event.progress)) {
        throw new Error("Invalid source progress");
      }
      this.progress = Math.max(this.progress, Math.min(99, Math.floor(event.progress)));
      this.onProgress({
        stage: event.stage,
        progress: this.progress,
        ...(typeof event.upload_id === "string" ? { uploadId: event.upload_id } : {}),
      });
    }
  }

  /** Called once with the final, complete response body. */
  finish(text: string): T {
    this.read(text);
    if (!this.ready || text.slice(this.offset).trim()) {
      throw new Error("Source preparation was interrupted. Refresh sources before retrying.");
    }
    return this.result!;
  }
}
