import { NextResponse } from "next/server";

import { publicEnv } from "@/shared/config/env";

function backendExportUrl(taskId: string) {
  const baseUrl = publicEnv.apiBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/api/quality/exports/${encodeURIComponent(taskId)}/download`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await context.params;
  const response = await fetch(backendExportUrl(taskId), { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json(
      { detail: "Quality export bundle not found." },
      { status: response.status },
    );
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");
  const contentDisposition = response.headers.get("content-disposition");
  if (contentType) headers.set("Content-Type", contentType);
  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
  headers.set("Cache-Control", "private, no-store");

  return new Response(response.body, {
    status: 200,
    headers,
  });
}
