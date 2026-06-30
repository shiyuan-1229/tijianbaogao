import { describe, expect, it } from "vitest";

import { ApiError } from "@/shared/api/errors";
import { createApiClient } from "@/shared/api/client";

describe("api client", () => {
  it("returns undefined for a successful empty JSON response body", async () => {
    const client = createApiClient({
      baseUrl: "http://example.test",
      fetchImpl: async () =>
        new Response("", {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
    });

    await expect(client.get("/empty-json")).resolves.toBeUndefined();
  });

  it("returns text for a successful non-JSON response body", async () => {
    const client = createApiClient({
      baseUrl: "http://example.test",
      fetchImpl: async () =>
        new Response("ok", {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
          },
        }),
    });

    await expect(client.get("/plain-text")).resolves.toBe("ok");
  });

  it("rejects when a successful JSON response body is malformed", async () => {
    const client = createApiClient({
      baseUrl: "http://example.test",
      fetchImpl: async () =>
        new Response("{", {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
    });

    await expect(client.get("/broken-success")).rejects.toThrow(
      "Failed to parse JSON response",
    );
  });

  it("wraps malformed JSON error payloads in ApiError", async () => {
    const client = createApiClient({
      baseUrl: "http://example.test",
      fetchImpl: async () =>
        new Response("{", {
          status: 500,
          statusText: "Internal Server Error",
          headers: {
            "content-type": "application/json",
          },
        }),
    });

    await expect(client.get("/broken-error")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      data: undefined,
    } satisfies Partial<ApiError>);
  });

  it("aborts requests that exceed the configured timeout", async () => {
    const client = createApiClient({
      baseUrl: "http://example.test",
      fetchImpl: async (_url, init) => {
        const signal = init?.signal as AbortSignal | undefined;

        return await new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new Error("aborted by timeout"));
          });
        });
      },
    });

    await expect(
      client.get("/timeout", { timeoutMs: 10 }),
    ).rejects.toThrow("aborted by timeout");
  });
});
