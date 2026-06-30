import path from "node:path";

import { NextResponse } from "next/server";

import { appendReviewRecord, listReviewRecords, type ReviewRecordInput } from "@/features/quality/lib/review-records";

const REVIEW_LOG_PATH = path.join(process.cwd(), ".tmp", "quality-review-records.jsonl");

export async function GET() {
  const records = await listReviewRecords({ filePath: REVIEW_LOG_PATH });
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ReviewRecordInput>;
  if (!body.issueId || !body.decision || !body.reviewer || !body.evidence) {
    return NextResponse.json({ error: "issueId, decision, reviewer, and evidence are required" }, { status: 400 });
  }

  const record = await appendReviewRecord(
    {
      issueId: body.issueId,
      decision: body.decision,
      reviewer: body.reviewer,
      note: body.note ?? "",
      evidence: body.evidence,
    },
    { filePath: REVIEW_LOG_PATH },
  );

  return NextResponse.json(record, { status: 201 });
}
