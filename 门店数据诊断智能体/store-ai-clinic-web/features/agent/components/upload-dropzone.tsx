"use client";

import { useDropzone } from "react-dropzone";
import {
  getAgentFileId,
  type AgentFileIdentity,
} from "@/features/agent/hooks/use-agent-submit";

type UploadDropzoneProps = {
  files: File[];
  isSubmitting: boolean;
  onFileRemove: (fileId: AgentFileIdentity) => void;
  onFilesSelected: (files: File[]) => void;
};

const ACCEPTED_FILE_TYPES = {
  "text/csv": [".csv"],
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
} as const;

export function UploadDropzone({
  files,
  isSubmitting,
  onFileRemove,
  onFilesSelected,
}: UploadDropzoneProps) {
  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    accept: ACCEPTED_FILE_TYPES,
    disabled: isSubmitting,
    multiple: true,
    noClick: true,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className="rounded-[1.5rem] border border-dashed border-border bg-[rgba(255,255,255,0.5)] p-4"
      >
        <input {...getInputProps()} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              将日报或周报拖到这里
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              支持 CSV、XLS/XLSX、PDF，文件仅在浏览器中保留用于本次请求摘要。
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:border-[rgb(var(--accent))] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={open}
            type="button"
          >
            上传文件
          </button>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {isDragActive ? "松开以上传文件" : "拖拽文件到此区域"}
        </p>
      </div>
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file) => (
            <li
              key={getAgentFileId(file)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
            >
              <span>{file.name}</span>
              <button
                aria-label={`移除 ${file.name}`}
                className="text-muted-foreground transition hover:text-foreground"
                onClick={() => onFileRemove(getAgentFileId(file))}
                type="button"
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
