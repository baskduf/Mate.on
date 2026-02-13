"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { createBaseLayers, type EquipSlot, type LayerRecord } from "../lib/avatar";
import { toast } from "sonner";
import { GameLayout } from "./game-layout";
import { MyRoom } from "./scenes/my-room";
import { ShopScene } from "./scenes/shop-scene";
import { InventorySheet } from "./inventory/inventory-sheet";

// Interface definitions kept for clarity, though could be moved to types
type SlotFilter = "all" | EquipSlot;

export interface ShopItem {
  id: string;
  slot: string;
  name: string;
  rarity: string;
  price: number;
  assetWebpUrl: string;
  assetPngUrl: string | null;
  isActive: boolean;
}

interface ShopResponse {
  items: ShopItem[];
  nextCursor: string | null;
}

export interface InventoryItem {
  inventoryId: string;
  acquiredAt: string;
  equipped: boolean;
  item: {
    id: string;
    slot: string;
    name: string;
    rarity: string;
    price: number;
    assetWebpUrl: string;
    assetPngUrl: string | null;
    isActive: boolean;
  };
}

interface InventoryResponse {
  userId: string;
  credits: number;
  equippedBySlot: Record<string, string>;
  items: InventoryItem[];
}

interface AvatarResponse {
  userId: string;
  layers: LayerRecord;
  equipped: any[];
}

interface EquipResponse {
  ok: boolean;
  layers: LayerRecord;
  equipped: any[];
}

interface EquipSyncEvents {
  "avatar:equip": (payload: any) => void;
  "room:join": (payload: any) => void;
  "room:leave": (payload: any) => void;
}

interface AvatarDashboardProps {
  initialScene?: "home" | "shop" | "square" | "menu" | "character";
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export function AvatarDashboard({ initialScene = "home" }: AvatarDashboardProps) {
  const router = useRouter();

  // State
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all");
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  // Data
  const [avatarData, setAvatarData] = useState<AvatarResponse | null>(null);
  const [shopData, setShopData] = useState<ShopResponse | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryResponse | null>(null);

  // Loading/Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // --- Fetchers ---
  const refreshAll = useCallback(async () => {
    try {
      const [avatar, inventory] = await Promise.all([
        requestJson<AvatarResponse>("/api/avatar/me"),
        requestJson<InventoryResponse>("/api/inventory")
      ]);
      setAvatarData(avatar);
      setInventoryData(inventory);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshShop = useCallback(async (filter: string) => {
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (filter !== "all") params.set("slot", filter);
      const data = await requestJson<ShopResponse>(`/api/shop/items?${params.toString()}`);
      setShopData(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    void refreshAll().then(() => setLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    void refreshShop(slotFilter);
  }, [refreshShop, slotFilter]);

  // Socket Sync (Desktop)
  useEffect(() => {
    if (!avatarData?.userId) return;

    const connect = async () => {
      try {
        const { token } = await requestJson<{ token: string }>("/api/socket/token");
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4002", {
          auth: { token },
          transports: ["websocket"]
        });

        socketRef.current = socket;
        socket.emit("room:join", { hostUserId: avatarData.userId });
      } catch (e) {
        console.warn("Socket connect failed", e);
      }
    };

    void connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [avatarData?.userId]);

  // --- Handlers ---
  const handlePurchase = async (item: ShopItem) => {
    setPendingItemId(item.id);
    try {
      await requestJson("/api/shop/purchase", {
        method: "POST",
        body: JSON.stringify({ itemId: item.id })
      });
      await Promise.all([refreshAll(), refreshShop(slotFilter)]);
      toast.success(`${item.name} 구매 완료!`);
    } catch (e) {
      toast.error("구매에 실패했어요");
    } finally {
      setPendingItemId(null);
    }
  };

  const handleEquip = async (slot: string, item: any) => {
    try {
      const res = await requestJson<EquipResponse>("/api/avatar/equip", {
        method: "POST",
        body: JSON.stringify({ slot, itemId: item.id })
      });

      // Optimistic update
      setAvatarData(prev => prev ? ({ ...prev, layers: res.layers }) : null);

      // Socket sync
      socketRef.current?.emit("avatar:equip", {
        hostUserId: avatarData?.userId,
        layers: res.layers,
        equipped: res.equipped,
        ts: Date.now()
      });

      await refreshAll();
    } catch (e) {
      toast.error("착용에 실패했어요");
    }
  };

  // --- Derived State ---
  const previewLayers = useMemo(() => {
    const layers = avatarData?.layers ?? createBaseLayers();
    // Ensure all values are strings (remove nulls)
    return Object.fromEntries(
      Object.entries(layers).filter(([_, v]) => v !== null)
    ) as Record<string, string>;
  }, [avatarData]);

  const ownedIds = useMemo(() => new Set(inventoryData?.items.map(i => i.item.id)), [inventoryData]);
  const hasAvatar = useMemo(() => Boolean(avatarData?.equipped?.length), [avatarData?.equipped]);

  // --- Render ---
  const searchParams = useSearchParams(); // Needs import from next/navigation
  const isOverlay = searchParams.get("overlay") === "1";

  return (
    <GameLayout>
      {initialScene === "home" && (
        <MyRoom
          layers={previewLayers}
          hasAvatar={hasAvatar}
          loading={loading}
          onOpenInventory={() => setIsInventoryOpen(true)}
          onCreateAvatar={() => router.push("/create-avatar")}
          isOverlay={isOverlay}
        />
      )}

      {initialScene === "shop" && (
        <ShopScene
          items={shopData?.items ?? []}
          loading={!shopData}
          error={null}
          ownedItemIds={ownedIds}
          purchasePendingItemId={pendingItemId}
          slotFilter={slotFilter}
          onChangeFilter={(filter) => setSlotFilter(filter as SlotFilter)}
          onPurchase={handlePurchase}
        />
      )}

      {(initialScene === "square" || initialScene === "menu") && (
        <div className="flex h-full items-center justify-center flex-col p-8 text-center">
          <h1 className="text-2xl font-bold font-display text-ghibli-sunset mb-2">준비 중이에요</h1>
          <p className="text-ghibli-ink-light">멋진 기능이 곧 찾아올 거예요!</p>
        </div>
      )}

      <InventorySheet
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        items={inventoryData?.items ?? []}
        equippedBySlot={inventoryData?.equippedBySlot ?? {}}
        onEquip={handleEquip}
      />
    </GameLayout>
  );
}
