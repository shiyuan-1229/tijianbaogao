import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type ReviewDecision = "confirmed" | "rejected" | "disputed" | "needs_review";

export type ReviewRecordInput = {
  issueId: string;
  decision: ReviewDecision;
  reviewer: string;
  note: string;
  evidence: string;
};

export type ReviewRecord = ReviewRecordInput & {
  reviewedAt: string;
};

type ReviewRecordOptions = {
  filePath: string;
  now?: Date;
};

export async function appendReviewRecord(input: ReviewRecordInput, options: ReviewRecordOptions): Promise<ReviewRecord> {
  const record: ReviewRecord = {
    ...input,
    reviewedAt: (options.now ?? new Date()).toISOString(),
  };

  await mkdir(path.dirname(options.filePath), { recursive: true });
  await appendFile(options.filePath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export async function listReviewRecords(options: Pick<ReviewRecordOptions, "filePath">): Promise<ReviewRecord[]> {
  try {
    const content = await readFile(options.filePath, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ReviewRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
