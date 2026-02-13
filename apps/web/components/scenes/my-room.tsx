"use client";

import { useEffect, useState } from "react";
import { AvatarPreview } from "../avatar/avatar-preview";
import { createBaseLayers, type LayerRecord } from "../../lib/avatar";
import styles from "./my-room.module.css";

const ROOM_THOUGHTS = ["오늘은 어떤 코디를 하지?", "상점에 신상 아이템이 있을까?", "광장에 친구들이 있을까?"];

interface MyRoomProps {
  layers: LayerRecord;
  loading: boolean;
  error: string | null;
  hasAvatar: boolean;
  onOpenCharacter: () => void;
  onCreateAvatar: () => void;
}

export function MyRoom({ layers, loading, error, hasAvatar, onOpenCharacter, onCreateAvatar }: MyRoomProps) {
  const [thoughtIndex, setThoughtIndex] = useState(0);

  useEffect(() => {
    setThoughtIndex(Math.floor(Math.random() * ROOM_THOUGHTS.length));

    if (!hasAvatar) {
      return;
    }

    const timer = window.setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % ROOM_THOUGHTS.length);
    }, 5200);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasAvatar]);

  return (
    <section className={styles.room}>
      <header className={styles.header}>
        <p className={styles.subtitle}>마이 룸</p>
        <h1>홈</h1>
      </header>

      <div className={styles.stage}>
        {loading ? <p className={styles.stateText}>아바타 정보를 불러오는 중...</p> : null}
        {error ? <p className={styles.stateError}>{error}</p> : null}

        {!loading && !error && !hasAvatar ? (
          <div className={styles.emptyRoom}>
            <p>아직 생성된 아바타가 없어요.</p>
            <button type="button" className={styles.createButton} onClick={onCreateAvatar}>
              생성하기
            </button>
          </div>
        ) : null}

        {!loading && !error && hasAvatar ? (
          <>
            <p className={styles.thoughtBubble}>{ROOM_THOUGHTS[thoughtIndex]}</p>
            <div className={styles.avatarWrap}>
              <AvatarPreview layers={layers || createBaseLayers()} size={292} showAnchor={false} />
            </div>
            <button type="button" className={styles.editButton} onClick={onOpenCharacter} aria-label="캐릭터 편집">
              캐릭터
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

