import { create } from "zustand";

type WorkspaceState = {
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  selectedBrandId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSelectedBrandId: (id: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sidebarOpen: true,
  mobileNavOpen: false,
  selectedBrandId: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setSelectedBrandId: (id) => set({ selectedBrandId: id }),
}));
