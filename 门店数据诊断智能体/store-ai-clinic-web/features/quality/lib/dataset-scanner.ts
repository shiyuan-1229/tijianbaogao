import { createReadStream } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

import { createSidecarOcrProvider } from "@/features/quality/lib/sidecar-ocr-provider";
import { createSidecarVisionProvider } from "@/features/quality/lib/sidecar-vision-provider";

export type QualityMetric = {
  label: string;
  value: string;
  icon?: string;
  color?: string;
};

export type QualityPipelineStage = {
  label: string;
  value: string;
  done: boolean;
  active: boolean;
};

export type QualityIssueData = {
  id: string;
  index: number;
  fileName: string;
  group: string;
  archiveId: string;
  page: string;
  issueType: string;
  category: "privacy" | "content" | "format" | "history";
  severity: "high" | "medium" | "low";
  ruleId: string;
  evidence: string;
  aiJudgement: string;
  recommendation: string;
  confidence: number;
  status: "needs_review" | "ai_reviewing" | "disputed" | "confirmed" | "rejected";
  foundAt: string;
  previewUrl?: string;
  previewType?: "image" | "pdf" | "file";
  previewImageUrl?: string;
  previewImageUrls?: string[];
  previewPageCount?: number;
  findingType?: "data_error" | "missing_text" | "privacy_leak" | "history_gap" | "format" | "other";
  bbox?: [number, number, number, number];
};

export type QualityDatasetScan = {
  datasetPath: string;
  scannedAt: string;
  metrics: QualityMetric[];
  pipeline: QualityPipelineStage[];
  issues: QualityIssueData[];
};

export type OcrBlockEvidence = {
  text: string;
  bbox?: [number, number, number, number];
  confidence?: number;
};

export type OcrPageEvidence = {
  page: number;
  text: string;
  confidence: number;
  blocks: OcrBlockEvidence[];
};

export type OcrProvider = {
  extractPdf(filePath: string): Promise<OcrPageEvidence[]>;
};

export type VisionFindingEvidence = Omit<QualityIssueData, "id" | "fileName" | "group" | "archiveId" | "foundAt" | "status" | "index"> & {
  archiveId?: string;
};

export type VisionReviewProvider = {
  reviewPdf(filePath: string, context: { ocrPages: OcrPageEvidence[]; pageCount: number }): Promise<VisionFindingEvidence[]>;
};

type ScanOptions = { now?: Date; ocrProvider?: OcrProvider; visionProvider?: VisionReviewProvider };

type DatasetFile = {
  fullPath: string;
  name: string;
  extension: string;
  group: string;
};

const PAGE_TOKEN_CARRY_LENGTH = 32;

const defaultOcrProvider = createSidecarOcrProvider();
const defaultVisionProvider = createSidecarVisionProvider();

const REQUIRED_EXCEL_COLUMNS = [
  "ArchivesNum",
  "DepartmentName",
  "ItemGroupName",
  "ItemFlag",
  "ItemResultNum",
  "ItemResultChar",
  "Symbol",
  "stand",
  "CheckDate",
];

export async function scanQualityDataset(datasetPath: string, options: ScanOptions = {}): Promise<QualityDatasetScan> {
  const now = options.now ?? new Date();
  const ocrProvider = options.ocrProvider ?? defaultOcrProvider;
  const visionProvider = options.visionProvider ?? defaultVisionProvider;
  const files = await collectDatasetFiles(datasetPath);
  const groups = new Set(files.map((file) => file.group).filter(Boolean));
  const pdfFiles = files.filter((file) => file.extension === ".pdf");
  const xlsxFiles = files.filter((file) => file.extension === ".xlsx");
  const issues: QualityIssueData[] = [];
  let ocrProcessedPdfCount = 0;

  for (const pdfFile of pdfFiles) {
    const pageCount = await readPdfPageCount(pdfFile.fullPath);
    if (pageCount > 0 && pageCount < 5) {
      issues.push(createIssue({
        file: pdfFile,
        index: issues.length + 1,
        ruleId: "R-FORMAT-002",
        issueType: "页数边界",
        category: "format",
        severity: "high",
        page: "1",
        evidence: `PDF 页数为 ${pageCount}，低于第一阶段 5-10 页或 10+ 页分布要求。`,
        aiJudgement: "格式质量异常",
        recommendation: "保留 PDF 页数证据，进入人工复核确认是否为缺页或样本边界。",
        confidence: 0.9,
        foundAt: now,
      }));
    }

    const ocrPages = await extractOcrPages(pdfFile.fullPath, ocrProvider);
    const visionFindings = await extractVisionFindings(pdfFile.fullPath, visionProvider, ocrPages, pageCount);
    if (ocrPages.length > 0 || visionFindings.length > 0) {
      ocrProcessedPdfCount += 1;
      for (const ocrIssue of createOcrIssueInputs(ocrPages)) {
        issues.push(createIssue({
          ...ocrIssue,
          file: pdfFile,
          index: issues.length + 1,
          foundAt: now,
        }));
      }
      for (const visionFinding of visionFindings) {
        issues.push(createIssue({
          ...visionFinding,
          file: pdfFile,
          index: issues.length + 1,
          foundAt: now,
        }));
      }
    } else {
      issues.push(createIssue({
        file: pdfFile,
        index: issues.length + 1,
        ruleId: "R-OCR-001",
        issueType: "OCR 待处理",
        category: "content",
        severity: "medium",
        page: pageCount > 0 ? "1" : "-",
        evidence: "未发现可用 OCR 工具，已保留 PDF 文件、页数和路径证据，等待视觉模型或 OCR 服务处理。",
        aiJudgement: "需补充 OCR 证据",
        recommendation: "不臆造 PDF 文字内容，后续接入 OCR/视觉模型后再生成内容级判断。",
        confidence: 0.7,
        foundAt: now,
      }));
    }
  }

  for (const xlsxFile of xlsxFiles) {
    const rows = await readFirstWorksheetRows(xlsxFile.fullPath);
    const headers = rows[0] ?? [];
    const missingColumns = REQUIRED_EXCEL_COLUMNS.filter((column) => !headers.includes(column));
    if (missingColumns.length > 0) {
      issues.push(createIssue({
        file: xlsxFile,
        index: issues.length + 1,
        ruleId: "R-EXCEL-001",
        issueType: "字段缺失",
        category: "content",
        severity: "high",
        page: "Excel",
        evidence: `结构化数据缺少字段：${missingColumns.join("、")}。`,
        aiJudgement: "结构化字段不完整",
        recommendation: "保留字段清单证据，进入人工复核，不补写缺失字段。",
        confidence: 0.95,
        foundAt: now,
      }));
    }

    const symbolIndex = headers.indexOf("Symbol");
    const itemFlagIndex = headers.indexOf("ItemFlag");
    const resultCharIndex = headers.indexOf("ItemResultChar");
    const archiveIndex = headers.indexOf("ArchivesNum");
    rows.slice(1).forEach((row) => {
      const symbol = row[symbolIndex] ?? "";
      const resultChar = row[resultCharIndex] ?? "";
      if (symbol.trim() || /异常|阳性|偏高|偏低|结节|囊肿|增厚/.test(resultChar)) {
        const itemFlag = row[itemFlagIndex] || "未知项目";
        const archiveId = row[archiveIndex] || archiveIdFromFile(xlsxFile.name);
        issues.push(createIssue({
          file: xlsxFile,
          index: issues.length + 1,
          ruleId: "R-EXCEL-002",
          issueType: "结构化异常项",
          category: "content",
          severity: "medium",
          page: "Excel",
          archiveId,
          evidence: `结构化数据 ${archiveId} 的 ${itemFlag} 命中异常标记：Symbol=${symbol || "空"}，ItemResultChar=${resultChar || "空"}。`,
          aiJudgement: "Excel 字段提示异常",
          recommendation: "关联对应 PDF 页面和 OCR 证据后进入人工复核。",
          confidence: 0.86,
          foundAt: now,
        }));
      }
    });
  }

  return {
    datasetPath,
    scannedAt: now.toISOString(),
    metrics: [
      { label: "年龄段", value: String(groups.size), icon: "people", color: "teal" },
      { label: "PDF", value: String(pdfFiles.length), icon: "pdf", color: "blue" },
      { label: "Excel", value: String(xlsxFiles.length), icon: "excel", color: "green" },
      { label: "问题", value: String(issues.length), icon: "warning", color: "orange" },
      { label: "待复核", value: String(issues.filter((issue) => issue.status === "needs_review").length), icon: "review", color: "red" },
    ],
    pipeline: [
      { label: "文件扫描", value: `${pdfFiles.length}/${pdfFiles.length}`, done: true, active: false },
      { label: "Excel 解析", value: `${xlsxFiles.length}/${xlsxFiles.length}`, done: true, active: false },
      { label: "PDF 转图", value: `${ocrProcessedPdfCount}/${pdfFiles.length}`, done: pdfFiles.length === 0 || ocrProcessedPdfCount === pdfFiles.length, active: pdfFiles.length > 0 && ocrProcessedPdfCount < pdfFiles.length },
      { label: "AI 评审", value: ocrProcessedPdfCount > 0 ? "OCR 证据已生成" : "等待 OCR 证据", done: ocrProcessedPdfCount > 0 && ocrProcessedPdfCount === pdfFiles.length, active: false },
      { label: "人工复核", value: issues.length > 0 ? "待开始" : "无待复核", done: issues.length === 0, active: false },
    ],
    issues,
  };
}
type OcrIssueInput = Omit<QualityIssueData, "id" | "fileName" | "group" | "archiveId" | "foundAt" | "status" | "index"> & {
  archiveId?: string;
};

async function extractOcrPages(filePath: string, provider: OcrProvider | undefined) {
  if (!provider) return [];

  try {
    const pages = await provider.extractPdf(filePath);
    return pages.filter((page) => page.text.trim() || page.blocks.some((block) => block.text.trim()));
  } catch {
    return [];
  }
}

async function extractVisionFindings(filePath: string, provider: VisionReviewProvider | undefined, ocrPages: OcrPageEvidence[], pageCount: number) {
  if (!provider) return [];

  try {
    return await provider.reviewPdf(filePath, { ocrPages, pageCount });
  } catch {
    return [];
  }
}

function createOcrIssueInputs(pages: OcrPageEvidence[]): OcrIssueInput[] {
  const issues: OcrIssueInput[] = [];

  for (const pageEvidence of pages) {
    const pageText = [pageEvidence.text, ...pageEvidence.blocks.map((block) => block.text)].join("\n");
    const privacyEvidence = describePrivacyEvidence(pageText);
    if (!privacyEvidence) continue;

    issues.push({
      ruleId: "R-PRIVACY-003",
      issueType: "\u7591\u4f3c\u672a\u8131\u654f",
      category: "privacy",
      severity: "high",
      page: String(pageEvidence.page),
      evidence: "\u7b2c " + pageEvidence.page + " \u9875 OCR \u547d\u4e2d\u7591\u4f3c\u672a\u8131\u654f\u4fe1\u606f\uff1a" + privacyEvidence + "\u3002OCR \u7f6e\u4fe1\u5ea6 " + formatConfidence(pageEvidence.confidence) + "\u3002",
      aiJudgement: "OCR \u8bc1\u636e\u663e\u793a\u9875\u9762\u5b58\u5728\u654f\u611f\u4fe1\u606f\u672a\u8131\u654f\u98ce\u9669",
      recommendation: "\u6838\u5bf9\u539f PDF \u9875\u9762\u548c OCR \u6846\u9009\u8bc1\u636e\uff0c\u786e\u8ba4\u540e\u8fdb\u5165\u8131\u654f\u98ce\u9669\u6e05\u5355\u3002",
      confidence: Math.max(0.7, Math.min(0.99, pageEvidence.confidence)),
    });
  }

  return issues;
}

function describePrivacyEvidence(text: string) {
  const idNumbers = uniqueMatches(text, /\b\d{17}[\dXx]\b/g);
  const phoneNumbers = uniqueMatches(text, /\b1[3-9]\d{9}\b/g);
  const parts: string[] = [];

  if (idNumbers.length > 0) {
    parts.push("\u8eab\u4efd\u8bc1\u53f7 " + idNumbers.map(maskSensitiveNumber).join("\u3001"));
  }
  if (phoneNumbers.length > 0) {
    parts.push("\u624b\u673a\u53f7 " + phoneNumbers.map(maskSensitiveNumber).join("\u3001"));
  }

  return parts.join("\uff0c");
}

function uniqueMatches(text: string, pattern: RegExp) {
  return Array.from(new Set(text.match(pattern) ?? []));
}

function maskSensitiveNumber(value: string) {
  if (value.length <= 8) return value;
  return value.slice(0, 3) + "*".repeat(value.length - 7) + value.slice(-4);
}

function formatConfidence(value: number) {
  return Math.max(0, Math.min(1, value)).toFixed(2);
}

async function collectDatasetFiles(datasetPath: string): Promise<DatasetFile[]> {
  const entries = await readdir(datasetPath, { withFileTypes: true });
  const files: DatasetFile[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("._")) continue;
    const fullPath = path.join(datasetPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await readdir(fullPath, { withFileTypes: true });
      for (const nestedEntry of nested) {
        if (nestedEntry.isFile() && !nestedEntry.name.startsWith(".") && !nestedEntry.name.startsWith("._")) {
          files.push({
            fullPath: path.join(fullPath, nestedEntry.name),
            name: nestedEntry.name,
            extension: path.extname(nestedEntry.name).toLowerCase(),
            group: entry.name,
          });
        }
      }
    } else if (entry.isFile()) {
      files.push({ fullPath, name: entry.name, extension: path.extname(entry.name).toLowerCase(), group: "" });
    }
  }

  return files;
}

async function readPdfPageCount(filePath: string): Promise<number> {
  return await new Promise((resolve, reject) => {
    let count = 0;
    let carry = "";
    const stream = createReadStream(filePath, { encoding: "latin1", highWaterMark: 64 * 1024 });

    stream.on("data", (chunk) => {
      const text = carry + chunk;
      const scanLength = Math.max(0, text.length - PAGE_TOKEN_CARRY_LENGTH);
      count += countPdfPageMarkers(text.slice(0, scanLength));
      carry = text.slice(scanLength);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(count + countPdfPageMarkers(carry)));
  });
}

function countPdfPageMarkers(text: string) {
  return text.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

async function readFirstWorksheetRows(filePath: string) {
  const zipEntries = readZipEntries(await readFile(filePath));
  const sharedStrings = parseSharedStrings(zipEntries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "");
  const sheetXml = zipEntries.get("xl/worksheets/sheet1.xml")?.toString("utf8") ?? "";
  return parseSheetRows(sheetXml, sharedStrings);
}

function readZipEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 30 < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) entries.set(name, compressed);
    if (compressionMethod === 8) entries.set(name, inflateRawSync(compressed).subarray(0, uncompressedSize));

    offset = dataStart + compressedSize;
  }

  return entries;
}

function parseSharedStrings(xml: string) {
  return Array.from(xml.matchAll(/<si[^>]*>[\s\S]*?<\/si>/g)).map((match) =>
    decodeXml(Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part) => part[1]).join("")),
  );
}

function parseSheetRows(xml: string, sharedStrings: string[]) {
  return Array.from(xml.matchAll(/<row[^>]*>[\s\S]*?<\/row>/g)).map((rowMatch) => {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[0].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const column = columnIndexFromCellRef(attributes.match(/r="([A-Z]+)\d+"/)?.[1] ?? "A");
      const type = attributes.match(/t="([^"]+)"/)?.[1] ?? "";
      const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      cells[column] = type === "s" ? sharedStrings[Number(rawValue)] ?? "" : decodeXml(rawValue);
    }
    return cells.map((value) => value ?? "");
  });
}

function columnIndexFromCellRef(column: string) {
  return column.split("").reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function createIssue(input: Omit<QualityIssueData, "id" | "fileName" | "group" | "archiveId" | "foundAt" | "status"> & { file: DatasetFile; foundAt: Date; archiveId?: string }): QualityIssueData {
  const archiveId = input.archiveId ?? archiveIdFromFile(input.file.name);
  return {
    id: `${input.ruleId.toLowerCase()}-${input.index}-${archiveId}`,
    index: input.index,
    fileName: input.file.name,
    group: input.file.group,
    archiveId,
    page: input.page,
    issueType: input.issueType,
    category: input.category,
    severity: input.severity,
    ruleId: input.ruleId,
    evidence: input.evidence,
    aiJudgement: input.aiJudgement,
    recommendation: input.recommendation,
    confidence: input.confidence,
    status: "needs_review",
    foundAt: formatDateTime(input.foundAt),
  };
}

function archiveIdFromFile(fileName: string) {
  return path.basename(fileName, path.extname(fileName));
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}


