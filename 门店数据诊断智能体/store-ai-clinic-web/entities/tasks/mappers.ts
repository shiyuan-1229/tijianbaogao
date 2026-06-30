import type { DiagnosisRunResponseDto, DiagnosisType } from "@/entities/agent/types";
import type { TaskResultViewModel, TaskStatusViewModel } from "@/entities/tasks/types";

function formatTaskTitle(diagnosisType: DiagnosisType, storeId: string) {
  const cadenceLabel = diagnosisType === "weekly" ? "周诊断" : "日诊断";
  return `${cadenceLabel} · ${storeId}`;
}

function buildStatus(dto: DiagnosisRunResponseDto): TaskStatusViewModel {
  if (dto.diagnosis_error) {
    return {
      label: "分析暂时中断",
      tone: "warning",
      source: dto.diagnosis_source,
      error: dto.diagnosis_error,
    };
  }

  if (dto.graph_stage === "review") {
    return {
      label: "等待人工确认",
      tone: "running",
      source: dto.diagnosis_source,
      error: null,
    };
  }

  return {
    label: "诊断已生成",
    tone: "success",
    source: dto.diagnosis_source,
    error: null,
  };
}

export function mapDiagnosisRunResponseToTaskResult(
  dto: DiagnosisRunResponseDto,
): TaskResultViewModel {
  return {
    id: dto.task_id,
    title: formatTaskTitle(dto.diagnosis_type, dto.store_id),
    storeName: dto.store_id,
    storeId: dto.store_id,
    diagnosisType: dto.diagnosis_type,
    stage: dto.graph_stage,
    status: buildStatus(dto),
    summary: {
      title: dto.diagnosis_draft.title,
      summary: dto.diagnosis_draft.summary,
      nextAction: dto.diagnosis_draft.next_action,
    },
    highlights: [dto.diagnosis_draft.summary],
    rootCauses: ["AI 正在结合经营上下文归纳本轮变化原因。"],
    recommendedActions: [dto.diagnosis_draft.next_action],
    requiresConfirmation: dto.graph_stage === "review",
    lastUpdatedLabel: "刚刚更新",
    progress: ["已接收数据", "已完成基础校验", "已输出分析结论"],
  };
}
