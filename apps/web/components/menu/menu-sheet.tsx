"use client";

import { Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface MenuSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenInventory: () => void;
}

export function MenuSheet({ open, onClose, onOpenInventory }: MenuSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="h-auto max-h-[60vh] rounded-t-[2rem] nature-panel border-t-0"
      >
        <SheetHeader className="border-b border-ghibli-mist/50 pb-4">
          <SheetTitle className="font-display font-bold text-xl text-ghibli-ink">메뉴</SheetTitle>
          <SheetDescription className="text-ghibli-ink-light text-sm">
            원하는 기능을 선택하세요
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 p-4">
          <Button
            variant="nature"
            size="lg"
            className="w-full justify-start gap-3 text-base"
            onClick={() => {
              onClose();
              onOpenInventory();
            }}
          >
            <Package size={20} className="text-ghibli-forest" />
            인벤토리
          </Button>
          <Button
            variant="nature"
            size="lg"
            className="w-full justify-start gap-3 text-base"
            disabled
          >
            <User size={20} className="text-ghibli-ink-light" />
            프로필 (준비중)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
