import { NextResponse } from "next/server";

import { isApiError } from "@/shared/api/errors";
import { serverApiClient } from "@/shared/api/server-client";

const REVIEWS_RESUME_ENDPOINT = "/api/reviews/resume";
const REVIEW_RESOLUTIONS = ["approved", "updated", "rejected"] as const;

type ReviewResolution = (typeof REVIEW_RESOLUTIONS)[number];

type ConfirmRequestDto = {
  task_id: string;
  resolution: ReviewResolution;
  remark: string;
};

type ConfirmResponseDto = ConfirmRequestDto & {
  resume_from_checkpoint: boolean;
  data_source: "backend";
  backend_route: typeof REVIEWS_RESUME_ENDPOINT;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isReviewResolution(value: unknown): value is ReviewResolution {
  return REVIEW_RESOLUTIONS.includes(value as ReviewResolution);
}

function parseConfirmRequest(value: unknown): ConfirmRequestDto | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ConfirmRequestDto>;

  if (
    !isNonEmptyString(candidate.task_id) ||
    !isReviewResolution(candidate.resolution) ||
    !isNonEmptyString(candidate.remark)
  ) {
    return null;
  }

  return {
    task_id: candidate.task_id.trim(),
    resolution: candidate.resolution,
    remark: candidate.remark.trim(),
  };
}

export async function POST(request: Request) {
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

    const payload = parseConfirmRequest(rawPayload);

    if (!payload) {
      return NextResponse.json(
        {
          detail:
            "Invalid confirmation request. task_id, resolution, and remark are required.",
        },
        { status: 400 },
      );
    }

    const response = await serverApiClient.post<
      Omit<ConfirmResponseDto, "backend_route" | "data_source">,
      ConfirmRequestDto
    >(REVIEWS_RESUME_ENDPOINT, payload, {
      cache: "no-store",
    });

    return NextResponse.json(
      {
        ...response,
        data_source: "backend",
        backend_route: REVIEWS_RESUME_ENDPOINT,
      } satisfies ConfirmResponseDto,
      {
        status: 200,
        headers: {
          "X-Agent-Confirm-Data-Source": "backend",
        },
      },
    );
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
        : "Unable to reach the review resume service.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
