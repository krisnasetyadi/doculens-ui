import { getAuthHeader } from "@/stores/auth-store";
import { UploadProgressStream, type SourceUploadProgress } from "./upload-progress";

export default class RequestHandler {
  private url: string;
  private baseUrl: string;

  constructor(url: string) {
    this.url = url;
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
      console.warn(
        "[RequestHandler] NEXT_PUBLIC_API_URL is not set — falling back to http://127.0.0.1:8000. " +
        "Set this env var in Vercel dashboard to point to your API server."
      );
    }
  }

  /** Read the JWT via the shared auth-store resolver (sessionStorage, falling back to the auth cookie). */
  private authHeader(): Record<string, string> {
    return getAuthHeader();
  }

  /** Expired/invalid token: clear it and send the user back to login. */
  private handleUnauthorized(res: Response): Response {
    if (res.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem("access_token");
      document.cookie = "access_token=; path=/; max-age=0";
      window.location.href = "/login";
    }
    return res;
  }

  /** Turn a non-ok response into a rejected Error carrying the backend's own message. */
  private async rejectWithError(res: Response): Promise<never> {
    this.handleUnauthorized(res);
    let detail = res.statusText || "Request failed";
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (typeof body?.message === "string") detail = body.message;
    } catch {
      // response body wasn't JSON — keep the status-text fallback
    }
    throw new Error(detail);
  }

  private buildUrl(endpoint?: string, params?: Record<string, unknown>) {
    const url = new URL(
      `${this.baseUrl}/${this.url}${endpoint ? `/${endpoint}` : ""}`
    );
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  get<T>(params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(undefined, params), {
        method: "GET",
        headers: { "Content-Type": "application/json", ...this.authHeader() },
      })
        .then((res) => (res.ok ? res.json() : this.rejectWithError(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  find<T>(param: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(param, params), {
        method: "GET",
        headers: { "Content-Type": "application/json", ...this.authHeader() },
      })
        .then((res) => (res.ok ? res.json() : this.rejectWithError(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  store<T>(body: Record<string, unknown> | FormData, params?: Record<string, unknown>): Promise<T> {
    const isFormData = body instanceof FormData;
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(undefined, params), {
        method: "POST",
        headers: isFormData
          ? { ...this.authHeader() }
          : { "Content-Type": "application/json", ...this.authHeader() },
        body: isFormData ? body : JSON.stringify(body),
      })
        .then((res) => (res.ok ? res.json() : this.rejectWithError(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  /** POST to a nested sub-path under this resource's base — e.g.
   * `TelegramApi.sync(id, body)` for endpoints that don't fit the flat
   * "POST to base" shape `store()` assumes. Mirrors `store()`'s FormData
   * support so file uploads can live at a sub-path too (e.g. upload). */
  storeAt<T>(endpoint: string, body: Record<string, unknown> | FormData, params?: Record<string, unknown>): Promise<T> {
    const isFormData = body instanceof FormData;
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(endpoint, params), {
        method: "POST",
        headers: isFormData
          ? { ...this.authHeader() }
          : { "Content-Type": "application/json", ...this.authHeader() },
        body: isFormData ? body : JSON.stringify(body),
      })
        .then((res) => (res.ok ? res.json() : this.rejectWithError(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  update<T>(id: string, body: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...this.authHeader() },
        body: JSON.stringify(body),
      })
        .then((res) => (res.ok ? res.json() : this.rejectWithError(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  /** Upload FormData and stream a coarse loading-bar progress (stage +
   * percent) from the backend's NDJSON response, via XHR since `fetch` has
   * no way to read a response body as it arrives. */
  uploadSourceAt<T>(
    endpoint: string,
    body: FormData,
    onProgress: (update: SourceUploadProgress) => void,
    params?: Record<string, unknown>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const stream = new UploadProgressStream<T>(onProgress);
      let settled = false;
      const isStreaming = () => xhr.getResponseHeader("Content-Type")?.includes("application/x-ndjson");

      xhr.onprogress = () => {
        if (settled || xhr.status < 200 || xhr.status >= 300 || !isStreaming()) return;
        try {
          stream.read(xhr.responseText);
        } catch (error) {
          settled = true;
          reject(error);
          xhr.abort();
        }
      };
      xhr.onload = () => {
        if (settled) return;
        settled = true;
        try {
          if (xhr.status === 0) throw new Error("Upload failed");
          if (xhr.status < 200 || xhr.status >= 300) {
            this.rejectWithError(new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
            })).catch(reject);
            return;
          }
          resolve(isStreaming() ? stream.finish(xhr.responseText) : (JSON.parse(xhr.responseText) as T));
        } catch (error) {
          reject(error);
        }
      };
      xhr.onerror = () => {
        if (!settled) { settled = true; reject(new Error("Upload failed")); }
      };
      xhr.onabort = () => {
        if (!settled) { settled = true; reject(new Error("Upload cancelled")); }
      };

      xhr.open("POST", this.buildUrl(endpoint, { ...params, stream_progress: true }));
      Object.entries(this.authHeader()).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.send(body);
    });
  }

  delete<T>(id: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...this.authHeader() },
      })
        .then((res) => (res.ok ? res.json() : this.rejectWithError(res)))
        .then(resolve)
        .catch(reject);
    });
  }
}
