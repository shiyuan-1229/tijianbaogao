import type { DiagnosisType } from "@/entities/agent/types";

export type TaskStatusTone = "running" | "success" | "warning";

export type TaskSummaryViewModel = {
  title: string;
  summary: string;
  nextAction: string;
};

export type TaskStatusViewModel = {
  label: string;
  tone: TaskStatusTone;
  source: string | null;
  error: string | null;
};

export type TaskResultViewModel = {
  id: string;
  title: string;
  storeName: string;
  storeId: string;
  diagnosisType: DiagnosisType;
  stage: string;
  status: TaskStatusViewModel;
  summary: TaskSummaryViewModel;
  highlights: string[];
  rootCauses: string[];
  recommendedActions: string[];
  requiresConfirmation: boolean;
  lastUpdatedLabel: string;
  progress: string[];
};
