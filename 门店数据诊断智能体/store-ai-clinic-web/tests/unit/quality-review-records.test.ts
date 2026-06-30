import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { appendReviewRecord, listReviewRecords } from "@/features/quality/lib/review-records";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("quality review records", () => {
  it("appends human review decisions and reads them back in order", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quality-reviews-"));
    tempRoots.push(root);
    const logPath = path.join(root, "reviews.jsonl");

    await appendReviewRecord(
      {
        issueId: "issue-privacy-signature",
        decision: "confirmed",
        reviewer: "人工复核员A",
        note: "身份证号需要进入第二阶段脱敏清单",
        evidence: "王五_体检报告.pdf 第 2 页",
      },
      { filePath: logPath, now: new Date("2026-06-26T09:00:00Z") },
    );
    await appendReviewRecord(
      {
        issueId: "issue-page-boundary",
        decision: "disputed",
        reviewer: "人工复核员B",
        note: "页眉重叠可能是转图误差",
        evidence: "李四_体检报告.pdf 第 1 页",
      },
      { filePath: logPath, now: new Date("2026-06-26T09:03:00Z") },
    );

    expect(await listReviewRecords({ filePath: logPath })).toEqual([
      expect.objectContaining({
        issueId: "issue-privacy-signature",
        decision: "confirmed",
        reviewer: "人工复核员A",
        reviewedAt: "2026-06-26T09:00:00.000Z",
      }),
      expect.objectContaining({
        issueId: "issue-page-boundary",
        decision: "disputed",
        note: "页眉重叠可能是转图误差",
        reviewedAt: "2026-06-26T09:03:00.000Z",
      }),
    ]);
  });
});
