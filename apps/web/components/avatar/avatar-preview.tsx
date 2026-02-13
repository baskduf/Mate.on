import { AVATAR_ANCHOR, AVATAR_CANVAS, LAYER_ORDER, type LayerRecord } from "../../lib/avatar";

interface AvatarPreviewProps {
  layers: LayerRecord;
  size?: number;
  showAnchor?: boolean;
}

export function AvatarPreview({ layers, size = 320, showAnchor = true }: AvatarPreviewProps) {
  const scale = size / AVATAR_CANVAS.width;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: 24,
        background: "linear-gradient(180deg, #f7f2ff 0%, #fffdf4 100%)",
        border: "1px solid #e2daf3",
        overflow: "hidden"
      }}
    >
      {LAYER_ORDER.map((layerKey) => {
        const source = layers[layerKey];
        if (!source) {
          return null;
        }

        return (
          <img
            key={layerKey}
            src={source}
            alt={layerKey}
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              userSelect: "none"
            }}
          />
        );
      })}

      {showAnchor ? (
        <div
          title="anchor"
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "#ef4444",
            border: "2px solid #ffffff",
            left: AVATAR_ANCHOR.x * scale - 5,
            top: AVATAR_ANCHOR.y * scale - 5,
            boxShadow: "0 0 0 1px rgba(239,68,68,0.3)"
          }}
        />
      ) : null}
    </div>
  );
}

