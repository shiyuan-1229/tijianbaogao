import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const QUALITY_SCAN_TIMEOUT_MS = 180000;

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

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

export async function POST(_request: Request, context: RouteContext) {
  const { taskId } = await context.params;

  try {
    const response = await serverApiClient.post(`/api/quality/imports/${encodeURIComponent(taskId)}/scan`, undefined, {
      cache: "no-store",
      timeoutMs: QUALITY_SCAN_TIMEOUT_MS,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Quality-Scan-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to start quality scan.");
  }
}

