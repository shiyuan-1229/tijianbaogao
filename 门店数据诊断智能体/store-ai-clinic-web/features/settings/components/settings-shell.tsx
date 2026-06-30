"use client";

import { ModelSettingsForm } from "@/features/settings/components/model-settings-form";
import { NotificationSettingsForm } from "@/features/settings/components/notification-settings-form";
import { UploadSettingsForm } from "@/features/settings/components/upload-settings-form";
import { useSettingsStore } from "@/shared/store/settings-store";
import { PageHeader } from "@/shared/ui/page-header";

export function SettingsShell() {
  const defaultModel = useSettingsStore((state) => state.model.defaultModel);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="设置"
        title="调整 AI 协作方式与运营偏好"
        description="这里只保留会影响诊断体验和团队协作方式的关键设置，减少对系统实现细节的暴露。"
        actions={
          <div
            aria-label="当前模型设置"
            className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm text-muted-foreground"
          >
            当前模型：{formatModelLabel(defaultModel)}
          </div>
        }
      />

      <div className="grid gap-6">
        <ModelSettingsForm />
        <UploadSettingsForm />
        <NotificationSettingsForm />
      </div>
    </div>
  );
}

function formatModelLabel(model: string) {
  if (model === "gpt-4.1") {
    return "GPT-4.1";
  }

  if (model === "gpt-4o") {
    return "GPT-4o";
  }

  if (model === "o4-mini") {
    return "o4-mini";
  }

  return model;
}
