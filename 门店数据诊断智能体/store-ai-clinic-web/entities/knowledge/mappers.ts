import type { KnowledgeSourceDto } from "@/entities/knowledge/types";
import type { KnowledgeSource } from "@/shared/store/knowledge-store";

function formatUpdatedAt(value: string): string {
  if (!value) {
    return "刚刚";
  }

  return value.slice(0, 10);
}

export function mapKnowledgeSources(dtos: KnowledgeSourceDto[]): KnowledgeSource[] {
  return dtos.map((dto) => ({
    id: dto.source_id,
    name: dto.source_title,
    kind: dto.knowledge_type,
    versionLabel: dto.version_label ?? "未标注",
    updatedAt: formatUpdatedAt(dto.updated_at),
    chunkCount: dto.chunk_count,
    status: dto.status,
  }));
}
