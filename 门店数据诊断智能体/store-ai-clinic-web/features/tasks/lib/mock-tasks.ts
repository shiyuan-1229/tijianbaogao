import type { TaskResultViewModel } from "@/entities/tasks/types";

function createTask(task: TaskResultViewModel): TaskResultViewModel {
  return task;
}

const mockTasks = {
  "task-daily-001": createTask({
    id: "task-daily-001",
    title: "日诊断 · 杭州西湖店",
    storeName: "杭州西湖店",
    storeId: "HZ-WestLake",
    diagnosisType: "daily",
    stage: "diagnose",
    status: {
      label: "诊断已生成",
      tone: "success",
      source: "llm",
      error: null,
    },
    summary: {
      title: "根据任务上下文生成的分析摘要",
      summary: "午后客流回落，成交转化跟随下滑，问题集中在 13:00 至 15:00。",
      nextAction: "优先复盘午后排班和门口拦截话术，并补充同商圈活动信息。",
    },
    highlights: ["午后客流低于上午峰值，转化率同步回落。", "高峰前后的导购承接出现断层。"] ,
    rootCauses: ["午间换班导致接待节奏变慢。", "周边竞品临时活动分流了目标客群。"],
    recommendedActions: ["把重点排班前移到 12:30。", "增加 14:00 前后的门店活动提醒。"],
    requiresConfirmation: false,
    lastUpdatedLabel: "10 分钟前",
    progress: ["已上传日报", "已完成数据清洗", "AI 已完成经营分析"],
  }),
  "task-weekly-003": createTask({
    id: "task-weekly-003",
    title: "周诊断 · 南京东城店",
    storeName: "南京东城店",
    storeId: "NJ-EastTown",
    diagnosisType: "weekly",
    stage: "review",
    status: {
      label: "等待人工确认",
      tone: "running",
      source: "llm",
      error: null,
    },
    summary: {
      title: "根据任务上下文生成的分析摘要",
      summary: "本周成交率稳定，但高客单商品的连带销售明显放缓。",
      nextAction: "确认新品陈列是否按 SOP 执行，再决定是否调整推荐顺序。",
    },
    highlights: ["高客单商品动销慢于上周。"],
    rootCauses: ["新品陈列执行存在门店差异。"],
    recommendedActions: ["抽检陈列照片并校对话术执行。"],
    requiresConfirmation: true,
    lastUpdatedLabel: "35 分钟前",
    progress: ["已接收周报", "已整理知识上下文", "等待人工确认陈列信息"],
  }),
} satisfies Record<string, TaskResultViewModel>;

export function buildMockTask(taskId: string): TaskResultViewModel {
  const normalizedTaskId = taskId.trim();

  if (normalizedTaskId in mockTasks) {
    return mockTasks[normalizedTaskId as keyof typeof mockTasks];
  }

  const diagnosisType = normalizedTaskId.includes("weekly") ? "weekly" : "daily";

  return createTask({
    id: normalizedTaskId || "task-generated",
    title: diagnosisType === "weekly" ? "周诊断 · 示例门店" : "日诊断 · 示例门店",
    storeName: "示例门店",
    storeId: "store-ai-clinic-demo",
    diagnosisType,
    stage: "diagnose",
    status: {
      label: "诊断已生成",
      tone: "success",
      source: "mock-route",
      error: null,
    },
    summary: {
      title: "根据任务上下文生成的分析摘要",
      summary: "系统已根据当前任务上下文整理出一版可复核的经营诊断摘要。",
      nextAction: "继续补充门店背景、活动信息或人工确认意见，帮助 AI 收敛建议。",
    },
    highlights: ["AI 已整理本轮最重要的经营波动。"],
    rootCauses: ["当前为演示数据，建议接入真实经营上下文后继续分析。"],
    recommendedActions: ["补充更完整的日报或周报后重新发起诊断。"],
    requiresConfirmation: false,
    lastUpdatedLabel: "刚刚更新",
    progress: ["已创建任务", "已准备示例数据", "已生成演示摘要"],
  });
}

export function buildMockTasks(): TaskResultViewModel[] {
  return [mockTasks["task-daily-001"], mockTasks["task-weekly-003"]];
}
