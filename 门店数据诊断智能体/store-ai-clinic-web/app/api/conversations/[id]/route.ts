import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { endpoints } from "@/shared/api/endpoints";
import { serverApiClient } from "@/shared/api/server-client";
import type { RequestBody } from "@/shared/api/client";

type ConversationRouteContext = {
  params: Promise<{ id: string }>;
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

function buildConversationPath(id: string) {
  return `${endpoints.conversations}/${encodeURIComponent(id)}`;
}

export async function PATCH(
  request: Request,
  { params }: ConversationRouteContext,
) {
  try {
    let payload: RequestBody;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { detail: "Malformed JSON request body." },
        { status: 400 },
      );
    }

    const { id } = await params;
    const response = await serverApiClient.patch(
      buildConversationPath(id),
      payload,
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
      ? "Conversation update timed out."
      : error instanceof Error
        ? error.message
        : "Unable to update the conversation.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: ConversationRouteContext,
) {
  try {
    const { id } = await params;
    await serverApiClient.delete(buildConversationPath(id), {
      cache: "no-store",
      timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS,
    });

    return new NextResponse(null, {
      status: 204,
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
      ? "Conversation deletion timed out."
      : error instanceof Error
        ? error.message
        : "Unable to delete the conversation.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
