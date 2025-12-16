import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

// API Instances
export const HealthApi = new RequestHandler(ENDPOINT.HEALTH);
export const AvailableModelsApi = new RequestHandler(ENDPOINT.AVAILABLE_MODELS);
export const HybridQueryApi = new RequestHandler(ENDPOINT.HYBRID_QUERY);
export const PdfUploadApi = new RequestHandler(ENDPOINT.PDF_UPLOAD);
export const PdfCollectionsApi = new RequestHandler(ENDPOINT.PDF_COLLECTIONS);
export const PdfCollectionApi = new RequestHandler(ENDPOINT.PDF_COLLECTION);
export const ChatUploadApi = new RequestHandler(ENDPOINT.CHAT_UPLOAD);
export const ChatCollectionsApi = new RequestHandler(ENDPOINT.CHAT_COLLECTIONS);
export const ChatCollectionApi = new RequestHandler(ENDPOINT.CHAT_COLLECTION);
