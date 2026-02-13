"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { createBaseLayers, type EquipSlot, type LayerRecord } from "../lib/avatar";
import { GameLayout, type GameScene } from "./game-layout";
import { CharacterScene } from "./scenes/character-scene";
import { MyRoom } from "./scenes/my-room";
import { ShopScene } from "./scenes/shop-scene";
import styles from "./avatar-dashboard.module.css";

type SlotFilter = "all" | EquipSlot;

interface EquippedItem {
  slot: string;
  itemId: string;
  name: string;
}

interface AvatarResponse {
  userId: string;
  canvas: {
    width: number;
    height: number;
  };
  anchor: {
    x: number;
    y: number;
  };
  layers: LayerRecord;
  equipped: EquippedItem[];
}

interface ShopItem {
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

interface InventoryItem {
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

interface EquipResponse {
  ok: boolean;
  layers: LayerRecord;
  equipped: EquippedItem[];
}

interface EquipSyncPayload {
  hostUserId: string;
  userId: string;
  layers: LayerRecord;
  equipped: EquippedItem[];
  ts: number;
}

interface EquipSyncClientEvents {
  "room:join": (payload: { hostUserId: string }) => void;
  "room:leave": (payload: { hostUserId: string }) => void;
  "avatar:equip": (payload: Omit<EquipSyncPayload, "userId">) => void;
}

interface EquipSyncServerEvents {
  "avatar:equip": (payload: EquipSyncPayload) => void;
}

interface AvatarDashboardProps {
  initialScene?: GameScene;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "예상하지 못한 오류가 발생했습니다.";
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store"
  });

  let payload: unknown = null;
  if (response.headers.get("content-type")?.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    const apiError =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "")
        : "";
    throw new Error(apiError || `요청에 실패했습니다. (${response.status})`);
  }

  return payload as T;
}

export function AvatarDashboard({ initialScene = "home" }: AvatarDashboardProps) {
  const router = useRouter();
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all");

  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<AvatarResponse | null>(null);

  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopData, setShopData] = useState<ShopResponse | null>(null);

  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryResponse | null>(null);

  const [purchasePendingItemId, setPurchasePendingItemId] = useState<string | null>(null);
  const [equipPendingItemId, setEquipPendingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const equipSyncSocketRef = useRef<Socket<EquipSyncServerEvents, EquipSyncClientEvents> | null>(null);

  const refreshAvatar = useCallback(async () => {
    setAvatarLoading(true);
    setAvatarError(null);

    try {
      const data = await requestJson<AvatarResponse>("/api/avatar/me");
      setAvatarData(data);
    } catch (error) {
      setAvatarError(getErrorMessage(error));
    } finally {
      setAvatarLoading(false);
    }
  }, []);

  const refreshShop = useCallback(async (filter: SlotFilter) => {
    setShopLoading(true);
    setShopError(null);

    try {
      const params = new URLSearchParams({ limit: "24" });
      if (filter !== "all") {
        params.set("slot", filter);
      }

      const data = await requestJson<ShopResponse>(`/api/shop/items?${params.toString()}`);
      setShopData(data);
    } catch (error) {
      setShopError(getErrorMessage(error));
    } finally {
      setShopLoading(false);
    }
  }, []);

  const refreshInventory = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError(null);

    try {
      const data = await requestJson<InventoryResponse>("/api/inventory");
      setInventoryData(data);
    } catch (error) {
      setInventoryError(getErrorMessage(error));
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAvatar();
    void refreshInventory();
  }, [refreshAvatar, refreshInventory]);

  useEffect(() => {
    void refreshShop(slotFilter);
  }, [refreshShop, slotFilter]);

  const ownedItemIds = useMemo(() => {
    return new Set(inventoryData?.items.map((entry) => entry.item.id) ?? []);
  }, [inventoryData]);

  const equippedBySlot = useMemo(() => {
    return inventoryData?.equippedBySlot ?? {};
  }, [inventoryData]);

  const previewLayers = useMemo(() => {
    return avatarData?.layers ?? createBaseLayers();
  }, [avatarData]);

  const hasAvatar = useMemo(() => {
    const hasEquipped = (avatarData?.equipped.length ?? 0) > 0;
    const hasOwnedItems = (inventoryData?.items.length ?? 0) > 0;
    return hasEquipped || hasOwnedItems;
  }, [avatarData, inventoryData]);

  const gems = useMemo(() => {
    if (inventoryData?.credits === undefined) {
      return null;
    }
    return Math.floor(inventoryData.credits / 100);
  }, [inventoryData]);

  useEffect(() => {
    const hostUserId = avatarData?.userId?.trim();
    if (!hostUserId) {
      return;
    }

    let isDisposed = false;

    const connect = async () => {
      try {
        const tokenResponse = await fetch("/api/socket/token", { cache: "no-store" });
        if (!tokenResponse.ok) {
          return;
        }

        const tokenPayload = (await tokenResponse.json()) as { token?: string };
        if (!tokenPayload.token || isDisposed) {
          return;
        }

        const socketBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4002";
        const socket: Socket<EquipSyncServerEvents, EquipSyncClientEvents> = io(`${socketBaseUrl}/presence`, {
          auth: { token: tokenPayload.token },
          transports: ["websocket", "polling"]
        });

        equipSyncSocketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("room:join", { hostUserId });
        });

        socket.on("avatar:equip", (payload) => {
          if (payload.userId !== hostUserId) {
            return;
          }

          setAvatarData((prev) => {
            if (!prev) {
              return prev;
            }

            return {
              ...prev,
              layers: payload.layers,
              equipped: payload.equipped
            };
          });
        });
      } catch {
        // Keep UI functional even when real-time sync is unavailable.
      }
    };

    void connect();

    return () => {
      isDisposed = true;
      const socket = equipSyncSocketRef.current;
      if (!socket) {
        return;
      }

      if (socket.connected) {
        socket.emit("room:leave", { hostUserId });
      }
      socket.disconnect();
      equipSyncSocketRef.current = null;
    };
  }, [avatarData?.userId]);

  const handlePurchase = useCallback(
    async (item: ShopItem) => {
      setActionError(null);
      setActionNotice(null);
      setPurchasePendingItemId(item.id);

      try {
        await requestJson("/api/shop/purchase", {
          method: "POST",
          body: JSON.stringify({ itemId: item.id })
        });

        setActionNotice(`${item.name} 구매가 완료되었습니다.`);
        await Promise.all([refreshInventory(), refreshShop(slotFilter)]);
      } catch (error) {
        setActionError(getErrorMessage(error));
      } finally {
        setPurchasePendingItemId(null);
      }
    },
    [refreshInventory, refreshShop, slotFilter]
  );

  const handleEquip = useCallback(
    async (slot: EquipSlot, item: InventoryItem["item"]) => {
      setActionError(null);
      setActionNotice(null);
      setEquipPendingItemId(item.id);

      try {
        const response = await requestJson<EquipResponse>("/api/avatar/equip", {
          method: "POST",
          body: JSON.stringify({ slot, itemId: item.id })
        });

        setAvatarData((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            layers: response.layers,
            equipped: response.equipped
          };
        });

        setActionNotice(`${item.name} 착용이 적용되었습니다.`);

        const hostUserId = avatarData?.userId?.trim();
        const syncSocket = equipSyncSocketRef.current;
        if (hostUserId && syncSocket?.connected) {
          syncSocket.emit("avatar:equip", {
            hostUserId,
            layers: response.layers,
            equipped: response.equipped,
            ts: Date.now()
          });
        }

        await refreshInventory();
      } catch (error) {
        setActionError(getErrorMessage(error));
      } finally {
        setEquipPendingItemId(null);
      }
    },
    [avatarData?.userId, refreshInventory]
  );

  return (
    <GameLayout scene={initialScene} coins={inventoryData?.credits ?? null} gems={gems}>
      {actionError ? <p className={`${styles.toast} ${styles.toastError}`}>{actionError}</p> : null}
      {actionNotice ? <p className={`${styles.toast} ${styles.toastNotice}`}>{actionNotice}</p> : null}

      {initialScene === "home" ? (
        <MyRoom
          layers={previewLayers}
          loading={avatarLoading}
          error={avatarError}
          hasAvatar={hasAvatar}
          onOpenCharacter={() => router.push("/character")}
          onCreateAvatar={() => setActionNotice("아바타 생성 기능은 곧 제공될 예정입니다.")}
        />
      ) : null}

      {initialScene === "shop" ? (
        <ShopScene
          slotFilter={slotFilter}
          items={shopData?.items ?? []}
          loading={shopLoading}
          error={shopError}
          ownedItemIds={ownedItemIds}
          purchasePendingItemId={purchasePendingItemId}
          onChangeFilter={setSlotFilter}
          onPurchase={(item) => void handlePurchase(item)}
        />
      ) : null}

      {initialScene === "square" ? (
        <section className={styles.squareScene}>
          <p className={styles.squareBadge}>멀티플레이 준비중</p>
          <h1>광장</h1>
          <p>다음 업데이트에서 다른 유저와 만나는 공간이 열립니다.</p>
          <div className={styles.squareQuick}>
            <div className={styles.squareCard}>실시간 아바타 표시</div>
            <div className={styles.squareCard}>근처 유저 채팅 버블</div>
          </div>
        </section>
      ) : null}

      {initialScene === "character" ? (
        <CharacterScene
          layers={previewLayers}
          loading={inventoryLoading}
          error={inventoryError}
          items={inventoryData?.items ?? []}
          equippedBySlot={equippedBySlot}
          equipPendingItemId={equipPendingItemId}
          actionError={actionError}
          actionNotice={actionNotice}
          onEquip={(slot, item) => void handleEquip(slot, item)}
        />
      ) : null}
    </GameLayout>
  );
}
