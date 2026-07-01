import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const QUALITY_REVIEW_TIMEOUT_MS = 30000;

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
    const response = await serverApiClient.get(`/api/quality/reviews${query}`, {
      cache: "no-store",
      timeoutMs: QUALITY_REVIEW_TIMEOUT_MS,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Quality-Reviews-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to load quality reviews.");
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: "Expected JSON body." }, { status: 400 });
  }

  const issueId = typeof body.issue_id === "string" ? body.issue_id : typeof body.issueId === "string" ? body.issueId : "";
  const decision = typeof body.decision === "string" ? body.decision : "";
  const reviewer = typeof body.reviewer === "string" ? body.reviewer : "operator";
  const note =
    typeof body.note === "string"
      ? body.note
      : typeof body.message === "string"
        ? body.message
        : "";
  const evidence = typeof body.evidence === "string" ? body.evidence : "";
  const datasetPath =
    typeof body.dataset_path === "string"
      ? body.dataset_path
      : typeof body.datasetPath === "string"
        ? body.datasetPath
        : undefined;

  if (!issueId || !decision || !evidence) {
    return NextResponse.json(
      { detail: "issue_id, decision, and evidence are required." },
      { status: 400 },
    );
  }

  try {
    const response = await serverApiClient.post(
      "/api/quality/reviews",
      {
        issue_id: issueId,
        decision,
        reviewer,
        note: note || decision,
        evidence,
        dataset_path: datasetPath,
      },
      {
        cache: "no-store",
        timeoutMs: QUALITY_REVIEW_TIMEOUT_MS,
      },
    );

    return NextResponse.json(response, {
      status: 201,
      headers: {
        "X-Quality-Reviews-Data-Source": "backend",
      },
    });
  } catch (error) {
    return buildBackendErrorResponse(error, "Unable to record quality review.");
  }
}
