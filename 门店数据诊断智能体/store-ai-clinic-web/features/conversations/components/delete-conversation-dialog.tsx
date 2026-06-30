"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteConversationDialogProps = {
  conversationTitle?: string;
  onConfirm?: () => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

const DELETE_TITLE = "\u786e\u8ba4\u5220\u9664\u8be5\u4f1a\u8bdd\uff1f";
const DELETE_DESC = "\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002";
const CANCEL_LABEL = "\u53d6\u6d88";
const CONFIRM_LABEL = "\u5220\u9664";

export function DeleteConversationDialog({
  conversationTitle,
  onConfirm,
  onOpenChange,
  open = false,
}: DeleteConversationDialogProps) {
  const description = conversationTitle
    ? `\u786e\u8ba4\u5220\u9664\u201c${conversationTitle}\u201d\uff1f${DELETE_DESC}`
    : `${DELETE_TITLE}${DELETE_DESC}`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{DELETE_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{CANCEL_LABEL}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{CONFIRM_LABEL}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
