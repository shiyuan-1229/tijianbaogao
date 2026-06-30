import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

import type { ConversationSessionSummary } from "@/entities/conversations/types";

type ConversationListState = {
  sessions: ConversationSessionSummary[];
  replaceSessions: (sessions: ConversationSessionSummary[]) => void;
  prependSession: (session: ConversationSessionSummary) => void;
  updateSession: (
    sessionId: string,
    updater: (session: ConversationSessionSummary) => ConversationSessionSummary,
  ) => void;
  removeSession: (sessionId: string) => void;
  reset: () => void;
};

const initialState = {
  sessions: [],
} satisfies Pick<ConversationListState, "sessions">;

export function createConversationListStore() {
  return createStore<ConversationListState>((set) => ({
    ...initialState,
    replaceSessions: (sessions) => set({ sessions }),
    prependSession: (session) =>
      set((state) => ({ sessions: [session, ...state.sessions] })),
    updateSession: (sessionId, updater) =>
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.sessionId === sessionId ? updater(session) : session,
        ),
      })),
    removeSession: (sessionId) =>
      set((state) => ({
        sessions: state.sessions.filter((session) => session.sessionId !== sessionId),
      })),
    reset: () => set(initialState),
  }));
}

export const conversationListStore = createConversationListStore();

export function useConversationListStore<T>(
  selector: (state: ConversationListState) => T,
) {
  return useStore(conversationListStore, selector);
}
