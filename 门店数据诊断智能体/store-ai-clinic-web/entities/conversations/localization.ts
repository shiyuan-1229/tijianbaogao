const STORE_NAME_BY_ID: Record<string, string> = {
  "hangzhou-xihu": "杭州西湖店",
  "store-ai-clinic-demo": "门店数据诊断演示店",
  "store-a": "示例门店 A",
};

const SESSION_TITLE_BY_SOURCE: Record<string, string> = {
  "Analyze Hangzhou West Lake store": "杭州西湖店问题诊断",
  "Hangzhou West Lake Store Analysis": "杭州西湖店问题诊断",
  "New Store Session": "新的门店诊断会话",
};

const ASSISTANT_REPLY_BY_SOURCE: Record<string, string> = {
  "I can compress this round into a short summary for handoff or record keeping.":
    "我可以把这一轮整理成简短总结，方便交接或归档。",
  "I created a new session and reviewed your question.":
    "我已经创建新的会话，并开始分析你的问题。",
  "I will continue by breaking down the likely drivers behind the result.":
    "我会继续拆解这次结果背后的主要原因，先把最可能的驱动因素讲清楚。",
  "I reviewed the attached report.":
    "我已经结合你上传的报表完成初步查看。",
};

const STORE_SUFFIX_PATTERN = /(?:-store|-shop|-branch)$/i;
const ATTACHMENT_SUMMARY_PATTERN = /^- (.+) \(([^,]+), (\d+) bytes\)$/gm;
const QUESTION_MARK_ONLY_PATTERN = /^\?+$/;

function titleCaseWords(value: string) {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map(
      (segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join("");
}

function isQuestionMarkFallback(value: string) {
  return QUESTION_MARK_ONLY_PATTERN.test(value.trim());
}

function normalizeStoreNameFromId(storeId: string) {
  const normalized = storeId.trim().toLowerCase();
  if (!normalized) {
    return "当前门店";
  }

  if (STORE_NAME_BY_ID[normalized]) {
    return STORE_NAME_BY_ID[normalized];
  }

  const compact = normalized.replace(STORE_SUFFIX_PATTERN, "");
  const segments = compact.split(/[-_]/).filter(Boolean);
  if (segments.length >= 2) {
    return `${segments.map(titleCaseWords).join("")}店`;
  }

  return `${titleCaseWords(compact)}店`;
}

export function localizeStoreName(storeId: string) {
  return normalizeStoreNameFromId(storeId);
}

export function localizeSessionTitle(sessionTitle: string, storeId: string) {
  const trimmed = sessionTitle.trim();
  if (SESSION_TITLE_BY_SOURCE[trimmed]) {
    return SESSION_TITLE_BY_SOURCE[trimmed];
  }

  if (isQuestionMarkFallback(trimmed)) {
    return `${localizeStoreName(storeId)}历史会话（原始标题编码异常）`;
  }

  return trimmed || `${localizeStoreName(storeId)}问题诊断`;
}

export function localizeAssistantReply(contentText: string) {
  const trimmed = contentText.trim();
  if (isQuestionMarkFallback(trimmed)) {
    return "该条 AI 回复内容编码异常，请重新发起一次诊断或追问。";
  }

  return ASSISTANT_REPLY_BY_SOURCE[trimmed] ?? trimmed;
}

export function localizeMessageContent(contentText: string) {
  const trimmed = contentText.trim();
  if (isQuestionMarkFallback(trimmed)) {
    return "该条历史消息内容编码异常，建议重新输入原始问题。";
  }

  return contentText.replace(
    ATTACHMENT_SUMMARY_PATTERN,
    (_, name: string, type: string, size: string) =>
      formatAttachmentSummaryLine(name, type, Number(size)),
  );
}

export function formatEvidenceMeta(type: string, size: number) {
  const normalizedType = type || "未知类型";
  return `${normalizedType} · ${size} 字节`;
}

export function formatAttachmentSummaryLine(
  name: string,
  type: string,
  size: number,
) {
  return `- ${name} (${formatEvidenceMeta(type, size)})`;
}
