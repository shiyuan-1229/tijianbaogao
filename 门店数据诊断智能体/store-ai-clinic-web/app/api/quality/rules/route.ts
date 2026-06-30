import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const QUALITY_RULES_TIMEOUT_MS = 30000;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const datasetPath = searchParams.get("datasetPath") ?? searchParams.get("dataset_path") ?? "";

  if (!datasetPath.trim()) {
    return NextResponse.json({ detail: "datasetPath is required." }, { status: 400 });
  }

  try {
    const response = await serverApiClient.get(
      `/api/quality/rules?dataset_path=${encodeURIComponent(datasetPath)}`,
      {
        cache: "no-store",
        timeoutMs: QUALITY_RULES_TIMEOUT_MS,
      },
    );

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Quality-Rules-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to load quality rules.");
  }
}
