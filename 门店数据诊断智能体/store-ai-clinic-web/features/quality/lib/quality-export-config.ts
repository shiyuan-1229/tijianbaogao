export const exportDeliverables = [
  "客户阅读版报告",
  "批次总体情况表",
  "结构化数据导出",
  "合格 PDF 文件夹",
  "逐份问题说明",
] as const;

export type ExportDeliverableTitle = (typeof exportDeliverables)[number];

export const exportDeliverableGroups: Array<{ title: string; items: ExportDeliverableTitle[] }> = [
  {
    title: "可直接交付",
    items: ["客户阅读版报告", "逐份问题说明", "批次总体情况表"],
  },
  {
    title: "可继续处理",
    items: ["结构化数据导出", "合格 PDF 文件夹"],
  },
];

export const exportDeliverableSectionKeys: Record<ExportDeliverableTitle, string[]> = {
  "客户阅读版报告": [],
  "批次总体情况表": ["batch-overview-table"],
  "结构化数据导出": ["structured-data"],
  "合格 PDF 文件夹": ["compliant-pdfs"],
  "逐份问题说明": ["issue-detail-reports"],
};

export const exportDeliverablePreview: Record<
  ExportDeliverableTitle,
  { chapter: string; content: string; format: string }
> = {
  "客户阅读版报告": { chapter: "客户报告", content: "交付包说明和批次质检总报告", format: "HTML" },
  "批次总体情况表": { chapter: "批次总览", content: "档案合规状态、问题数、缺失项", format: "Excel" },
  "结构化数据导出": { chapter: "结构化数据", content: "按档案导出标准 Excel 字段", format: "Excel 文件夹" },
  "合格 PDF 文件夹": { chapter: "合格 PDF", content: "无已确认/待复核问题的 PDF", format: "PDF 文件夹" },
  "逐份问题说明": { chapter: "逐份说明", content: "不合规与待复核报告逐份 HTML 说明", format: "HTML 文件夹" },
};

export function exportDescriptionFor(item: ExportDeliverableTitle): string {
  if (item === "客户阅读版报告") return "生成 00-交付包说明.html 和 01-批次质检总报告.html。";
  if (item === "批次总体情况表") return "按档案汇总合规状态与问题数量，输出 Excel。";
  if (item === "结构化数据导出") return "按档案导出与原始 Excel 相同字段的 .xlsx 文件。";
  if (item === "合格 PDF 文件夹") return "质检交付/合格PDF/ 目录存放合格 PDF。";
  return "逐份输出客户可读的问题说明 HTML。";
}