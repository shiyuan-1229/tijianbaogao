import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { OcrPageEvidence, OcrProvider } from "@/features/quality/lib/dataset-scanner";

type SidecarPage = Partial<OcrPageEvidence> & {
  page?: number | string;
  text?: string;
  confidence?: number | string;
  blocks?: Array<{ text?: string; confidence?: number | string; bbox?: [number, number, number, number] }>;
};

export function createSidecarOcrProvider(): OcrProvider {
  return {
    async extractPdf(filePath) {
      const sidecarPath = await findSidecarPath(filePath);
      if (!sidecarPath) return [];

      const content = await readFile(sidecarPath, "utf8");
      if (sidecarPath.endsWith(".txt")) {
        return textSidecarToPages(content);
      }

      return jsonSidecarToPages(content);
    },
  };
}

async function findSidecarPath(filePath: string) {
  const parsed = path.parse(filePath);
  const candidates = [
    path.join(parsed.dir, parsed.name + ".ocr.json"),
    filePath + ".ocr.json",
    path.join(parsed.dir, parsed.name + ".ocr.txt"),
    filePath + ".ocr.txt",
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  return undefined;
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function jsonSidecarToPages(content: string): OcrPageEvidence[] {
  const parsed = JSON.parse(content) as { pages?: SidecarPage[] } | SidecarPage[];
  const pages = Array.isArray(parsed) ? parsed : parsed.pages ?? [];
  return pages.map(normalizePage).filter((page) => page.text.trim() || page.blocks.length > 0);
}

function textSidecarToPages(content: string): OcrPageEvidence[] {
  const text = content.trim();
  if (!text) return [];
  return [{ page: 1, text, confidence: 1, blocks: [{ text, confidence: 1 }] }];
}

function normalizePage(page: SidecarPage): OcrPageEvidence {
  const text = typeof page.text === "string" ? page.text : "";
  const blocks = (page.blocks ?? [])
    .map((block) => ({
      text: typeof block.text === "string" ? block.text : "",
      confidence: numericOrDefault(block.confidence, undefined),
      bbox: block.bbox,
    }))
    .filter((block) => block.text.trim());

  return {
    page: Math.max(1, Math.trunc(numericOrDefault(page.page, 1) ?? 1)),
    text,
    confidence: numericOrDefault(page.confidence, 1) ?? 1,
    blocks,
  };
}

function numericOrDefault(value: number | string | undefined, fallback: number | undefined) {
  if (value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
