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

  /** Read the JWT from sessionStorage (set by auth-store). */
  private authHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = sessionStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
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
        .then((res) => (res.ok ? res.json() : Promise.reject(this.handleUnauthorized(res))))
        .then(resolve)
        .catch(reject);
    });
  }

  find<T>(param: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(param), {
        method: "GET",
        headers: { "Content-Type": "application/json", ...this.authHeader() },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(this.handleUnauthorized(res))))
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
        .then((res) => (res.ok ? res.json() : Promise.reject(this.handleUnauthorized(res))))
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
        .then((res) => (res.ok ? res.json() : Promise.reject(this.handleUnauthorized(res))))
        .then(resolve)
        .catch(reject);
    });
  }

  delete<T>(id: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...this.authHeader() },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(this.handleUnauthorized(res))))
        .then(resolve)
        .catch(reject);
    });
  }
}
