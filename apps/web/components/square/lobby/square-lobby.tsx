"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { LAYER_ORDER, type LayerRecord } from "@/lib/avatar";
import { useInput } from "./use-input";
import { useSquareSocket } from "./use-square-socket";
import { useGameLoop } from "./use-game-loop";
import { ChatOverlay } from "./chat-overlay";
import { TouchJoystick } from "./touch-joystick";

interface SquareLobbyProps {
  roomId: string;
  roomTitle: string;
  onLeave: () => void;
}

/** Load an image and resolve when ready */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Composite avatar SVG layers into an offscreen canvas */
async function compositeAvatar(layers: LayerRecord): Promise<HTMLCanvasElement> {
  const size = 128; // render size for canvas sprite
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  for (const key of LAYER_ORDER) {
    const url = layers[key];
    if (!url) continue;
    try {
      const img = await loadImage(url);
      // Hair has a special offset
      const yOffset = key === "hair" ? -size * 0.12 : 0;
      ctx.drawImage(img, 0, yOffset, size, size);
    } catch {
      // Skip failed layer
    }
  }

  return canvas;
}

export function SquareLobby({ roomId, roomTitle, onLeave }: SquareLobbyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatFocused, setChatFocused] = useState(false);
  const localChatBubbleRef = useRef<{ text: string; expiresAt: number } | null>(null);
  const [displayName, setDisplayName] = useState("나");
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const localAvatarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch own user info + avatar layers
  useEffect(() => {
    let cancelled = false;

    async function fetchUserAndAvatar() {
      try {
        const [meRes, avatarRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/avatar/me"),
        ]);
        const meData = await meRes.json();
        const avatarData = await avatarRes.json();

        if (cancelled) return;

        if (meData.displayName) setDisplayName(meData.displayName);
        if (meData.clerkUserId) setLocalUserId(meData.clerkUserId);

        // Composite avatar layers
        if (avatarData.layers) {
          const avatarCanvas = await compositeAvatar(avatarData.layers);
          if (!cancelled) {
            localAvatarCanvasRef.current = avatarCanvas;
          }
        }
      } catch (e) {
        console.warn("Failed to load user/avatar", e);
      }
    }

    fetchUserAndAvatar();
    return () => { cancelled = true; };
  }, []);

  // Socket connection — pass localUserId to filter self
  const { connected, remotePlayersRef, chatMessages, emitMove, emitChat } =
    useSquareSocket(roomId, localUserId);

  // Input handling
  const { getInput, setTouchInput } = useInput(!chatFocused);

  // Game loop
  useGameLoop({
    canvasRef,
    getInput,
    remotePlayersRef,
    emitMove,
    displayName,
    localChatBubbleRef,
    localAvatarCanvasRef,
  });

  // Chat send handler
  const handleChatSend = useCallback(
    (text: string) => {
      emitChat(text);
      localChatBubbleRef.current = {
        text: text.trim(),
        expiresAt: Date.now() + 5000,
      };
    },
    [emitChat]
  );

  // Touch joystick handler
  const handleJoystickMove = useCallback(
    (vx: number, vy: number) => {
      setTouchInput(vx, vy);
    },
    [setTouchInput]
  );

  const playerCount = (remotePlayersRef.current?.size ?? 0) + 1;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Top bar overlay */}
      <div className="fixed top-0 left-0 right-0 p-3 z-40 flex items-center justify-between pointer-events-none">
        <button
          onClick={onLeave}
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
          <span className="text-white text-sm font-medium truncate max-w-[160px]">
            {roomTitle}
          </span>
          <span className="text-white/60 text-xs flex items-center gap-1">
            <Users size={12} />
            {playerCount}
          </span>
          {!connected && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          )}
        </div>
      </div>

      <TouchJoystick onMove={handleJoystickMove} />
      <ChatOverlay messages={chatMessages} onSend={handleChatSend} />
    </div>
  );
}
