import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

import type { ConversationMessage } from "@/entities/conversations/types";

type ConversationThreadState = {
  messages: ConversationMessage[];
  replaceMessages: (messages: ConversationMessage[]) => void;
  appendMessage: (message: ConversationMessage) => void;
  reset: () => void;
};

const initialState = {
  messages: [],
} satisfies Pick<ConversationThreadState, "messages">;

export function createConversationThreadStore() {
  return createStore<ConversationThreadState>((set) => ({
    ...initialState,
    replaceMessages: (messages) => set({ messages }),
    appendMessage: (message) =>
      set((state) => ({ messages: [...state.messages, message] })),
    reset: () => set(initialState),
  }));
}

export const conversationThreadStore = createConversationThreadStore();

export function useConversationThreadStore<T>(
  selector: (state: ConversationThreadState) => T,
) {
  return useStore(conversationThreadStore, selector);
}
