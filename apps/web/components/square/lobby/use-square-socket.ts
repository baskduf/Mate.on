"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  AvatarMovePayload,
  ChatBubblePayload,
  AvatarStatePayload,
  SquareUserJoinedPayload,
} from "@mateon/shared";

export interface RemotePlayer {
  userId: string;
  displayName: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lastUpdate: number;
  chatBubble?: { text: string; expiresAt: number };
}

export interface ChatMessage {
  userId: string;
  displayName?: string;
  text: string;
  ts: number;
}

const CHAT_BUBBLE_DURATION = 5000;

export function useSquareSocket(roomId: string, localClerkUserId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const localClerkIdRef = useRef(localClerkUserId);
  localClerkIdRef.current = localClerkUserId;

  useEffect(() => {
    // Wait until we know our own userId before connecting
    // This prevents the race where events arrive before we can filter self
    if (!localClerkUserId) return;

    let presenceSocket: Socket | null = null;

    const connect = async () => {
      try {
        const res = await fetch("/api/socket/token");
        const { token } = await res.json();

        presenceSocket = io(
          `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4002"}/presence`,
          {
            auth: { token },
            transports: ["websocket"],
          }
        );

        socketRef.current = presenceSocket;

        presenceSocket.on("connect", () => {
          setConnected(true);
          presenceSocket!.emit("square:room:join", { roomId });
        });

        presenceSocket.on("disconnect", () => {
          setConnected(false);
        });

        presenceSocket.on("square:room:user_joined", (payload: SquareUserJoinedPayload) => {
          const { userId, displayName } = payload;
          if (userId === localClerkIdRef.current) return;
          if (!remotePlayersRef.current.has(userId)) {
            remotePlayersRef.current.set(userId, {
              userId,
              displayName: displayName || `mate_${userId.slice(-6)}`,
              x: 1280,
              y: 960,
              targetX: 1280,
              targetY: 960,
              lastUpdate: Date.now(),
            });
          }
        });

        presenceSocket.on("square:room:user_left", (payload: { userId: string }) => {
          remotePlayersRef.current.delete(payload.userId);
        });

        presenceSocket.on("avatar:state", (payload: AvatarStatePayload) => {
          if (payload.userId === localClerkIdRef.current) return;

          const existing = remotePlayersRef.current.get(payload.userId);
          if (existing) {
            existing.targetX = payload.x;
            existing.targetY = payload.y;
            existing.lastUpdate = Date.now();
          } else {
            remotePlayersRef.current.set(payload.userId, {
              userId: payload.userId,
              displayName: `mate_${payload.userId.slice(-6)}`,
              x: payload.x,
              y: payload.y,
              targetX: payload.x,
              targetY: payload.y,
              lastUpdate: Date.now(),
            });
          }
        });

        presenceSocket.on("chat:bubble", (payload: { userId: string; text: string; ts: number }) => {
          if (payload.userId === localClerkIdRef.current) return;

          setChatMessages((prev) => [...prev.slice(-49), payload]);

          const player = remotePlayersRef.current.get(payload.userId);
          if (player) {
            player.chatBubble = {
              text: payload.text,
              expiresAt: Date.now() + CHAT_BUBBLE_DURATION,
            };
          }
        });
      } catch (e) {
        console.warn("Square socket connect failed", e);
      }
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("square:room:leave", { roomId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      remotePlayersRef.current.clear();
    };
  }, [roomId, localClerkUserId]);

  const emitMove = useCallback((x: number, y: number, vx: number, vy: number) => {
    socketRef.current?.emit("avatar:move", {
      x,
      y,
      vx,
      vy,
      monitorId: "square",
      ts: Date.now(),
    } satisfies AvatarMovePayload);
  }, []);

  const emitChat = useCallback((text: string) => {
    if (!text.trim()) return;
    socketRef.current?.emit("chat:bubble", {
      text: text.trim(),
      ts: Date.now(),
    } satisfies ChatBubblePayload);

    // Only add locally — don't add from server echo
    setChatMessages((prev) => [
      ...prev.slice(-49),
      { userId: "__self__", text: text.trim(), ts: Date.now() },
    ]);
  }, []);

  return {
    connected,
    remotePlayersRef,
    chatMessages,
    emitMove,
    emitChat,
  };
}
