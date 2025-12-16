"use client";

import { useState, useCallback } from "react";
import {
  HealthApi,
  HybridQueryApi,
  PdfCollectionsApi,
  PdfUploadApi,
  PdfCollectionApi,
  ChatCollectionsApi,
  ChatUploadApi,
  ChatCollectionApi,
} from "@/services";
import type {
  HealthResponse,
  HybridResponse,
  HybridQueryRequest,
  PdfCollection,
  UploadResponse,
  ChatCollection,
  ChatUploadResponse,
  DeleteResponse,
} from "@/services";

// ===================== HEALTH =====================
export function useHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(() => {
    setLoading(true);
    setError(null);

    HealthApi.get<HealthResponse>()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err?.message || "Failed to check health");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { data, loading, error, check };
}

// ===================== HYBRID SEARCH =====================
export function useHybridSearch() {
  const [data, setData] = useState<HybridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback((request: HybridQueryRequest) => {
    setLoading(true);
    setError(null);

    HybridQueryApi.store<HybridResponse>(request as Record<string, unknown>)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err?.message || "Search failed");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, search, reset };
}

// ===================== PDF COLLECTIONS =====================
export function usePdfCollections() {
  const [data, setData] = useState<PdfCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);

    PdfCollectionsApi.get<PdfCollection[]>()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err?.message || "Failed to fetch PDF collections");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { data, loading, error, fetch };
}

// ===================== PDF UPLOAD =====================
export function usePdfUpload() {
  const [data, setData] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = useCallback((files: File[]) => {
    setLoading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    PdfUploadApi.store<UploadResponse>(formData)
      .then((res) => {
        setData(res);
        setProgress(100);
      })
      .catch((err) => {
        setError(err?.message || "Upload failed");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setProgress(0);
  }, []);

  return { data, loading, error, progress, upload, reset };
}

// ===================== PDF DELETE =====================
export function usePdfDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const remove = useCallback((collectionId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    PdfCollectionApi.delete<DeleteResponse>(collectionId)
      .then(() => {
        setSuccess(true);
      })
      .catch((err) => {
        setError(err?.message || "Delete failed");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { loading, error, success, remove };
}

// ===================== CHAT COLLECTIONS =====================
export function useChatCollections() {
  const [data, setData] = useState<ChatCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);

    ChatCollectionsApi.get<ChatCollection[]>()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err?.message || "Failed to fetch chat collections");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { data, loading, error, fetch };
}

// ===================== CHAT UPLOAD =====================
export function useChatUpload() {
  const [data, setData] = useState<ChatUploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    (file: File, platform: "whatsapp" | "teams" | "slack" = "whatsapp") => {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", platform);

      ChatUploadApi.store<ChatUploadResponse>(formData)
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          setError(err?.message || "Upload failed");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, upload, reset };
}

// ===================== CHAT DELETE =====================
export function useChatDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const remove = useCallback((collectionId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    ChatCollectionApi.delete<DeleteResponse>(collectionId)
      .then(() => {
        setSuccess(true);
      })
      .catch((err) => {
        setError(err?.message || "Delete failed");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { loading, error, success, remove };
}
