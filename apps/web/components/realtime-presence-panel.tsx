"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import type { AvatarStatePayload, PresenceClientToServerEvents, PresenceServerToClientEvents } from "@mateon/shared";
import styles from "./realtime-presence-panel.module.css";

interface RealtimePresencePanelProps {
  initialHostUserId: string | null;
}

type PresenceSocket = Socket<PresenceServerToClientEvents, PresenceClientToServerEvents>;

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface Point {
  x: number;
  y: number;
}

interface ChatEntry {
  id: string;
  userId: string;
  text: string;
  ts: number;
}

interface TokenResponse {
  userId: string;
  token: string;
}

const STAGE_WIDTH = 360;
const STAGE_HEIGHT = 230;
const STEP = 12;
const MOVE_INTERVAL_MS = 75;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour12: false });
}

export function RealtimePresencePanel({ initialHostUserId }: RealtimePresencePanelProps) {
  const [roomHostUserId, setRoomHostUserId] = useState(initialHostUserId ?? "");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [localPoint, setLocalPoint] = useState<Point>({ x: 180, y: 120 });
  const [remoteStates, setRemoteStates] = useState<Record<string, AvatarStatePayload>>({});
  const [chatInput, setChatInput] = useState("");
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const [presenceLogs, setPresenceLogs] = useState<string[]>([]);

  const socketRef = useRef<PresenceSocket | null>(null);
  const lastMoveSentAtRef = useRef(0);

  useEffect(() => {
    if (!roomHostUserId && initialHostUserId) {
      setRoomHostUserId(initialHostUserId);
    }
  }, [initialHostUserId, roomHostUserId]);

  const pushPresenceLog = useCallback((message: string) => {
    setPresenceLogs((prev) => {
      const next = [...prev, message];
      if (next.length > 10) {
        return next.slice(next.length - 10);
      }
      return next;
    });
  }, []);

  const pushChatEntry = useCallback((entry: ChatEntry) => {
    setChatEntries((prev) => {
      const next = [...prev, entry];
      if (next.length > 30) {
        return next.slice(next.length - 30);
      }
      return next;
    });
  }, []);

  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      setConnectionStatus("idle");
      return;
    }

    if (socket.connected && roomHostUserId.trim()) {
      socket.emit("room:leave", { hostUserId: roomHostUserId.trim() });
    }

    socket.disconnect();
    socketRef.current = null;
    setConnectionStatus("idle");
    setRemoteStates({});
  }, [roomHostUserId]);

  const emitMove = useCallback((nextPoint: Point, velocity: Point) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }

    const now = Date.now();
    if (now - lastMoveSentAtRef.current < MOVE_INTERVAL_MS) {
      return;
    }
    lastMoveSentAtRef.current = now;

    socket.emit("avatar:move", {
      x: nextPoint.x,
      y: nextPoint.y,
      vx: velocity.x,
      vy: velocity.y,
      monitorId: "web-main",
      ts: now
    });
  }, []);

  const moveLocalAvatar = useCallback(
    (dx: number, dy: number) => {
      setLocalPoint((prev) => {
        const next = {
          x: clamp(prev.x + dx, 8, STAGE_WIDTH - 8),
          y: clamp(prev.y + dy, 8, STAGE_HEIGHT - 8)
        };
        emitMove(next, { x: dx, y: dy });
        return next;
      });
    },
    [emitMove]
  );

  const connect = useCallback(async () => {
    const trimmedHostUserId = roomHostUserId.trim();
    if (!trimmedHostUserId) {
      setConnectionStatus("error");
      setConnectionError("hostUserId is required.");
      return;
    }

    setConnectionStatus("connecting");
    setConnectionError(null);
    setRemoteStates({});
    setPresenceLogs([]);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const tokenResponse = await fetch("/api/socket/token", { cache: "no-store" });
      let body: unknown = null;
      if (tokenResponse.headers.get("content-type")?.includes("application/json")) {
        body = await tokenResponse.json();
      }

      if (!tokenResponse.ok) {
        const message =
          body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error ?? "") : "";
        throw new Error(message || `Token request failed (${tokenResponse.status})`);
      }

      const { token, userId } = body as TokenResponse;
      setSelfUserId(userId);

      const socketBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4002";
      const socket: PresenceSocket = io(`${socketBaseUrl}/presence`, {
        auth: { token },
        withCredentials: true,
        transports: ["websocket", "polling"]
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setConnectionStatus("connected");
        setConnectionError(null);
        socket.emit("room:join", { hostUserId: trimmedHostUserId });
        pushPresenceLog(`connected: ${socket.id}`);
        emitMove(localPoint, { x: 0, y: 0 });
      });

      socket.on("connect_error", (error) => {
        setConnectionStatus("error");
        setConnectionError(error.message || "Failed to connect socket.");
      });

      socket.on("disconnect", (reason) => {
        setConnectionStatus("idle");
        pushPresenceLog(`disconnected: ${reason}`);
      });

      socket.on("room:user_joined", ({ userId: joinedUserId }) => {
        pushPresenceLog(`${joinedUserId} joined room`);
      });

      socket.on("room:user_left", ({ userId: leftUserId }) => {
        setRemoteStates((prev) => {
          const next = { ...prev };
          delete next[leftUserId];
          return next;
        });
        pushPresenceLog(`${leftUserId} left room`);
      });

      socket.on("avatar:state", (state) => {
        if (state.userId === userId) {
          return;
        }
        setRemoteStates((prev) => ({ ...prev, [state.userId]: state }));
      });

      socket.on("chat:bubble", (payload) => {
        pushChatEntry({
          id: `${payload.userId}-${payload.ts}`,
          userId: payload.userId,
          text: payload.text,
          ts: payload.ts
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect realtime.";
      setConnectionStatus("error");
      setConnectionError(message);
    }
  }, [emitMove, localPoint, pushChatEntry, pushPresenceLog, roomHostUserId]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (connectionStatus !== "connected") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      let dx = 0;
      let dy = 0;

      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        dy = -STEP;
      } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        dy = STEP;
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        dx = -STEP;
      } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        dx = STEP;
      }

      if (!dx && !dy) {
        return;
      }

      event.preventDefault();
      moveLocalAvatar(dx, dy);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [connectionStatus, moveLocalAvatar]);

  const remoteUsers = useMemo(() => Object.values(remoteStates), [remoteStates]);

  const sendChat = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = chatInput.trim();
      if (!text) {
        return;
      }

      const socket = socketRef.current;
      if (!socket?.connected) {
        setConnectionError("Connect realtime first.");
        return;
      }

      const ts = Date.now();
      socket.emit("chat:bubble", { text, ts });

      pushChatEntry({
        id: `${selfUserId ?? "me"}-${ts}`,
        userId: selfUserId ?? "me",
        text,
        ts
      });

      setChatInput("");
    },
    [chatInput, selfUserId, pushChatEntry]
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div>
          <h2>Realtime Presence</h2>
          <p>Join room, sync avatar move, and exchange chat bubbles.</p>
        </div>
        <span className={`${styles.status} ${styles[`status${connectionStatus[0].toUpperCase()}${connectionStatus.slice(1)}`]}`}>
          {connectionStatus}
        </span>
      </div>

      <div className={styles.connectRow}>
        <label htmlFor="hostUserId">Host User ID</label>
        <input
          id="hostUserId"
          value={roomHostUserId}
          onChange={(event) => setRoomHostUserId(event.target.value)}
          placeholder="host user id"
        />
        <button type="button" className={styles.connectButton} disabled={connectionStatus === "connected"} onClick={() => void connect()}>
          Connect
        </button>
        <button type="button" className={styles.disconnectButton} disabled={connectionStatus !== "connected"} onClick={disconnect}>
          Disconnect
        </button>
      </div>

      {connectionError ? <p className={styles.errorText}>{connectionError}</p> : null}

      <div className={styles.grid}>
        <section className={styles.stageSection}>
          <div className={styles.stage}>
            <div className={styles.localAvatar} style={{ left: localPoint.x - 8, top: localPoint.y - 8 }} title="you" />
            {remoteUsers.map((state) => (
              <div key={state.userId} className={styles.remoteAvatar} style={{ left: state.x - 7, top: state.y - 7 }} title={state.userId} />
            ))}
          </div>
          <p className={styles.stageHelp}>Move with Arrow or WASD keys after connected.</p>
        </section>

        <section className={styles.remoteSection}>
          <h3>Remote Avatars</h3>
          {!remoteUsers.length ? <p className={styles.mutedText}>No peers in this room yet.</p> : null}
          <ul>
            {remoteUsers.map((state) => (
              <li key={state.userId}>
                <strong>{state.userId}</strong> ({state.x}, {state.y}) / {state.motion}
              </li>
            ))}
          </ul>
          <h3>Presence Logs</h3>
          {!presenceLogs.length ? <p className={styles.mutedText}>No events yet.</p> : null}
          <ul>
            {presenceLogs.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className={styles.chatSection}>
        <h3>Room Chat</h3>
        <div className={styles.chatList}>
          {!chatEntries.length ? <p className={styles.mutedText}>No chat messages yet.</p> : null}
          {chatEntries.map((entry) => (
            <p key={entry.id}>
              <strong>{entry.userId}</strong> [{formatTime(entry.ts)}]: {entry.text}
            </p>
          ))}
        </div>
        <form onSubmit={sendChat} className={styles.chatForm}>
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Write a short message"
            maxLength={120}
          />
          <button type="submit" className={styles.connectButton}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
