"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./game-layout.module.css";

export type GameScene = "home" | "square" | "shop" | "character";

interface GameLayoutProps {
  scene: GameScene;
  coins: number | null;
  gems: number | null;
  children: ReactNode;
}

interface RouteTab {
  key: GameScene;
  href: string;
  label: string;
  icon: "home" | "square" | "shop" | "character";
}

const ROUTE_TABS: RouteTab[] = [
  { key: "home", href: "/", label: "홈", icon: "home" },
  { key: "square", href: "/square", label: "광장", icon: "square" },
  { key: "shop", href: "/shop", label: "상점", icon: "shop" },
  { key: "character", href: "/character", label: "캐릭터", icon: "character" }
];

function AppIcon({ type }: { type: "mail" | "settings" | RouteTab["icon"] }) {
  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16v10H4z" />
        <path d="M4 8l8 6 8-6" />
      </svg>
    );
  }

  if (type === "settings") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
        <path d="m19 12-.8-.4a6.6 6.6 0 0 0-.3-1.2l.5-.8-1.7-1.7-.8.5c-.4-.2-.8-.3-1.2-.4L14 6h-2l-.5.8c-.4.1-.8.2-1.2.4l-.8-.5-1.7 1.7.5.8c-.2.4-.3.8-.4 1.2L6 12v2l.8.5c.1.4.2.8.4 1.2l-.5.8 1.7 1.7.8-.5c.4.2.8.3 1.2.4l.5.8h2l.5-.8c.4-.1.8-.2 1.2-.4l.8.5 1.7-1.7-.5-.8c.2-.4.3-.8.4-1.2l.8-.5v-2Z" />
      </svg>
    );
  }

  if (type === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5V20h-5v-5h-6v5H4z" />
      </svg>
    );
  }

  if (type === "square") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  }

  if (type === "shop") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9h12l-1 11H7L6 9Z" />
        <path d="M9 9a3 3 0 0 1 6 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z" />
      <path d="M6 20a6 6 0 0 1 12 0" />
    </svg>
  );
}

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "...";
  }

  return value.toLocaleString();
}

export function GameLayout({ scene, coins, gems, children }: GameLayoutProps) {
  return (
    <main className={styles.shell}>
      <div className={styles.mobileFrame}>
        <header className={styles.topBar}>
          <div className={styles.currencyWrap}>
            <div className={styles.currencyPill}>
              <span>보석</span>
              <strong>{formatCurrency(gems)}</strong>
            </div>
            <div className={styles.currencyPill}>
              <span>코인</span>
              <strong>{formatCurrency(coins)}</strong>
            </div>
          </div>

          <div className={styles.topIcons}>
            <button type="button" className={styles.iconButton} aria-label="우편">
              <AppIcon type="mail" />
            </button>
            <button type="button" className={styles.iconButton} aria-label="설정">
              <AppIcon type="settings" />
            </button>
          </div>
        </header>

        <section key={scene} className={styles.viewport}>
          {children}
        </section>

        <nav className={styles.bottomNav} aria-label="게임 탐색">
          {ROUTE_TABS.map((tab) => (
            <Link key={tab.key} href={tab.href} className={tab.key === scene ? styles.navItemActive : styles.navItem}>
              <span className={styles.navGlyph}>
                <AppIcon type={tab.icon} />
              </span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}

