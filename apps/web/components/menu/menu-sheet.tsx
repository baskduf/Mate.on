"use client";

import { useEffect } from "react";
import styles from "./menu-sheet.module.css";

interface MenuSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenInventory: () => void;
}

export function MenuSheet({ open, onClose, onOpenInventory }: MenuSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className={open ? styles.overlayOpen : styles.overlay}>
      <button type="button" className={styles.scrim} aria-label="닫기" onClick={onClose} />

      <section className={open ? styles.sheetOpen : styles.sheet} aria-hidden={!open}>
        <header className={styles.header}>
          <p className={styles.subtitle}>메뉴</p>
          <h2>메뉴</h2>
        </header>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              onClose();
              onOpenInventory();
            }}
          >
            인벤토리
          </button>
          <button type="button" className={styles.actionButtonMuted} disabled>
            프로필 (준비중)
          </button>
        </div>

        <button type="button" className={styles.closeButton} onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  );
}
