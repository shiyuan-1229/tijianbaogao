import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const KNOWLEDGE_ROUTE_TIMEOUT_MS = 8000;

function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("abort") ||
    message.includes("aborted") ||
    message.includes("timeout") ||
    message.includes("timed out")
  );
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { detail: "Expected multipart/form-data with a knowledge file." },
      { status: 400 },
    );
  }

  try {
    const response = await serverApiClient.post(
      "/api/knowledge/sources/upload",
      formData,
      {
        cache: "no-store",
        timeoutMs: KNOWLEDGE_ROUTE_TIMEOUT_MS,
      },
    );

    return NextResponse.json(response, {
      status: 201,
      headers: {
        "X-Knowledge-Data-Source": "backend",
      },
    });
  } catch (error) {
    if (isApiError(error)) {
      return NextResponse.json(error.data ?? { detail: error.message }, {
        status: error.status,
      });
    }

    const message = isAbortLikeError(error)
      ? "Knowledge upload request timed out."
      : error instanceof Error
        ? error.message
        : "Unable to upload the knowledge file.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
