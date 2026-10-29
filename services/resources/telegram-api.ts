import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class TelegramApiHandler {
  private api = new RequestHandler(ENDPOINT.TELEGRAM_CONNECTIONS);

  list<T>() {
    return this.api.get<T>();
  }

  connectStart<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("connect/start", body);
  }

  connectVerify<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("connect/verify", body);
  }

  qrStart<T>(body: Record<string, unknown> = {}) {
    return this.api.storeAt<T>("connect/qr/start", body);
  }

  qrStatus<T>(flowId: string) {
    return this.api.find<T>("connect/qr/status", { flow_id: flowId });
  }

  qrCancel<T>(flowId: string) {
    return this.api.storeAt<T>("connect/qr/cancel", { flow_id: flowId });
  }

  dialogs<T>(id: string) {
    return this.api.find<T>(`${id}/dialogs`);
  }

  sync<T>(id: string, body: Record<string, unknown>) {
    return this.api.storeAt<T>(`${id}/sync`, body);
  }

  activate<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("activate", body);
  }

  delete<T>(id: string) {
    return this.api.delete<T>(id);
  }

  removeChat<T>(id: string, dialogId: string) {
    return this.api.delete<T>(`${id}/chats/${encodeURIComponent(dialogId)}`);
  }

  setChatRange<T>(id: string, dialogId: string, body: Record<string, unknown>) {
    return this.api.patchAt<T>(`${id}/chats/${encodeURIComponent(dialogId)}`, body);
  }
}

export const TelegramApi = new TelegramApiHandler();
