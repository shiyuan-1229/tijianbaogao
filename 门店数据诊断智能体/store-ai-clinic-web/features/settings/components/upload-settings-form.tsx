"use client";

import { useSettingsStore } from "@/shared/store/settings-store";

export function UploadSettingsForm() {
  const uploads = useSettingsStore((state) => state.uploads);
  const updateUploads = useSettingsStore((state) => state.updateUploads);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-foreground">上传配置</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          设置诊断文件的接入约束，方便运营明确哪些内容可以上传，以及佐证材料会保留多久。
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">文件大小上限</span>
          <select
            value={uploads.maxFileSize}
            onChange={(event) =>
              updateUploads("maxFileSize", event.target.value)
            }
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          >
            <option>25 MB</option>
            <option>50 MB</option>
            <option>100 MB</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">保留周期</span>
          <select
            value={uploads.retentionWindow}
            onChange={(event) =>
              updateUploads("retentionWindow", event.target.value)
            }
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          >
            <option>30 天</option>
            <option>60 天</option>
            <option>90 天</option>
          </select>
        </label>
        <label className="md:col-span-2">
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-white px-4 py-4">
            <input
              type="checkbox"
              checked={uploads.allowScannedImages}
              onChange={(event) =>
                updateUploads("allowScannedImages", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                允许上传未做 OCR 增强的扫描图片
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                如果一线同学经常在门店异常时上传截图或拍照版纸质报表，可以保持开启。
              </p>
            </div>
          </div>
        </label>
      </div>
    </section>
  );
}
