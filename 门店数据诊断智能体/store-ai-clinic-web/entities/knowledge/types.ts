export type KnowledgeSourceDto = {
  source_id: string;
  source_title: string;
  knowledge_type:
    | "sop"
    | "training"
    | "inspection"
    | "diagnosis_case"
    | "brand_rule"
    | "hq_policy"
    | "best_practice";
  status: "draft" | "processing" | "pending_publish" | "published" | "archived";
  version_label?: string | null;
  updated_at: string;
  chunk_count: number;
};
