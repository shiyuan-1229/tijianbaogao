import { publicEnv } from "@/shared/config/env";
import { buildApiError } from "@/shared/api/errors";

export type RequestBody = BodyInit | Record<string, unknown> | undefined;

type RequestJsonOptions = Omit<RequestInit, "body"> & {
  baseUrl?: string;
  body?: RequestBody;
  timeoutMs?: number;
};

type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isBodyInit(value: RequestBody): value is BodyInit {
  return (
    typeof value === "string" ||
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof ReadableStream
  );
}

function buildRequestInit(options: RequestJsonOptions): RequestInit {
  const { body } = options;
  const headers = new Headers(options.headers);
  const initOptions = {
    ...options,
  } as RequestInit & {
    body?: RequestBody;
    timeoutMs?: number;
    baseUrl?: string;
  };

  delete initOptions.body;
  delete initOptions.timeoutMs;
  delete initOptions.baseUrl;

  const init: RequestInit = {
    ...initOptions,
    headers,
  };

  if (body === undefined) {
    return init;
  }

  if (isBodyInit(body)) {
    init.body = body;
    return init;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  init.body = JSON.stringify(body);
  return init;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON response from ${response.url || "request"}`,
        { cause: error },
      );
    }
  }

  return text as T;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? publicEnv.apiBaseUrl;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async request<T>(path: string, init: RequestJsonOptions = {}): Promise<T> {
      const url = joinUrl(init.baseUrl ?? baseUrl, path);
      const controller =
        init.timeoutMs && init.timeoutMs > 0 ? new AbortController() : null;
      const timeoutId =
        controller && init.timeoutMs
          ? setTimeout(() => controller.abort(), init.timeoutMs)
          : null;

      try {
        const response = await fetchImpl(
          url,
          buildRequestInit({
            ...init,
            signal: init.signal ?? controller?.signal,
          }),
        );

        if (!response.ok) {
          throw await buildApiError(response);
        }

        return parseJsonResponse<T>(response);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    },
    get<T>(path: string, init: Omit<RequestJsonOptions, "method"> = {}) {
      return this.request<T>(path, { ...init, method: "GET" });
    },
    post<TResponse, TBody extends RequestBody = RequestBody>(
      path: string,
      body?: TBody,
      init: Omit<RequestJsonOptions, "body" | "method"> = {},
    ) {
      return this.request<TResponse>(path, { ...init, method: "POST", body });
    },
    patch<TResponse, TBody extends RequestBody = RequestBody>(
      path: string,
      body?: TBody,
      init: Omit<RequestJsonOptions, "body" | "method"> = {},
    ) {
      return this.request<TResponse>(path, { ...init, method: "PATCH", body });
    },
    delete<TResponse>(path: string, init: Omit<RequestJsonOptions, "method"> = {}) {
      return this.request<TResponse>(path, { ...init, method: "DELETE" });
    },
  };
}

export const apiClient = createApiClient();
