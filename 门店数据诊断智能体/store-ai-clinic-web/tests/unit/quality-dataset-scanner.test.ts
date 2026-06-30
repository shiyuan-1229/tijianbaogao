import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanQualityDataset } from "@/features/quality/lib/dataset-scanner";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("quality dataset scanner", () => {
  it("scans age folders, PDF page counts, XLSX rows, and evidence-backed issues", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quality-dataset-"));
    tempRoots.push(root);

    const ageDir = path.join(root, "35-44");
    await writeFixtureFile(path.join(root, ".DS_Store"), "ignored");
    await writeFixtureFile(path.join(ageDir, "02250201.pdf"), pdfWithPages(4));
    await writeFixtureFile(path.join(ageDir, "02496056.pdf"), pdfWithPages(7));
    await writeFixtureFile(path.join(ageDir, "结构化数据.xlsx"), xlsxWithRows([
      ["ArchivesNum", "DepartmentName", "ItemGroupName", "ItemFlag", "ItemResultNum", "ItemResultChar", "Symbol", "stand", "CheckDate"],
      ["02250201", "检验科", "肝功", "ALT", "68", "偏高", "↑", "9-50", "2025-05-22"],
      ["02496056", "内科", "一般检查", "BMI", "24", "正常", "", "18.5-24.0", "2025-05-22"],
    ]));

    const result = await scanQualityDataset(root, { now: new Date("2026-06-26T08:00:00Z") });

    expect(result.datasetPath).toBe(root);
    expect(result.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "年龄段", value: "1" }),
        expect.objectContaining({ label: "PDF", value: "2" }),
        expect.objectContaining({ label: "Excel", value: "1" }),
      ]),
    );
    expect(result.pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "文件扫描", value: "2/2", done: true }),
        expect.objectContaining({ label: "Excel 解析", value: "1/1", done: true }),
        expect.objectContaining({ label: "PDF 转图", value: "0/2", active: true }),
      ]),
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "02250201.pdf",
          group: "35-44",
          archiveId: "02250201",
          ruleId: "R-FORMAT-002",
          evidence: expect.stringContaining("PDF 页数为 4"),
        }),
        expect.objectContaining({
          fileName: "结构化数据.xlsx",
          ruleId: "R-EXCEL-002",
          evidence: expect.stringContaining("ALT"),
        }),
        expect.objectContaining({
          fileName: "02250201.pdf",
          ruleId: "R-OCR-001",
          evidence: expect.stringContaining("未发现可用 OCR 工具"),
        }),
      ]),
    );
  });



  it("loads visual model findings from a PDF sidecar file by default", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quality-dataset-"));
    tempRoots.push(root);

    const ageDir = path.join(root, "35-44");
    await writeFixtureFile(path.join(ageDir, "02250201.pdf"), pdfWithPages(7));
    await writeFixtureFile(
      path.join(ageDir, "02250201.vision.json"),
      JSON.stringify({
        findings: [
          {
            page: 4,
            ruleId: "R-CONTENT-004",
            issueType: "\u7591\u4f3c\u7f3a\u5b57",
            category: "content",
            severity: "high",
            evidence: "\u7b2c4\u9875\u68c0\u9a8c\u9879\u540d\u79f0\u88ab\u626b\u63cf\u88c1\u5207\uff0c\u89c6\u89c9\u6a21\u578b\u6807\u8bb0\u4e3a\u7591\u4f3c\u7f3a\u5b57\u3002",
            aiJudgement: "\u89c6\u89c9\u6a21\u578b\u5224\u65ad\u9875\u9762\u5b58\u5728\u5185\u5bb9\u88c1\u5207",
            recommendation: "\u8fdb\u5165\u4eba\u5de5\u590d\u6838\uff0c\u6838\u5bf9 PDF \u539f\u56fe\u548c OCR \u8bc1\u636e\u3002",
            confidence: 0.88
          }
        ]
      }),
    );

    const result = await scanQualityDataset(root, { now: new Date("2026-06-26T08:00:00Z") });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "02250201.pdf",
          page: "4",
          ruleId: "R-CONTENT-004",
          issueType: "\u7591\u4f3c\u7f3a\u5b57",
          evidence: expect.stringContaining("\u89c6\u89c9\u6a21\u578b"),
        }),
      ]),
    );
    expect(result.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: "02250201.pdf", ruleId: "R-OCR-001" }),
      ]),
    );
  });
  it("loads OCR evidence from a PDF sidecar file by default", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quality-dataset-"));
    tempRoots.push(root);

    const ageDir = path.join(root, "35-44");
    await writeFixtureFile(path.join(ageDir, "02250201.pdf"), pdfWithPages(7));
    await writeFixtureFile(
      path.join(ageDir, "02250201.ocr.json"),
      JSON.stringify({
        pages: [
          {
            page: 3,
            text: "\u59d3\u540d\uff1a\u674e\u56db \u624b\u673a\u53f7\uff1a13900139000",
            confidence: 0.89,
            blocks: [{ text: "\u624b\u673a\u53f7\uff1a13900139000", confidence: 0.9 }],
          },
        ],
      }),
    );

    const result = await scanQualityDataset(root, { now: new Date("2026-06-26T08:00:00Z") });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "02250201.pdf",
          page: "3",
          ruleId: "R-PRIVACY-003",
          evidence: expect.stringContaining("\u624b\u673a\u53f7"),
        }),
      ]),
    );
    expect(result.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: "02250201.pdf", ruleId: "R-OCR-001" }),
      ]),
    );
  });
  it("uses OCR page evidence to create reviewable PDF findings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quality-dataset-"));
    tempRoots.push(root);

    const ageDir = path.join(root, "35-44");
    await writeFixtureFile(path.join(ageDir, "02250201.pdf"), pdfWithPages(7));

    const result = await scanQualityDataset(root, {
      now: new Date("2026-06-26T08:00:00Z"),
      ocrProvider: {
        async extractPdf(filePath) {
          expect(filePath).toContain("02250201.pdf");
          return [
            {
              page: 2,
              text: "姓名：张三 身份证号：110101199001011234 手机号：13800138000",
              confidence: 0.93,
              blocks: [
                { text: "身份证号：110101199001011234", confidence: 0.94 },
                { text: "手机号：13800138000", confidence: 0.91 },
              ],
            },
          ];
        },
      },
    });

    expect(result.pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "PDF 转图", value: "1/1", done: true, active: false }),
        expect.objectContaining({ label: "AI 评审", value: "OCR 证据已生成", done: true }),
      ]),
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "02250201.pdf",
          page: "2",
          ruleId: "R-PRIVACY-003",
          issueType: "疑似未脱敏",
          evidence: expect.stringContaining("身份证号"),
        }),
      ]),
    );
    expect(result.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "02250201.pdf",
          ruleId: "R-OCR-001",
          evidence: expect.stringContaining("未发现可用 OCR 工具"),
        }),
      ]),
    );
  });
});

async function writeFixtureFile(filePath: string, content: Buffer | string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

function pdfWithPages(pageCount: number) {
  const pages = Array.from({ length: pageCount }, (_, index) => `${index + 1} 0 obj\n<< /Type /Page >>\nendobj`).join("\n");
  return Buffer.from(`%PDF-1.4\n${pages}\n%%EOF`);
}

function xlsxWithRows(rows: string[][]) {
  const values = Array.from(new Set(rows.flat()));
  const sharedStrings = `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${values.map((value) => `<si><t>${escapeXml(value)}</t></si>`).join("")}</sst>`;
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, cellIndex) => {
          const column = String.fromCharCode("A".charCodeAt(0) + cellIndex);
          return `<c r="${column}${rowIndex + 1}" t="s"><v>${values.indexOf(value)}</v></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;

  return zipStore({
    "xl/sharedStrings.xml": Buffer.from(sharedStrings),
    "xl/worksheets/sheet1.xml": Buffer.from(sheet),
  });
}

function zipStore(entries: Record<string, Buffer>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [name, data] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localDirectory.length, 16);

  return Buffer.concat([localDirectory, centralDirectory, end]);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
