export enum ENDPOINT {
  // Health
  HEALTH = "health",

  // Models
  AVAILABLE_MODELS = "api/v1/models/available",

  // Hybrid Search
  WITH_ENHANCED = "/enhanced",
  HYBRID_QUERY = "api/v1/query/hybrid" + WITH_ENHANCED,

  // PDF
  PDF_UPLOAD = "api/v1/upload",
  PDF_COLLECTIONS = "api/v1/collections",
  PDF_COLLECTION = "api/v1/collection",

  // Chat
  CHAT_UPLOAD = "api/v1/chat/upload",
  CHAT_COLLECTIONS = "api/v1/chat/collections",
  CHAT_COLLECTION = "api/v1/chat/collection",
}
