"use client";

import { useRef, useState } from "react";

import type { DiagnosisRunRequestDto, DiagnosisType, DiagnosisRunResponseDto } from "@/entities/agent/types";
import { useAgentSessionStore } from "@/shared/store/agent-session-store";

export type AgentFileIdentity = string;

export function getAgentFileId(file: File): AgentFileIdentity {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function inferDiagnosisType(files: File[], draft: string): DiagnosisType {
  const hasWeeklyFile = files.some((file) => /周|weekly/i.test(file.name));
  return hasWeeklyFile || /周报|每周/.test(draft) ? "weekly" : "daily";
}

function createDraftTaskId(type: DiagnosisType) {
  return `task-${type}-${Date.now()}`;
}

function readErrorDetail(
  data: DiagnosisRunResponseDto | { detail?: string } | undefined,
) {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return null;
  }

  return typeof data.detail === "string" ? data.detail : null;
}

export function useAgentSubmit() {
  const draft = useAgentSessionStore((state) => state.draft);
  const addTimelineEvent = useAgentSessionStore((state) => state.addTimelineEvent);
  const applyDiagnosisRun = useAgentSessionStore((state) => state.applyDiagnosisRun);

  const submittingRef = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onFilesSelected = (incomingFiles: File[]) => {
    setFiles((current) => {
      const next = [...current];
      for (const file of incomingFiles) {
        const fileId = getAgentFileId(file);
        if (!next.some((item) => getAgentFileId(item) === fileId)) {
          next.push(file);
        }
      }
      return next;
    });
  };

  const onFileRemove = (fileId: AgentFileIdentity) => {
    setFiles((current) => current.filter((file) => getAgentFileId(file) !== fileId));
  };

  const submit = async () => {
    if (submittingRef.current) {
      return;
    }

    const trimmedDraft = draft.trim();

    if (!trimmedDraft && files.length === 0) {
      setErrorMessage("先输入问题或上传报表，AI 才能开始分析。");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const diagnosisType = inferDiagnosisType(files, trimmedDraft);
    const taskId = createDraftTaskId(diagnosisType);

    addTimelineEvent({
      id: `${taskId}:input`,
      label: files.length > 0 ? `已接收 ${files.length} 份资料` : "已接收你的问题",
      state: "done",
      detail: trimmedDraft || "等待 AI 根据已上传资料归纳重点。",
    });
    addTimelineEvent({
      id: `${taskId}:analysis`,
      label: "AI 正在分析经营表现",
      state: "running",
      detail: "正在整理关键波动、定位原因并生成建议。",
    });

    const payload: DiagnosisRunRequestDto = {
      task_id: taskId,
      store_id: "store-ai-clinic-demo",
      diagnosis_type: diagnosisType,
      context: trimmedDraft || "请根据上传的日报与周报生成门店诊断。",
    };

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => undefined)) as
        | DiagnosisRunResponseDto
        | { detail?: string }
        | undefined;

      if (!response.ok || !data || !("task_id" in data)) {
        throw new Error(
          readErrorDetail(data) ?? "AI 分析服务暂时不可用。",
        );
      }

      applyDiagnosisRun(data);
    } catch {
      setErrorMessage("AI 分析服务暂时不可用，系统会稍后重试。");
      addTimelineEvent({
        id: `${taskId}:error`,
        label: "本轮分析未完成",
        state: "error",
        detail: "服务暂时不可用，请稍后再次发起分析。",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    errorMessage,
    files,
    isSubmitting,
    onFileRemove,
    onFilesSelected,
    submit,
  };
}
