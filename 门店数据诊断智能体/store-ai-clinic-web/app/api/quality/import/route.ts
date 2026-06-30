import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const QUALITY_IMPORT_TIMEOUT_MS = 30000;

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
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { detail: "Expected multipart/form-data with one or more quality files." },
      { status: 400 },
    );
  }

  try {
    const response = await serverApiClient.post("/api/quality/import", formData, {
      cache: "no-store",
      timeoutMs: QUALITY_IMPORT_TIMEOUT_MS,
    });

    return NextResponse.json(response, {
      status: 201,
      headers: {
        "X-Quality-Import-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to import quality files.");
  }
}
