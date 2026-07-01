export const exportDeliverables = [
  "第三批数据检测报告",
  "不合规问题清单",
  "可能合规清单",
  "人工复核记录",
  "证据截图索引",
  "批次总体情况表",
  "结构化数据导出",
  "合格 PDF 文件夹",
  "问题详情分析报告",
] as const;

export type ExportDeliverableTitle = (typeof exportDeliverables)[number];

export const exportDeliverableGroups: Array<{ title: string; items: ExportDeliverableTitle[] }> = [
  {
    title: "检测报告",
    items: ["第三批数据检测报告", "批次总体情况表"],
  },
  {
    title: "问题与复核",
    items: ["不合规问题清单", "可能合规清单", "人工复核记录", "问题详情分析报告"],
  },
  {
    title: "数据与证据",
    items: ["结构化数据导出", "合格 PDF 文件夹", "证据截图索引"],
  },
];

export const exportDeliverableSectionKeys: Record<ExportDeliverableTitle, string[]> = {
  "第三批数据检测报告": ["third-batch-report"],
  "不合规问题清单": ["non-compliant"],
  "可能合规清单": ["possible-compliant"],
  "人工复核记录": ["review-records"],
  "证据截图索引": ["evidence-image-index"],
  "批次总体情况表": ["batch-overview-table"],
  "结构化数据导出": ["structured-data"],
  "合格 PDF 文件夹": ["compliant-pdfs"],
  "问题详情分析报告": ["issue-detail-reports"],
};

export const exportDeliverablePreview: Record<
  ExportDeliverableTitle,
  { chapter: string; content: string; format: string }
> = {
  "第三批数据检测报告": { chapter: "检测总报告", content: "方法、风险分布、结论摘要", format: "Markdown" },
  "不合规问题清单": { chapter: "不合规清单", content: "已确认问题、证据、规则 ID", format: "JSONL" },
  "可能合规清单": { chapter: "可能合规", content: "人工驳回与低风险样本", format: "JSONL" },
  "人工复核记录": { chapter: "复核记录", content: "复核人、决策、备注、时间", format: "JSONL" },
  "证据截图索引": { chapter: "证据索引", content: "文件、页码、框选坐标", format: "JSON" },
  "批次总体情况表": { chapter: "批次总览", content: "档案合规状态、问题数、缺失项", format: "Excel" },
  "结构化数据导出": { chapter: "结构化数据", content: "按档案导出标准 Excel 字段", format: "Excel 文件夹" },
  "合格 PDF 文件夹": { chapter: "合格 PDF", content: "无已确认/待复核问题的 PDF", format: "PDF 文件夹" },
  "问题详情分析报告": { chapter: "问题分析", content: "不合规与待复核逐份说明", format: "Markdown 文件夹" },
};

export function exportDescriptionFor(item: ExportDeliverableTitle): string {
  if (item === "第三批数据检测报告") return "总结方法、风险分布和检测结论。";
  if (item === "不合规问题清单") return "已确认问题、证据摘要和规则 ID。";
  if (item === "可能合规清单") return "人工驳回、低风险样本和可复查记录。";
  if (item === "人工复核记录") return "确认、驳回、争议、备注和复核人。";
  if (item === "批次总体情况表") return "按档案汇总合规状态与问题数量，输出 Excel。";
  if (item === "结构化数据导出") return "按档案导出与原始 Excel 相同字段的 .xlsx 文件。";
  if (item === "合格 PDF 文件夹") return "质检交付/合格PDF/ 目录存放合格 PDF。";
  if (item === "问题详情分析报告") return "不合规与待复核报告逐份 Markdown 分析。";
  return "文件、页码、框选位置和截图索引。";
}
