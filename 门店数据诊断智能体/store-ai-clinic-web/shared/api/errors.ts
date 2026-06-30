export class ApiError extends Error {
  status: number;
  statusText: string;
  url: string;
  data?: unknown;

  constructor({
    status,
    statusText,
    url,
    data,
  }: {
    status: number;
    statusText: string;
    url: string;
    data?: unknown;
  }) {
    super(`API request failed with ${status} ${statusText}: ${url}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.data = data;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function buildApiError(response: Response): Promise<ApiError> {
  const data = await parseErrorPayload(response);

  return new ApiError({
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    data,
  });
}

async function parseErrorPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  }

  return text || undefined;
}
