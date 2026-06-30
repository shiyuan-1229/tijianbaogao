import { create } from "zustand";

import type { TaskResultViewModel } from "@/entities/tasks/types";

type TasksStoreState = {
  selectedTaskId: string | null;
  tasks: TaskResultViewModel[];
  replaceTasks: (tasks: TaskResultViewModel[]) => void;
  upsertTask: (task: TaskResultViewModel) => void;
  selectTask: (taskId: string | null) => void;
  reset: () => void;
};

const initialState = {
  selectedTaskId: null,
  tasks: [],
} satisfies Pick<TasksStoreState, "selectedTaskId" | "tasks">;

export const useTasksStore = create<TasksStoreState>((set) => ({
  ...initialState,
  replaceTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((state) => {
      const index = state.tasks.findIndex((item) => item.id === task.id);

      if (index === -1) {
        return { tasks: [task, ...state.tasks] };
      }

      const tasks = [...state.tasks];
      tasks[index] = task;
      return { tasks };
    }),
  selectTask: (taskId) => set({ selectedTaskId: taskId }),
  reset: () => set(initialState),
}));
