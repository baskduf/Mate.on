"use client";

import { useCallback, useEffect, useRef } from "react";
import type { InputState } from "./use-input";
import type { RemotePlayer } from "./use-square-socket";
import { updateCamera, type Camera } from "./camera";
import { renderFrame, type PlayerRenderState } from "./canvas-renderer";
import { PLAYER_SPEED, MAP_WIDTH, MAP_HEIGHT, SPAWN_X, SPAWN_Y, isWalkable } from "./map-data";

interface UseGameLoopOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  getInput: () => InputState;
  remotePlayersRef: React.RefObject<Map<string, RemotePlayer>>;
  emitMove: (x: number, y: number, vx: number, vy: number) => void;
  displayName: string;
  localChatBubbleRef: React.RefObject<{ text: string; expiresAt: number } | null>;
  localAvatarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useGameLoop({
  canvasRef,
  getInput,
  remotePlayersRef,
  emitMove,
  displayName,
  localChatBubbleRef,
  localAvatarCanvasRef,
}: UseGameLoopOptions) {
  const localPlayerRef = useRef({ x: SPAWN_X, y: SPAWN_Y });
  const cameraRef = useRef<Camera>({ x: SPAWN_X, y: SPAWN_Y });
  const lastEmitRef = useRef(0);
  const lastTimeRef = useRef(0);
  const frameIdRef = useRef(0);

  const loop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      frameIdRef.current = requestAnimationFrame(loop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      frameIdRef.current = requestAnimationFrame(loop);
      return;
    }

    // Delta time
    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.1) : 0.016;
    lastTimeRef.current = timestamp;
    const now = Date.now();

    // Handle canvas resize
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.scale(dpr, dpr);
    }

    // Input
    const input = getInput();
    const player = localPlayerRef.current;

    // Move local player
    if (input.vx !== 0 || input.vy !== 0) {
      const newX = player.x + input.vx * PLAYER_SPEED * dt;
      const newY = player.y + input.vy * PLAYER_SPEED * dt;

      if (isWalkable(newX, player.y)) {
        player.x = newX;
      }
      if (isWalkable(player.x, newY)) {
        player.y = newY;
      }

      // Throttled emit (every 50ms)
      if (now - lastEmitRef.current > 50) {
        emitMove(player.x, player.y, input.vx, input.vy);
        lastEmitRef.current = now;
      }
    }

    // Update camera
    cameraRef.current = updateCamera(
      cameraRef.current,
      player.x,
      player.y,
      cw,
      ch,
      MAP_WIDTH,
      MAP_HEIGHT,
      0.1
    );

    // Interpolate remote players
    const remotes = remotePlayersRef.current;
    if (remotes) {
      for (const rp of remotes.values()) {
        rp.x += (rp.targetX - rp.x) * 0.15;
        rp.y += (rp.targetY - rp.y) * 0.15;
      }
    }

    // Build player render states
    const players: PlayerRenderState[] = [
      {
        userId: "__local__",
        displayName,
        x: player.x,
        y: player.y,
        isLocal: true,
        avatarCanvas: localAvatarCanvasRef.current,
        chatBubble: localChatBubbleRef.current && localChatBubbleRef.current.expiresAt > now
          ? localChatBubbleRef.current
          : undefined,
      },
    ];

    if (remotes) {
      for (const rp of remotes.values()) {
        players.push({
          userId: rp.userId,
          displayName: rp.displayName,
          x: rp.x,
          y: rp.y,
          isLocal: false,
          avatarCanvas: null, // Remote avatars use fallback for now
          chatBubble: rp.chatBubble && rp.chatBubble.expiresAt > now ? rp.chatBubble : undefined,
        });
      }
    }

    renderFrame(ctx, cameraRef.current, cw, ch, players, now);

    frameIdRef.current = requestAnimationFrame(loop);
  }, [canvasRef, getInput, remotePlayersRef, emitMove, displayName, localChatBubbleRef, localAvatarCanvasRef]);

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [loop]);

  return { localPlayerRef };
}
