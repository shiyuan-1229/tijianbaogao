import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { endpoints } from "@/shared/api/endpoints";
import { serverApiClient } from "@/shared/api/server-client";

type ConversationSessionRouteContext = {
  params: Promise<{ sessionId: string }>;
};

const CONVERSATION_ROUTE_TIMEOUT_MS = 8000;

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

export async function GET(
  _request: Request,
  { params }: ConversationSessionRouteContext,
) {
  try {
    const { sessionId } = await params;
    const response = await serverApiClient.get(
      `${endpoints.conversationSessions}/${encodeURIComponent(sessionId)}`,
      { cache: "no-store", timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS },
    );

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Conversations-Data-Source": "backend",
      },
    });
  } catch (error) {
    if (isApiError(error)) {
      return NextResponse.json(error.data ?? { detail: error.message }, {
        status: error.status,
      });
    }

    const message = isAbortLikeError(error)
      ? "Conversation session request timed out."
      : error instanceof Error
        ? error.message
        : "Unable to load the conversation session.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
