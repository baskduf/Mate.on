"use client";

import { useMemo } from "react";
import styles from "./avatar-preview.module.css";
import { LAYER_ORDER } from "@/lib/avatar";

// Shared interfaces from existing code
export type LayerRecord = Record<string, string>;

interface AvatarPreviewProps {
  layers: LayerRecord;
  width?: number;
  height?: number;
  loading?: boolean;
}

const LAYER_TRANSFORM_MAP: Partial<Record<(typeof LAYER_ORDER)[number], string>> = {
  hair: "translateY(-12%)"
};

export function AvatarPreview({ layers, width = 300, height = 400, loading = false }: AvatarPreviewProps) {
  // Sort layers for proper rendering order (body -> clothes -> accessories)
  // This order logic should match the original implementation
  const sortedLayers = useMemo(() => {
    return LAYER_ORDER
      .map((key) => ({ key, url: layers[key] }))
      .filter((layer) => !!layer.url);
  }, [layers]);

  if (loading) {
    return (
      <div className={styles.skeleton} style={{ width, height }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ width, height }}>
      {sortedLayers.map((layer) => (
        <img
          key={layer.key}
          src={layer.url}
          alt={layer.key}
          className={styles.layerImage}
          style={{
            zIndex: layer.key === "shadow" ? 0 : 10,
            transform: LAYER_TRANSFORM_MAP[layer.key]
          }}
        />
      ))}
    </div>
  );
}
