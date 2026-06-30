"use client";

import { MoreHorizontal, PencilLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ConversationMenuProps = {
  onDelete?: () => void;
  onRename?: () => void;
};

const MENU_LABEL = "\u4f1a\u8bdd\u64cd\u4f5c";
const RENAME_LABEL = "\u91cd\u547d\u540d";
const DELETE_LABEL = "\u5220\u9664";

export function ConversationMenu({
  onDelete,
  onRename,
}: ConversationMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={MENU_LABEL}
          className="h-8 w-8 rounded-xl"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={onRename}>
          <PencilLine className="mr-2 h-4 w-4" />
          {RENAME_LABEL}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {DELETE_LABEL}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
