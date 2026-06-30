export type ConversationSessionStatus = "active" | "archived" | "closed";

export type ConversationEntryMode = "manual" | "auto_from_diagnosis";

export type ConversationTitleSource = "system" | "user";

export type ConversationSessionSummaryDto = {
  session_id: string;
  session_title: string;
  title_source?: ConversationTitleSource;
  titleSource?: ConversationTitleSource;
  status: ConversationSessionStatus;
  entry_mode: ConversationEntryMode;
  brand_id: string;
  store_id: string;
};

export type CreateConversationRequestDto = {
  brand_id: string;
  store_id: string;
  entry_mode: ConversationEntryMode;
  initial_question: string;
  session_title?: string;
};

export type UpdateConversationRequestDto = {
  session_title: string;
};

export type ConversationSessionSummary = {
  sessionId: string;
  sessionTitle: string;
  titleSource?: ConversationTitleSource;
  status: ConversationSessionStatus;
  entryMode?: ConversationEntryMode;
  brandId?: string;
  storeId: string;
};

export type ConversationMessageRole = "user" | "assistant";

export type ConversationEvidenceFile = {
  name: string;
  size: number;
  type: string;
};

export type ConversationCitationDto = {
  source_id: string;
  source_title: string;
  knowledge_type: string;
  page_no: number | null;
  chapter_title: string | null;
  quote_text: string;
  version_label: string | null;
};

export type ConversationCitation = {
  sourceId: string;
  sourceTitle: string;
  knowledgeType: string;
  pageNo: number | null;
  chapterTitle: string | null;
  quoteText: string;
  versionLabel: string | null;
};

export type ConversationMessage = {
  messageId: string;
  role: ConversationMessageRole;
  messageType: string;
  contentText: string;
  evidenceFiles?: ConversationEvidenceFile[];
  citations?: ConversationCitation[];
};

export type ConversationMessageDto = {
  message_id: string;
  session_id: string;
  role: ConversationMessageRole;
  message_type: string;
  content_text: string | null;
  content_json?: {
    citations?: ConversationCitationDto[];
  } | null;
};

export type ConversationFollowupSuggestionDto = {
  intent: string;
  text: string;
  suggestion_type: string;
};

export type ConversationFollowupSuggestion = {
  intent: string;
  text: string;
  suggestionType: string;
};

export type PostConversationMessageRequestDto = {
  message: string;
};

export type PostConversationMessageResponseDto = {
  assistant_message: string;
  followup_suggestions: ConversationFollowupSuggestionDto[];
  citations?: ConversationCitationDto[];
  evidence_summary?: string;
};
