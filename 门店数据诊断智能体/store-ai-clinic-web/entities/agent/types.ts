export type DiagnosisType = "daily" | "weekly";

export type DiagnosisDraftDto = {
  title: string;
  summary: string;
  next_action: string;
};

export type DiagnosisRunRequestDto = {
  task_id: string;
  store_id: string;
  diagnosis_type: DiagnosisType;
  context: string;
};

export type DiagnosisRunResponseDto = {
  task_id: string;
  store_id: string;
  diagnosis_type: DiagnosisType;
  graph_stage: string;
  diagnosis_source: string | null;
  diagnosis_error: string | null;
  diagnosis_draft: DiagnosisDraftDto;
};

export type DiagnosisRunDto = DiagnosisRunResponseDto;

export type AgentTimelineEventState = "pending" | "running" | "done" | "error";

export type AgentTimelineEvent = {
  id: string;
  label: string;
  state: AgentTimelineEventState;
  detail?: string;
};
