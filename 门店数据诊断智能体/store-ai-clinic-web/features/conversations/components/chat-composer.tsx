type ChatComposerProps = {
  value: string;
  isSubmitting?: boolean;
  files: File[];
  uploadError: string | null;
  onFilesSelected: (files: File[]) => void;
  onFileRemove: (fileName: string) => void;
  onClearUploadError: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatComposer({
  value,
  isSubmitting = false,
  files,
  uploadError,
  onFilesSelected,
  onFileRemove,
  onClearUploadError,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/70 bg-white/85 p-4">
      <div className="space-y-3 rounded-[1.25rem] border border-dashed border-border bg-[rgb(var(--surface-secondary))] px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">上传资料</p>
            <p className="mt-1 text-sm text-muted-foreground">
              支持 CSV、XLS、XLSX、PDF，作为本次追问的补充材料一起分析。
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-[rgb(var(--accent))]">
            上传文件
            <input
              aria-label="上传文件"
              accept=".csv,.xls,.xlsx,.pdf"
              className="sr-only"
              multiple
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []);
                if (nextFiles.length > 0) {
                  onClearUploadError();
                  onFilesSelected(nextFiles);
                }
                event.currentTarget.value = "";
              }}
              type="file"
            />
          </label>
        </div>

        {files.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {files.map((file) => (
              <li
                key={`${file.name}:${file.lastModified}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm text-foreground"
              >
                <span>{file.name}</span>
                <button
                  className="text-muted-foreground transition hover:text-foreground"
                  onClick={() => onFileRemove(file.name)}
                  type="button"
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">继续追问</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="例如：为什么下降？哪些时段下降最明显？给店长生成整改方案。"
          className="min-h-28 w-full rounded-[1.25rem] border border-border bg-white px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgba(var(--accent),0.18)]"
        />
      </label>

      {uploadError ? (
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {uploadError}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          支持追问、比较、总结、深挖和引用历史诊断。
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-[rgb(var(--accent))] px-5 py-2.5 text-sm font-medium text-[rgb(var(--accent-foreground))] shadow-[var(--shadow-soft)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "发送中..." : "发送"}
        </button>
      </div>
    </div>
  );
}
