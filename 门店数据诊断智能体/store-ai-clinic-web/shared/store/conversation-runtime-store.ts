import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

import type { ConversationFollowupSuggestion } from "@/entities/conversations/types";

type ConversationRuntimeState = {
  activeSessionId: string | null;
  composerDraft: string;
  suggestions: ConversationFollowupSuggestion[];
  isSubmitting: boolean;
  selectedFiles: File[];
  uploadError: string | null;
  pendingCreateConfirm: boolean;
  deleteTargetSessionId: string | null;
  renamingSessionId: string | null;
  setActiveSessionId: (sessionId: string | null) => void;
  setComposerDraft: (draft: string) => void;
  replaceSuggestions: (
    suggestions: ConversationFollowupSuggestion[],
  ) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setSelectedFiles: (files: File[]) => void;
  clearSelectedFiles: () => void;
  removeSelectedFile: (fileName: string) => void;
  setUploadError: (error: string | null) => void;
  setPendingCreateConfirm: (pendingCreateConfirm: boolean) => void;
  setDeleteTargetSessionId: (sessionId: string | null) => void;
  setRenamingSessionId: (sessionId: string | null) => void;
  resetRuntime: () => void;
};

const initialState = {
  activeSessionId: null,
  composerDraft: "",
  suggestions: [],
  isSubmitting: false,
  selectedFiles: [],
  uploadError: null,
  pendingCreateConfirm: false,
  deleteTargetSessionId: null,
  renamingSessionId: null,
} satisfies Pick<
  ConversationRuntimeState,
  | "activeSessionId"
  | "composerDraft"
  | "deleteTargetSessionId"
  | "isSubmitting"
  | "pendingCreateConfirm"
  | "renamingSessionId"
  | "selectedFiles"
  | "suggestions"
  | "uploadError"
>;

export function createConversationRuntimeStore() {
  return createStore<ConversationRuntimeState>((set) => ({
    ...initialState,
    setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
    setComposerDraft: (composerDraft) => set({ composerDraft }),
    replaceSuggestions: (suggestions) => set({ suggestions }),
    setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
    setSelectedFiles: (files) =>
      set((state) => ({
        selectedFiles: [...state.selectedFiles, ...files],
      })),
    clearSelectedFiles: () => set({ selectedFiles: [], uploadError: null }),
    removeSelectedFile: (fileName) =>
      set((state) => ({
        selectedFiles: state.selectedFiles.filter((file) => file.name !== fileName),
      })),
    setUploadError: (uploadError) => set({ uploadError }),
    setPendingCreateConfirm: (pendingCreateConfirm) =>
      set({ pendingCreateConfirm }),
    setDeleteTargetSessionId: (deleteTargetSessionId) =>
      set({ deleteTargetSessionId }),
    setRenamingSessionId: (renamingSessionId) => set({ renamingSessionId }),
    resetRuntime: () =>
      set((state) => ({
        ...initialState,
        activeSessionId: state.activeSessionId,
      })),
  }));
}

export const conversationRuntimeStore = createConversationRuntimeStore();

export function useConversationRuntimeStore<T>(
  selector: (state: ConversationRuntimeState) => T,
) {
  return useStore(conversationRuntimeStore, selector);
}
