/** GET /payments/storage/usage: what Settings > Storage and the Files-tab
 * meter show, plus the per-file and per-upload limits of the workspace plan. */
export interface StorageUsage {
  plan_name: string;
  used_bytes: number;
  limit_bytes: number;
  remaining_bytes: number;
  usage_percent: number;
  max_file_bytes: number;
  max_batch_files: number;
  blocked: boolean;
}
