"use client";

import { motion } from "framer-motion";
import { type ShopItem } from "../avatar-dashboard";
import { cn } from "@/lib/utils";
import { Leaf, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { NatureBackground } from "@/components/ui/nature-background";

interface ShopSceneProps {
  items: ShopItem[];
  loading: boolean;
  error: string | null;
  ownedItemIds: Set<string>;
  purchasePendingItemId: string | null;
  slotFilter: string;
  onChangeFilter: (filter: string) => void;
  onPurchase: (item: ShopItem) => void;
}

const FILTERS = [
  { id: "all", label: "\uC804\uCCB4" },
  { id: "hair", label: "\uD5E4\uC5B4" },
  { id: "eyebrow", label: "\uB208\uC379" },
  { id: "eyes", label: "\uB208" },
  { id: "nose", label: "\uCF54" },
  { id: "mouth", label: "\uC785" },
  { id: "top", label: "\uC0C1\uC758" },
  { id: "bottom", label: "\uD558\uC758" },
  { id: "accessory", label: "\uC545\uC138" },
  { id: "effect", label: "\uC774\uD399\uD2B8" }
] as const;

const LABEL = {
  title: "\uC0C1\uC810",
  subtitle: "\uC0C8\uB85C\uC6B4 \uC544\uC774\uD15C\uC774 \uB3C4\uCC29\uD588\uC5B4\uC694!",
  owned: "\uBCF4\uC720\uC911",
  buying: "\uAD6C\uB9E4 \uC911...",
  bought: "\uAD6C\uB9E4\uC644\uB8CC",
  buy: "\uAD6C\uB9E4\uD558\uAE30"
};

export function ShopScene({
  items,
  loading,
  error,
  ownedItemIds,
  purchasePendingItemId,
  slotFilter,
  onChangeFilter,
  onPurchase
}: ShopSceneProps) {
  return (
    <div className="relative w-full h-full flex flex-col pt-20 pb-28 px-0 overflow-hidden">
      <NatureBackground variant="sunset" />

      <div className="relative px-6 mb-6">
        <h1 className="text-3xl font-display font-bold text-ghibli-ink flex items-center gap-2">
          {LABEL.title}{" "}
          <Badge variant="outline" className="text-ghibli-sunset border-ghibli-sunset/40 text-xs">
            New
          </Badge>
        </h1>
        <p className="text-ghibli-ink-light text-sm mt-1 flex items-center gap-1">
          <ShoppingBag size={14} />
          {LABEL.subtitle}
        </p>
      </div>

      <div className="relative pl-6 mb-6 overflow-x-auto pb-4 scrollbar-hide flex gap-3">
        {FILTERS.map((filter) => {
          const isActive = slotFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onChangeFilter(filter.id)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 relative",
                isActive
                  ? "text-white shadow-lg scale-105"
                  : "bg-ghibli-cloud text-ghibli-ink-light hover:bg-ghibli-cloud-deep border border-ghibli-mist/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-shop-tab"
                  className="absolute inset-0 bg-ghibli-forest rounded-2xl -z-10"
                  style={{ boxShadow: "0 4px 12px rgba(74, 124, 89, 0.3)" }}
                />
              )}
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="relative flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-3xl" />)
          ) : error ? (
            <p className="col-span-2 text-center text-sm text-rose-700">{error}</p>
          ) : (
            items.map((item) => {
              const isOwned = ownedItemIds.has(item.id);
              const isPending = purchasePendingItemId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative watercolor-card p-3 flex flex-col items-center group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-ghibli-cloud via-transparent to-ghibli-meadow/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[var(--radius)]" />

                  <div className="w-full aspect-square relative mb-3 bg-ghibli-cloud-deep/40 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-radial from-white/60 to-transparent" />
                    <img
                      src={item.assetWebpUrl}
                      alt={item.name}
                      className="w-[90%] h-[90%] object-contain drop-shadow-md relative z-10 transition-transform group-hover:scale-110 duration-300"
                    />
                    {isOwned && (
                      <div className="absolute inset-0 bg-ghibli-cloud/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                        <Badge variant="secondary" className="bg-ghibli-earth text-white text-xs shadow-md">
                          {LABEL.owned}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="w-full px-1 text-center mb-3">
                    <h3 className="text-sm font-bold text-ghibli-ink truncate">{item.name}</h3>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Leaf size={12} className="text-ghibli-forest" />
                      <span className="font-bold text-ghibli-ink text-sm">{item.price}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => !isOwned && !isPending && onPurchase(item)}
                    disabled={isOwned || isPending}
                    className={cn(
                      "w-full py-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden btn-organic",
                      isOwned
                        ? "bg-ghibli-cloud-deep text-ghibli-ink-light cursor-default"
                        : "bg-ghibli-forest text-white shadow-md active:scale-95 group-hover:bg-ghibli-sunset"
                    )}
                  >
                    {isPending ? LABEL.buying : isOwned ? LABEL.bought : LABEL.buy}
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
