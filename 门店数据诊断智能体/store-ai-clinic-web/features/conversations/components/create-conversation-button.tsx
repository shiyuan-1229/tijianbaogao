"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type CreateConversationButtonProps = {
  onCreateConversation?: () => void;
  fullWidth?: boolean;
  label?: string;
};

export function CreateConversationButton({
  onCreateConversation,
  fullWidth = false,
  label = "+ 新建会话",
}: CreateConversationButtonProps) {
  return (
    <Button
      onClick={onCreateConversation}
      className={fullWidth ? "w-full" : undefined}
      aria-label={label}
    >
      {!label.startsWith("+") ? <Plus className="h-4 w-4" /> : null}
      <span>{label}</span>
    </Button>
  );
}
