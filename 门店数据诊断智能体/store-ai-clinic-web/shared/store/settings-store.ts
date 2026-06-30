import { create } from "zustand";

type ModelSettings = {
  defaultModel: string;
  responseTone: string;
  escalationPolicy: string;
};

type UploadSettings = {
  maxFileSize: string;
  retentionWindow: string;
  allowScannedImages: boolean;
};

type NotificationSettings = {
  recipients: string;
  digestCadence: string;
  alertOnFailure: boolean;
};

type SettingsStoreState = {
  model: ModelSettings;
  uploads: UploadSettings;
  notifications: NotificationSettings;
  updateModel: <K extends keyof ModelSettings>(
    field: K,
    value: ModelSettings[K],
  ) => void;
  updateUploads: <K extends keyof UploadSettings>(
    field: K,
    value: UploadSettings[K],
  ) => void;
  updateNotifications: <K extends keyof NotificationSettings>(
    field: K,
    value: NotificationSettings[K],
  ) => void;
  reset: () => void;
};

const initialState = {
  model: {
    defaultModel: "gpt-4.1",
    responseTone: "直接、适合门店运营阅读",
    escalationPolicy: "严重异常自动升级",
  },
  uploads: {
    maxFileSize: "25 MB",
    retentionWindow: "30 天",
    allowScannedImages: true,
  },
  notifications: {
    recipients:
      "ops-leads@northwind.example, area-managers@northwind.example",
    digestCadence: "每日摘要",
    alertOnFailure: true,
  },
} satisfies Pick<SettingsStoreState, "model" | "uploads" | "notifications">;

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  ...initialState,
  updateModel: (field, value) =>
    set((state) => ({
      model: {
        ...state.model,
        [field]: value,
      },
    })),
  updateUploads: (field, value) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [field]: value,
      },
    })),
  updateNotifications: (field, value) =>
    set((state) => ({
      notifications: {
        ...state.notifications,
        [field]: value,
      },
    })),
  reset: () => set(initialState),
}));
