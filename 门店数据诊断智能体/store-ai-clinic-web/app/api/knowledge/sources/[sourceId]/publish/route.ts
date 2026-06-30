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

type PublishRouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function POST(
  _request: Request,
  { params }: PublishRouteContext,
) {
  try {
    const { sourceId } = await params;
    const response = await serverApiClient.post(
      `/api/knowledge/sources/${encodeURIComponent(sourceId)}/publish`,
      undefined,
      {
        cache: "no-store",
        timeoutMs: KNOWLEDGE_ROUTE_TIMEOUT_MS,
      },
    );

    return NextResponse.json(response, {
      status: 200,
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
      ? "Knowledge publish request timed out."
      : error instanceof Error
        ? error.message
        : "Unable to publish the knowledge source.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
