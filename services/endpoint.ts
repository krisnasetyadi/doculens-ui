export enum ENDPOINT {
  // Auth
  AUTH_REGISTER = "api/v1/auth/register",
  AUTH_LOGIN    = "api/v1/auth/login",
  AUTH_ME       = "api/v1/auth/me",

  // Health
  HEALTH = "health",

  // Models
  AVAILABLE_MODELS = "api/v1/models/available",

  // Hybrid Search
  HYBRID_QUERY = "api/v1/agnostic/query",

  // PDF
  PDF_UPLOAD = "api/v1/upload",
  PDF_COLLECTIONS = "api/v1/collections",
  PDF_COLLECTION = "api/v1/collection",

  // Chat
  CHAT_UPLOAD = "api/v1/chat/upload",
  CHAT_COLLECTIONS = "api/v1/chat/collections",
  CHAT_COLLECTION = "api/v1/chat/collection",

  // Sessions (chat history)
  SESSIONS = "api/v1/sessions",

  // Database
  DB_TABLES = "api/v1/database/tables",
  DB_TABLE = "api/v1/database/table",
}
