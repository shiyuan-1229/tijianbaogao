"use client";

import { useSettingsStore } from "@/shared/store/settings-store";

export function NotificationSettingsForm() {
  const notifications = useSettingsStore((state) => state.notifications);
  const updateNotifications = useSettingsStore(
    (state) => state.updateNotifications,
  );

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-foreground">通知</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          把摘要与失败提醒分发给对应团队，不要求每次诊断都必须进入工作区查看。
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">接收人</span>
          <textarea
            value={notifications.recipients}
            onChange={(event) =>
              updateNotifications("recipients", event.target.value)
            }
            rows={3}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">摘要频率</span>
            <select
              value={notifications.digestCadence}
              onChange={(event) =>
                updateNotifications("digestCadence", event.target.value)
              }
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
            >
              <option>每日摘要</option>
              <option>每日两次</option>
              <option>每周摘要</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-[1.5rem] border border-border bg-white px-4 py-4">
            <input
              type="checkbox"
              checked={notifications.alertOnFailure}
              onChange={(event) =>
                updateNotifications("alertOnFailure", event.target.checked)
              }
              className="h-4 w-4 rounded border-border"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                诊断运行失败时提醒
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                当上传或后端调用卡住时，立即发送提醒。
              </p>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}
