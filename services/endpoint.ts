const API_V1 = "api/v1";

export const ENDPOINT = {
  // Auth
  AUTH: `${API_V1}/auth`,

  // Health
  HEALTH: "health",

  // Models
  AVAILABLE_MODELS: `${API_V1}/models/available`,

  // Hybrid Search
  HYBRID_QUERY: `${API_V1}/agnostic/query`,

  // PDF collections — list/upload/activate/delete all live under this one
  // prefix now; see PdfCollectionApi for the sub-paths (upload, activate, …).
  PDF_COLLECTIONS: `${API_V1}/pdf-collections`,

  // Public Links
  PUBLIC_LINKS: `${API_V1}/public-links`,

  // Chat collections
  CHAT_COLLECTIONS: `${API_V1}/chat-collections`,

  // Sessions (chat history)
  SESSIONS: `${API_V1}/sessions`,

  // Database Connections (user-connected external databases)
  DATABASE_CONNECTIONS: `${API_V1}/database-connections`,

  // Telegram (live chat connection — Telethon login, not a file upload)
  TELEGRAM_CONNECTIONS: `${API_V1}/telegram-connections`,

  // Skill: Reference Framework Gap Analysis
  GAP_ANALYSIS: `${API_V1}/analysis/gap-analysis`,

  // Payments (dummy/test-mode Stripe Checkout flow — MS-90)
  PAYMENTS: `${API_V1}/payments`,
} as const;
