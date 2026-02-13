"use client";

import { type EquipSlot, isEquipSlot } from "../../lib/avatar";
import styles from "./shop-scene.module.css";

type SlotFilter = "all" | EquipSlot;

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

interface ShopSceneProps {
  slotFilter: SlotFilter;
  items: ShopItem[];
  loading: boolean;
  error: string | null;
  ownedItemIds: Set<string>;
  purchasePendingItemId: string | null;
  onChangeFilter: (filter: SlotFilter) => void;
  onPurchase: (item: ShopItem) => void;
}

const SLOT_FILTERS: Array<{ value: SlotFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "hair", label: "헤어" },
  { value: "top", label: "상의" },
  { value: "bottom", label: "하의" },
  { value: "accessory", label: "악세" },
  { value: "effect", label: "이펙트" }
];

const SLOT_LABELS: Record<EquipSlot, string> = {
  hair: "헤어",
  top: "상의",
  bottom: "하의",
  accessory: "악세",
  effect: "이펙트"
};

const RARITY_CLASS: Record<string, string> = {
  common: styles.rarityCommon,
  rare: styles.rarityRare,
  epic: styles.rarityEpic,
  legendary: styles.rarityLegendary
};

function rarityLabel(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized === "common") {
    return "일반";
  }
  if (normalized === "rare") {
    return "레어";
  }
  if (normalized === "epic") {
    return "에픽";
  }
  if (normalized === "legendary") {
    return "전설";
  }
  return value;
}

function resolveAsset(assetWebpUrl: string, assetPngUrl: string | null): string | null {
  return assetWebpUrl || assetPngUrl || null;
}

export function ShopScene({
  slotFilter,
  items,
  loading,
  error,
  ownedItemIds,
  purchasePendingItemId,
  onChangeFilter,
  onPurchase
}: ShopSceneProps) {
  return (
    <section className={styles.scene}>
      <header className={styles.header}>
        <p className={styles.subtitle}>코디 상점</p>
        <h1>상점</h1>
      </header>

      <div className={styles.slotFilters}>
        {SLOT_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={filter.value === slotFilter ? styles.slotFilterActive : styles.slotFilter}
            onClick={() => onChangeFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? <p className={styles.stateText}>아이템을 불러오는 중...</p> : null}
      {error ? <p className={styles.stateError}>{error}</p> : null}
      {!loading && !error && !items.length ? <p className={styles.stateText}>표시할 아이템이 없습니다.</p> : null}

      {!loading && !error && items.length ? (
        <ul className={styles.itemList}>
          {items.map((item) => {
            const isOwned = ownedItemIds.has(item.id);
            const isPending = purchasePendingItemId === item.id;
            const asset = resolveAsset(item.assetWebpUrl, item.assetPngUrl);
            const slot = isEquipSlot(item.slot) ? SLOT_LABELS[item.slot] : item.slot;
            const rarityClass = RARITY_CLASS[item.rarity.toLowerCase()] ?? styles.rarityDefault;

            return (
              <li key={item.id} className={styles.itemCard}>
                <div className={styles.itemTopRow}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{slot}</p>
                  </div>
                  <span className={`${styles.rarityBadge} ${rarityClass}`}>{rarityLabel(item.rarity)}</span>
                </div>

                <div className={styles.itemPreview}>{asset ? <img src={asset} alt={item.name} loading="lazy" /> : <span>미리보기 없음</span>}</div>

                <div className={styles.itemBottomRow}>
                  <span>{item.price.toLocaleString()} 코인</span>
                  <button type="button" className={styles.primaryButton} disabled={isOwned || isPending} onClick={() => onPurchase(item)}>
                    {isOwned ? "보유" : isPending ? "구매 중..." : "구매"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

