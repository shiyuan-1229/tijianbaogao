import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const QUALITY_ACTION_TIMEOUT_MS = 30000;

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
  const datasetPath = searchParams.get("datasetPath") ?? searchParams.get("dataset_path");
  const query = datasetPath ? `?dataset_path=${encodeURIComponent(datasetPath)}` : "";

  try {
    const response = await serverApiClient.get(`/api/quality/actions${query}`, {
      cache: "no-store",
      timeoutMs: QUALITY_ACTION_TIMEOUT_MS,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Quality-Actions-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to load quality actions.");
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: "Expected JSON body." }, { status: 400 });
  }

  if (typeof body.action !== "string" || typeof body.label !== "string" || typeof body.page !== "string") {
    return NextResponse.json(
      { detail: "action, label, and page are required." },
      { status: 400 },
    );
  }

  try {
    const response = await serverApiClient.post("/api/quality/actions", body, {
      cache: "no-store",
      timeoutMs: QUALITY_ACTION_TIMEOUT_MS,
    });

    return NextResponse.json(response, {
      status: 201,
      headers: {
        "X-Quality-Actions-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to record quality action.");
  }
}