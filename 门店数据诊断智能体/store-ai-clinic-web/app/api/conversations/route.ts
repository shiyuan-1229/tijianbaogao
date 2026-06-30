import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { endpoints } from "@/shared/api/endpoints";
import { serverApiClient } from "@/shared/api/server-client";
import type { RequestBody } from "@/shared/api/client";

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

function buildConversationListPath(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.toString();

  return search ? `${endpoints.conversations}?${search}` : endpoints.conversations;
}

export async function GET(request: Request) {
  try {
    const response = await serverApiClient.get(buildConversationListPath(request), {
      cache: "no-store",
      timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS,
    });

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
      ? "Conversation request timed out."
      : error instanceof Error
        ? error.message
        : "Unable to reach the conversation service.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
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

    const response = await serverApiClient.post(endpoints.conversations, payload, {
      cache: "no-store",
      timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS,
    });

    return NextResponse.json(response, {
      status: 201,
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
      ? "Conversation creation timed out."
      : error instanceof Error
        ? error.message
        : "Unable to create the conversation.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
