import { create } from "zustand";

import { mapDiagnosisRunResponseToTimelineEvent } from "@/entities/agent/mappers";
import type {
  AgentTimelineEvent,
  DiagnosisRunResponseDto,
} from "@/entities/agent/types";
import { mapDiagnosisRunResponseToTaskResult } from "@/entities/tasks/mappers";
import type { TaskResultViewModel } from "@/entities/tasks/types";

type AgentSessionState = {
  draft: string;
  activeTaskId: string | null;
  latestResult: TaskResultViewModel | null;
  timeline: AgentTimelineEvent[];
  setDraft: (draft: string) => void;
  addTimelineEvent: (event: AgentTimelineEvent) => void;
  applyDiagnosisRun: (dto: DiagnosisRunResponseDto) => void;
  resetSession: () => void;
};

const initialState = {
  draft: "",
  activeTaskId: null,
  latestResult: null,
  timeline: [],
} satisfies Pick<
  AgentSessionState,
  "activeTaskId" | "draft" | "latestResult" | "timeline"
>;

export const useAgentSessionStore = create<AgentSessionState>((set) => ({
  ...initialState,
  setDraft: (draft) => set({ draft }),
  addTimelineEvent: (event) =>
    set((state) => ({ timeline: [...state.timeline, event] })),
  applyDiagnosisRun: (dto) =>
    set((state) => ({
      activeTaskId: dto.task_id,
      latestResult: mapDiagnosisRunResponseToTaskResult(dto),
      timeline: [...state.timeline, mapDiagnosisRunResponseToTimelineEvent(dto)],
    })),
  resetSession: () => set(initialState),
}));
