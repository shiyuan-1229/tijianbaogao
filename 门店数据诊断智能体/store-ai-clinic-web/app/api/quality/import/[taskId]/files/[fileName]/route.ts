import { NextResponse } from "next/server";

import { publicEnv } from "@/shared/config/env";

function backendFileUrl(taskId: string, fileName: string) {
  const baseUrl = publicEnv.apiBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/api/quality/imports/${encodeURIComponent(taskId)}/files/${encodeURIComponent(fileName)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string; fileName: string }> },
) {
  const { taskId, fileName } = await context.params;
  const response = await fetch(backendFileUrl(taskId, fileName), { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json(
      { detail: "Quality import file not found." },
      { status: response.status },
    );
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");
  if (contentType) headers.set("Content-Type", contentType);
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Cache-Control", "private, no-store");

  return new Response(response.body, {
    status: 200,
    headers,
  });
}