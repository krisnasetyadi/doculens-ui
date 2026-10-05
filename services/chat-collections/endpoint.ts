import { ENDPOINT } from "@/services/endpoint";

export const CHAT_COLLECTIONS_ENDPOINT = {
  BASE: ENDPOINT.CHAT_COLLECTIONS,
  UPLOAD: "upload",
  UPLOADS: "uploads",
  ACTIVATE: "activate",
  MOVE_TO_FOLDER: "move-to-folder",
  MESSAGES: "messages",
} as const;
