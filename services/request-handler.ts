export default class RequestHandler {
  private url: string;
  private baseUrl: string;

  constructor(url: string) {
    this.url = url;
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
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
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  find<T>(param: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(param), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  store<T>(body: Record<string, unknown> | FormData): Promise<T> {
    const isFormData = body instanceof FormData;
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(), {
        method: "POST",
        headers: isFormData
          ? undefined
          : { "Content-Type": "application/json" },
        body: isFormData ? body : JSON.stringify(body),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  update<T>(id: string, body: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then(resolve)
        .catch(reject);
    });
  }

  delete<T>(id: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then(resolve)
        .catch(reject);
    });
  }
}
