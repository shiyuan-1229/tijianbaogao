import type {
  AgentTimelineEvent,
  DiagnosisRunResponseDto,
} from "@/entities/agent/types";

function getStageLabel(stage: string) {
  switch (stage) {
    case "collect":
      return "已接收经营上下文";
    case "validate":
      return "已完成数据校验";
    case "diagnose":
      return "AI 已生成本轮诊断";
    case "review":
      return "等待人工确认";
    default:
      return "分析进展已更新";
  }
}

export function mapDiagnosisRunResponseToTimelineEvent(
  dto: DiagnosisRunResponseDto,
): AgentTimelineEvent {
  const hasError = Boolean(dto.diagnosis_error);

  return {
    id: `${dto.task_id}:${dto.graph_stage}`,
    label: hasError ? "本轮分析暂时受阻" : getStageLabel(dto.graph_stage),
    state: hasError ? "error" : "done",
    detail: hasError
      ? "AI 分析服务暂时不可用，系统会稍后重试。"
      : "结果摘要已经生成，可继续查看关键发现与建议动作。",
  };
}
