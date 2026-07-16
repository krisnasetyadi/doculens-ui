export enum ENDPOINT {
  // Auth
  AUTH_REGISTER       = "api/v1/auth/register",
  AUTH_LOGIN          = "api/v1/auth/login",
  AUTH_ME             = "api/v1/auth/me",
  AUTH_CHANGE_PW      = "api/v1/auth/change-password",
  AUTH_ADMIN_RESET_PW = "api/v1/auth/admin/reset-password",

  // Health
  HEALTH = "health",

  // Models
  AVAILABLE_MODELS = "api/v1/models/available",

  // Hybrid Search
  HYBRID_QUERY = "api/v1/agnostic/query",

  // PDF
  PDF_UPLOAD = "api/v1/upload",
  PDF_UPLOAD_FROM_URL = "api/v1/upload-from-url",
  PDF_UPLOAD_FROM_URLS = "api/v1/upload-from-urls",
  DRIVE_FOLDER_ITEMS = "api/v1/drive/folder-items",
  PDF_COLLECTIONS = "api/v1/collections",
  PDF_COLLECTION = "api/v1/collection",
  PDF_COLLECTION_ACTIVATE = "api/v1/pdf-collection/activate",

  // Public Links
  PUBLIC_LINKS = "api/v1/public-links",
  PUBLIC_LINK = "api/v1/public-link",
  PUBLIC_LINK_ACTIVATE = "api/v1/public-link/activate",

  // Chat
  CHAT_UPLOAD = "api/v1/chat/upload",
  CHAT_COLLECTIONS = "api/v1/chat/collections",
  CHAT_COLLECTION = "api/v1/chat/collection",
  CHAT_COLLECTION_PREVIEW = "api/v1/chat/collection",
  CHAT_COLLECTION_ACTIVATE = "api/v1/chat-collection/activate",

  // Sessions (chat history)
  SESSIONS = "api/v1/sessions",

  // Database (legacy, single fixed app DB — kept for backward compatibility)
  DB_TABLES = "api/v1/database/tables",
  DB_TABLE = "api/v1/database/table",

  // Database Connections (user-connected external databases)
  DATABASE_CONNECTIONS = "api/v1/database-connections",
  DATABASE_CONNECTION = "api/v1/database-connection",
  DATABASE_CONNECTION_ACTIVATE = "api/v1/database-connection/activate",
}
