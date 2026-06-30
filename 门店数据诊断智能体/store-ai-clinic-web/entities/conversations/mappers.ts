import type {
  ConversationCitation,
  ConversationCitationDto,
  ConversationFollowupSuggestion,
  ConversationFollowupSuggestionDto,
  ConversationMessage,
  ConversationMessageDto,
  ConversationSessionSummary,
  ConversationSessionSummaryDto,
} from "@/entities/conversations/types";
import {
  localizeAssistantReply,
  localizeMessageContent,
  localizeSessionTitle,
} from "@/entities/conversations/localization";

export function mapConversationSessionSummary(
  dto: ConversationSessionSummaryDto,
): ConversationSessionSummary {
  return {
    sessionId: dto.session_id,
    sessionTitle: localizeSessionTitle(dto.session_title, dto.store_id),
    titleSource: dto.title_source ?? dto.titleSource ?? "system",
    status: dto.status,
    entryMode: dto.entry_mode,
    brandId: dto.brand_id,
    storeId: dto.store_id,
  };
}

export function mapConversationSessionSummaries(
  dtos: ConversationSessionSummaryDto[],
): ConversationSessionSummary[] {
  return dtos.map(mapConversationSessionSummary);
}

export function mapConversationFollowupSuggestion(
  dto: ConversationFollowupSuggestionDto,
): ConversationFollowupSuggestion {
  return {
    intent: dto.intent,
    text: dto.text,
    suggestionType: dto.suggestion_type,
  };
}

export function mapConversationFollowupSuggestions(
  dtos: ConversationFollowupSuggestionDto[],
): ConversationFollowupSuggestion[] {
  return dtos.map(mapConversationFollowupSuggestion);
}

export function mapConversationCitation(
  dto: ConversationCitationDto,
): ConversationCitation {
  return {
    sourceId: dto.source_id,
    sourceTitle: dto.source_title,
    knowledgeType: dto.knowledge_type,
    pageNo: dto.page_no,
    chapterTitle: dto.chapter_title,
    quoteText: dto.quote_text,
    versionLabel: dto.version_label,
  };
}

export function mapConversationCitations(
  dtos: ConversationCitationDto[] | undefined,
): ConversationCitation[] {
  return (dtos ?? []).map(mapConversationCitation);
}

export function mapConversationMessage(
  dto: ConversationMessageDto,
): ConversationMessage {
  return {
    messageId: dto.message_id,
    role: dto.role,
    messageType: dto.message_type,
    contentText:
      dto.role === "assistant"
        ? localizeAssistantReply(dto.content_text ?? "")
        : localizeMessageContent(dto.content_text ?? ""),
    citations:
      dto.role === "assistant"
        ? mapConversationCitations(dto.content_json?.citations)
        : undefined,
  };
}

export function mapConversationMessages(
  dtos: ConversationMessageDto[],
): ConversationMessage[] {
  return dtos.map(mapConversationMessage);
}


