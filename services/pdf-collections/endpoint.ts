import { ENDPOINT } from "@/services/endpoint";

export const PDF_COLLECTIONS_ENDPOINT = {
  BASE: ENDPOINT.PDF_COLLECTIONS,
  UPLOAD: "upload",
  UPLOAD_FROM_URLS: "upload-from-urls",
  UPLOADS: "uploads",
  ACTIVATE: "activate",
  MOVE_TO_FOLDER: "move-to-folder",
  TEXT_CONTENT: "text-content",
} as const;
