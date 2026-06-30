import { NextRequest, NextResponse } from "next/server";

import type {
  DiagnosisRunRequestDto,
  DiagnosisRunResponseDto,
} from "@/entities/agent/types";
import { isApiError } from "@/shared/api/errors";
import { endpoints } from "@/shared/api/endpoints";
import { serverApiClient } from "@/shared/api/server-client";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDiagnosisRunRequest(value: unknown): DiagnosisRunRequestDto | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DiagnosisRunRequestDto>;

  if (
    !isNonEmptyString(candidate.task_id) ||
    !isNonEmptyString(candidate.store_id) ||
    !isNonEmptyString(candidate.context) ||
    (candidate.diagnosis_type !== "daily" &&
      candidate.diagnosis_type !== "weekly")
  ) {
    return null;
  }

  return {
    task_id: candidate.task_id.trim(),
    store_id: candidate.store_id.trim(),
    diagnosis_type: candidate.diagnosis_type,
    context: candidate.context.trim(),
  };
}

export async function POST(request: NextRequest) {
  try {
    let rawPayload: unknown;

    try {
      rawPayload = await request.json();
    } catch {
      return NextResponse.json(
        { detail: "Malformed JSON request body." },
        { status: 400 },
      );
    }

    const payload = parseDiagnosisRunRequest(rawPayload);

    if (!payload) {
      return NextResponse.json(
        {
          detail:
            "Invalid diagnosis request. task_id, store_id, diagnosis_type, and context are required.",
        },
        { status: 400 },
      );
    }

    const response = await serverApiClient.post<
      DiagnosisRunResponseDto,
      DiagnosisRunRequestDto
    >(endpoints.diagnosisRun, payload, {
      cache: "no-store",
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (isApiError(error)) {
      return NextResponse.json(
        error.data ?? { detail: error.message },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to reach the diagnosis service.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
