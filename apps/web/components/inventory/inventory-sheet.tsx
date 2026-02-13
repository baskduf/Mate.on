"use client";

import { useEffect } from "react";
import { type EquipSlot, isEquipSlot } from "../../lib/avatar";
import styles from "./inventory-sheet.module.css";

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

interface InventorySheetProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  items: InventoryItem[];
  equippedBySlot: Record<string, string>;
  equipPendingItemId: string | null;
  actionError: string | null;
  actionNotice: string | null;
  onClose: () => void;
  onEquip: (slot: EquipSlot, item: InventoryItem["item"]) => void;
}

const SLOT_LABELS: Record<EquipSlot, string> = {
  hair: "헤어",
  top: "상의",
  bottom: "하의",
  accessory: "악세",
  effect: "이펙트"
};

function resolveAsset(assetWebpUrl: string, assetPngUrl: string | null): string | null {
  return assetWebpUrl || assetPngUrl || null;
}

export function InventorySheet({
  open,
  loading,
  error,
  items,
  equippedBySlot,
  equipPendingItemId,
  actionError,
  actionNotice,
  onClose,
  onEquip
}: InventorySheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className={open ? styles.overlayOpen : styles.overlay}>
      <button type="button" className={styles.scrim} aria-label="닫기" onClick={onClose} />

      <section className={open ? styles.sheetOpen : styles.sheet} aria-hidden={!open}>
        <header className={styles.sheetHeader}>
          <div>
            <p className={styles.subtitle}>메뉴</p>
            <h2>인벤토리</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            닫기
          </button>
        </header>

        {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
        {actionNotice ? <p className={styles.actionNotice}>{actionNotice}</p> : null}

        {loading ? <p className={styles.stateText}>인벤토리를 불러오는 중...</p> : null}
        {error ? <p className={styles.stateError}>{error}</p> : null}

        {!loading && !error && !items.length ? <p className={styles.stateText}>보유한 아이템이 없습니다.</p> : null}

        {!loading && !error && items.length ? (
          <ul className={styles.itemList}>
            {items.map((entry) => {
              const slot = isEquipSlot(entry.item.slot) ? entry.item.slot : null;
              const pending = equipPendingItemId === entry.item.id;
              const selectedItemId = slot ? equippedBySlot[slot] : "";
              const isCurrentlyEquipped = selectedItemId === entry.item.id || entry.equipped;
              const canEquip = Boolean(slot) && !isCurrentlyEquipped;
              const asset = resolveAsset(entry.item.assetWebpUrl, entry.item.assetPngUrl);

              return (
                <li key={entry.inventoryId} className={styles.itemCard}>
                  <div className={styles.itemTopRow}>
                    <div>
                      <strong>{entry.item.name}</strong>
                      <p>{slot ? SLOT_LABELS[slot] : entry.item.slot}</p>
                    </div>
                    {isCurrentlyEquipped ? <span className={styles.equippedMarker}>착용중</span> : null}
                  </div>

                  <div className={styles.itemPreview}>{asset ? <img src={asset} alt={entry.item.name} loading="lazy" /> : <span>미리보기 없음</span>}</div>

                  <div className={styles.itemBottomRow}>
                    <span>보유</span>
                    <button
                      type="button"
                      className={styles.equipButton}
                      disabled={!canEquip || pending}
                      onClick={() => {
                        if (slot) {
                          onEquip(slot, entry.item);
                        }
                      }}
                    >
                      {isCurrentlyEquipped ? "착용중" : pending ? "적용 중..." : "착용"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

