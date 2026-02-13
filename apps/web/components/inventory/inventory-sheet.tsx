"use client";

import { type InventoryItem } from "../avatar-dashboard";
import { Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface InventorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  equippedBySlot: Record<string, string>;
  onEquip: (slot: string, item: any) => void;
}

export function InventorySheet({ isOpen, onClose, items, equippedBySlot, onEquip }: InventorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="h-[75vh] rounded-t-[2rem] nature-panel border-t-0"
      >
        {/* Header */}
        <SheetHeader className="border-b border-ghibli-mist/50 pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl font-display font-bold text-ghibli-ink">
            <Package size={22} className="text-ghibli-forest" />
            나의 가방
          </SheetTitle>
        </SheetHeader>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 p-4 content-start scrollbar-hide">
          {items.map((entry) => {
            const isEquipped = equippedBySlot[entry.item.slot] === entry.item.id;

            return (
              <button
                key={entry.inventoryId}
                onClick={() => onEquip(entry.item.slot, entry.item)}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 group border-2",
                  isEquipped
                    ? "bg-ghibli-forest/10 border-ghibli-forest shadow-inner"
                    : "bg-ghibli-cloud border-transparent shadow-sm hover:shadow-md hover:-translate-y-1"
                )}
              >
                <img
                  src={entry.item.assetWebpUrl}
                  alt={entry.item.name}
                  className="w-[70%] h-[70%] object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
                />

                {isEquipped && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-ghibli-forest rounded-full flex items-center justify-center shadow-md animate-bloom">
                    <Check size={14} className="text-white" strokeWidth={4} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
