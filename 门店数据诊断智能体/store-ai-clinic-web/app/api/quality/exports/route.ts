import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const QUALITY_EXPORT_TIMEOUT_MS = 180000;

function buildBackendErrorResponse(error: unknown, fallbackMessage: string) {
  if (isApiError(error)) {
    return NextResponse.json(error.data ?? { detail: error.message }, {
      status: error.status,
    });
  }

  return NextResponse.json(
    { detail: error instanceof Error ? error.message : fallbackMessage },
    { status: 502 },
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { detail: "Expected JSON body with export_type and dataset_path." },
      { status: 400 },
    );
  }

  if (typeof body.export_type !== "string" || typeof body.dataset_path !== "string") {
    return NextResponse.json(
      { detail: "export_type and dataset_path are required." },
      { status: 400 },
    );
  }

  try {
    const response = await serverApiClient.post<Record<string, unknown>>("/api/quality/exports", body, {
      cache: "no-store",
      timeoutMs: QUALITY_EXPORT_TIMEOUT_MS,
    });

    const payload = {
      ...response,
      download_url:
        typeof response.id === "string"
          ? `/api/quality/exports/${response.id}/download`
          : response.download_url,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "X-Quality-Export-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to create quality export.");
  }
}
