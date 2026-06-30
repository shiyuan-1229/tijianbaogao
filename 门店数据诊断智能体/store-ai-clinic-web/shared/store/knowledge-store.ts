import { create } from "zustand";

export type KnowledgeSourceKind =
  | "sop"
  | "training"
  | "inspection"
  | "diagnosis_case"
  | "brand_rule"
  | "hq_policy"
  | "best_practice";

export type KnowledgeSourceStatus =
  | "draft"
  | "processing"
  | "pending_publish"
  | "published"
  | "archived";

export type KnowledgeSource = {
  id: string;
  name: string;
  kind: KnowledgeSourceKind;
  versionLabel: string;
  updatedAt: string;
  chunkCount: number;
  status: KnowledgeSourceStatus;
};

type RagReadinessSnapshot = {
  coveragePercent: number;
  freshnessWindow: string;
  syncCadence: string;
  priorityTopic: string;
  blockers: string[];
};

type KnowledgeStoreState = {
  autoSync: boolean;
  nextSourceNumber: number;
  sources: KnowledgeSource[];
  readiness: RagReadinessSnapshot;
  replaceSources: (sources: KnowledgeSource[]) => void;
  addSource: (source: KnowledgeSource) => void;
  updateSource: (source: KnowledgeSource) => void;
  toggleAutoSync: () => void;
  reset: () => void;
};

const initialState = {
  autoSync: true,
  nextSourceNumber: 1,
  sources: [] satisfies KnowledgeSource[],
  readiness: {
    coveragePercent: 0,
    freshnessWindow: "尚未接入已发布知识",
    syncCadence: "按手动上传与发布更新",
    priorityTopic: "优先补充当前最常被追问的经营知识",
    blockers: [
      "当前还没有已发布知识，Agent 暂时无法引用门店专属依据。",
      "建议先上传并发布 SOP、规则或案例，再进入经营诊断对话。",
    ],
  } satisfies RagReadinessSnapshot,
} satisfies Pick<
  KnowledgeStoreState,
  "autoSync" | "nextSourceNumber" | "sources" | "readiness"
>;

export const useKnowledgeStore = create<KnowledgeStoreState>((set) => ({
  ...initialState,
  replaceSources: (sources) =>
    set(() => ({
      sources,
      nextSourceNumber: sources.length + 1,
    })),
  addSource: (source) =>
    set((state) => ({
      nextSourceNumber: state.nextSourceNumber + 1,
      sources: [source, ...state.sources],
    })),
  updateSource: (source) =>
    set((state) => ({
      sources: state.sources.map((item) =>
        item.id === source.id ? source : item,
      ),
    })),
  toggleAutoSync: () => set((state) => ({ autoSync: !state.autoSync })),
  reset: () => set(initialState),
}));
