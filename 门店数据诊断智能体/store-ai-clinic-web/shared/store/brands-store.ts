import { create } from "zustand";

export type BrandTab =
  | "profile"
  | "templates"
  | "field-mapping"
  | "diagnosis-rules";

type BrandProfile = {
  name: string;
  industry: string;
  region: string;
  defaultCadence: string;
  voice: string;
};

type BrandTemplate = {
  id: string;
  name: string;
  channel: string;
  body: string;
};

type BrandFieldMapping = {
  id: string;
  sourceField: string;
  targetField: string;
  required: boolean;
};

type DiagnosisRule = {
  id: string;
  name: string;
  description: string;
  threshold: string;
  guidance: string;
  enabled: boolean;
};

type BrandsStoreState = {
  activeTab: BrandTab;
  selectedTemplateId: string | null;
  profile: BrandProfile;
  templates: BrandTemplate[];
  fieldMappings: BrandFieldMapping[];
  rules: DiagnosisRule[];
  setActiveTab: (tab: BrandTab) => void;
  updateProfile: <K extends keyof BrandProfile>(
    field: K,
    value: BrandProfile[K],
  ) => void;
  selectTemplate: (templateId: string | null) => void;
  updateTemplate: (templateId: string, patch: Partial<BrandTemplate>) => void;
  updateFieldMapping: (
    fieldMappingId: string,
    patch: Partial<BrandFieldMapping>,
  ) => void;
  updateRule: (ruleId: string, patch: Partial<DiagnosisRule>) => void;
  reset: () => void;
};

const initialState = {
  activeTab: "profile",
  selectedTemplateId: "daily-ops",
  profile: {
    name: "北风市集",
    industry: "精品零售",
    region: "华东",
    defaultCadence: "日诊断",
    voice:
      "先说明门店经营背景，再点出最关键的异常，最后给出区域经理可以立即执行的直接建议。",
  },
  templates: [
    {
      id: "daily-ops",
      name: "日常经营诊断",
      channel: "店长简报",
      body:
        "总结经营异常，对比最近基线，并给出三条当班店长可立即执行的后续动作。",
    },
    {
      id: "weekly-review",
      name: "周度经营复盘",
      channel: "区域复核",
      body:
        "将周度客流、转化和客单变化与活动节奏关联起来，并指出下周需要重点干预的门店群组。",
    },
  ],
  fieldMappings: [
    {
      id: "traffic",
      sourceField: "footfall_count",
      targetField: "customer_traffic",
      required: true,
    },
    {
      id: "conversion",
      sourceField: "deal_rate",
      targetField: "conversion_rate",
      required: true,
    },
    {
      id: "sales",
      sourceField: "net_sales",
      targetField: "revenue",
      required: true,
    },
  ],
  rules: [
    {
      id: "traffic-drop",
      name: "客流下滑升级规则",
      description:
        "当门店客流下滑到可能影响当日营收恢复时，升级为重点关注异常。",
      threshold: "-12% vs trailing 14-day baseline",
      guidance:
        "要求智能体在判断原因前，先检查商场活动、天气影响与排班状态。",
      enabled: true,
    },
    {
      id: "conversion-gap",
      name: "转化质量检查",
      description:
        "当转化表现落后于客流变化时，主动提示，以区分引流问题和店内执行问题。",
      threshold: "-4 pts vs peer median",
      guidance:
        "在给出建议前，要求智能体比较商品可得性、排队时长和爆品售罄进度。",
      enabled: true,
    },
  ],
} satisfies Pick<
  BrandsStoreState,
  | "activeTab"
  | "selectedTemplateId"
  | "profile"
  | "templates"
  | "fieldMappings"
  | "rules"
>;

export const useBrandsStore = create<BrandsStoreState>((set) => ({
  ...initialState,
  setActiveTab: (tab) => set({ activeTab: tab }),
  updateProfile: (field, value) =>
    set((state) => ({
      profile: {
        ...state.profile,
        [field]: value,
      },
    })),
  selectTemplate: (templateId) => set({ selectedTemplateId: templateId }),
  updateTemplate: (templateId, patch) =>
    set((state) => ({
      templates: state.templates.map((template) =>
        template.id === templateId ? { ...template, ...patch } : template,
      ),
    })),
  updateFieldMapping: (fieldMappingId, patch) =>
    set((state) => ({
      fieldMappings: state.fieldMappings.map((mapping) =>
        mapping.id === fieldMappingId ? { ...mapping, ...patch } : mapping,
      ),
    })),
  updateRule: (ruleId, patch) =>
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule,
      ),
    })),
  reset: () => set(initialState),
}));
