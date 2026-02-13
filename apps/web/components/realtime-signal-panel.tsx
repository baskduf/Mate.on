"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IceCandidatePayload, SessionDescriptionPayload } from "@mateon/shared";
import { createSignalSocket, type SignalSocket } from "../lib/signal-client";
import styles from "./realtime-signal-panel.module.css";

interface RealtimeSignalPanelProps {
  initialHostUserId: string | null;
}

interface TokenResponse {
  userId: string;
  token: string;
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";
type SignalRole = "host" | "viewer";
type ConstraintsProfile = "high" | "balanced" | "low";

interface RemoteMediaEntry {
  peerId: string;
  stream: MediaStream;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function asRtcDescription(payload: SessionDescriptionPayload): RTCSessionDescriptionInit | null {
  if (payload.type !== "offer" && payload.type !== "answer" && payload.type !== "pranswer" && payload.type !== "rollback") {
    return null;
  }

  return {
    type: payload.type,
    sdp: payload.sdp ?? ""
  };
}

function asRtcCandidate(payload: IceCandidatePayload): RTCIceCandidateInit | null {
  if (!payload.candidate) {
    return null;
  }

  return {
    candidate: payload.candidate,
    sdpMid: payload.sdpMid ?? null,
    sdpMLineIndex: payload.sdpMLineIndex ?? null,
    usernameFragment: payload.usernameFragment ?? null
  };
}

function asCandidatePayload(candidate: RTCIceCandidate): IceCandidatePayload {
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment
  };
}

function resolveVideoConstraints(profile: ConstraintsProfile): MediaTrackConstraints {
  if (profile === "high") {
    return { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } };
  }

  if (profile === "low") {
    return { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 15 } };
  }

  return { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 24 } };
}

function StreamVideo({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.srcObject === stream) {
      return;
    }

    video.srcObject = stream;
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted={muted} className={styles.video} />;
}

export function RealtimeSignalPanel({ initialHostUserId }: RealtimeSignalPanelProps) {
  const [roomHostUserId, setRoomHostUserId] = useState(initialHostUserId ?? "");
  const [signalRole, setSignalRole] = useState<SignalRole>("viewer");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [selfPeerId, setSelfPeerId] = useState<string | null>(null);
  const [knownPeerIds, setKnownPeerIds] = useState<string[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState("");
  const [constraintsProfile, setConstraintsProfile] = useState<ConstraintsProfile>("balanced");
  const [activeHostPeerId, setActiveHostPeerId] = useState<string | null>(null);
  const [signalLogs, setSignalLogs] = useState<string[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteMediaEntries, setRemoteMediaEntries] = useState<RemoteMediaEntry[]>([]);

  const socketRef = useRef<SignalSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceByPeerRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const shouldAutoConnectRef = useRef(false);
  const autoConnectedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalRoleRef = useRef<SignalRole>("viewer");

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    signalRoleRef.current = signalRole;
  }, [signalRole]);

  useEffect(() => {
    if (!roomHostUserId && initialHostUserId) {
      setRoomHostUserId(initialHostUserId);
    }
  }, [initialHostUserId, roomHostUserId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryHostUserId = params.get("hostUserId")?.trim() ?? "";
    const querySignalRole = params.get("signalRole");
    const querySignalAutoConnect = params.get("signalAutoConnect");

    if (queryHostUserId) {
      setRoomHostUserId((prev) => prev.trim() || queryHostUserId);
    }

    if (querySignalRole === "host" || querySignalRole === "viewer") {
      setSignalRole(querySignalRole);
    }

    if (querySignalAutoConnect === "1" || querySignalAutoConnect?.toLowerCase() === "true") {
      shouldAutoConnectRef.current = true;
    }
  }, []);

  const pushSignalLog = useCallback((message: string) => {
    setSignalLogs((prev) => {
      const next = [...prev, message];
      if (next.length > 30) {
        return next.slice(next.length - 30);
      }
      return next;
    });
  }, []);

  const registerPeer = useCallback(
    (peerId: string) => {
      if (!peerId || peerId === selfPeerId) {
        return;
      }

      setKnownPeerIds((prev) => {
        if (prev.includes(peerId)) {
          return prev;
        }
        return [...prev, peerId];
      });

      setSelectedPeerId((prev) => prev || peerId);
    },
    [selfPeerId]
  );

  const upsertRemoteStream = useCallback((peerId: string, stream: MediaStream) => {
    setRemoteMediaEntries((prev) => {
      const index = prev.findIndex((entry) => entry.peerId === peerId);
      if (index === -1) {
        return [...prev, { peerId, stream }];
      }

      const next = [...prev];
      next[index] = { peerId, stream };
      return next;
    });
  }, []);

  const clearRemoteStream = useCallback((peerId: string) => {
    setRemoteMediaEntries((prev) => prev.filter((entry) => entry.peerId !== peerId));
  }, []);

  const closePeerConnection = useCallback(
    (peerId: string) => {
      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
      }

      peerConnectionsRef.current.delete(peerId);
      pendingIceByPeerRef.current.delete(peerId);
      clearRemoteStream(peerId);
    },
    [clearRemoteStream]
  );

  const unregisterPeer = useCallback(
    (peerId: string) => {
      if (!peerId) {
        return;
      }

      closePeerConnection(peerId);
      setKnownPeerIds((prev) => prev.filter((id) => id !== peerId));
      setSelectedPeerId((prev) => (prev === peerId ? "" : prev));
      setActiveHostPeerId((prev) => (prev === peerId ? null : prev));
    },
    [closePeerConnection]
  );

  const closeAllPeerConnections = useCallback(() => {
    for (const peerId of peerConnectionsRef.current.keys()) {
      closePeerConnection(peerId);
    }
  }, [closePeerConnection]);

  const flushPendingIceCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingIceByPeerRef.current.get(peerId);
    if (!queue?.length) {
      return;
    }

    pendingIceByPeerRef.current.delete(peerId);
    for (const candidate of queue) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const attachLocalTracks = useCallback((pc: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    if (!stream || signalRoleRef.current !== "host") {
      return;
    }

    for (const track of stream.getTracks()) {
      const alreadyAttached = pc.getSenders().some((sender) => sender.track?.id === track.id);
      if (!alreadyAttached) {
        pc.addTrack(track, stream);
      }
    }
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string) => {
      const existing = peerConnectionsRef.current.get(peerId);
      if (existing) {
        return existing;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (!event.candidate || !socketRef.current?.connected) {
          return;
        }

        socketRef.current.emit("webrtc:ice", {
          toPeerId: peerId,
          candidate: asCandidatePayload(event.candidate)
        });
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        upsertRemoteStream(peerId, stream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed" || pc.connectionState === "disconnected") {
          closePeerConnection(peerId);
          pushSignalLog(`peer closed: ${peerId}`);
        }
      };

      peerConnectionsRef.current.set(peerId, pc);
      attachLocalTracks(pc);
      return pc;
    },
    [attachLocalTracks, closePeerConnection, pushSignalLog, upsertRemoteStream]
  );

  const sendOfferToPeer = useCallback(
    async (peerId: string) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        return;
      }

      registerPeer(peerId);
      const pc = createPeerConnection(peerId);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (!pc.localDescription) {
          return;
        }

        socket.emit("webrtc:offer", {
          toPeerId: peerId,
          sdp: {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp
          }
        });

        pushSignalLog(`offer -> ${peerId}`);
      } catch (error) {
        pushSignalLog(`offer failed -> ${peerId}`);
        setConnectionError(error instanceof Error ? error.message : "Failed to create offer.");
      }
    },
    [createPeerConnection, pushSignalLog, registerPeer]
  );

  const handleIncomingOffer = useCallback(
    async (fromPeerId: string, sdp: SessionDescriptionPayload) => {
      registerPeer(fromPeerId);
      const socket = socketRef.current;
      if (!socket?.connected) {
        return;
      }

      const description = asRtcDescription(sdp);
      if (!description || description.type !== "offer") {
        pushSignalLog(`invalid offer <- ${fromPeerId}`);
        return;
      }

      try {
        const pc = createPeerConnection(fromPeerId);
        await pc.setRemoteDescription(description);
        await flushPendingIceCandidates(fromPeerId, pc);
        attachLocalTracks(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (!pc.localDescription) {
          return;
        }

        socket.emit("webrtc:answer", {
          toPeerId: fromPeerId,
          sdp: {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp
          }
        });

        pushSignalLog(`offer <- ${fromPeerId}`);
        pushSignalLog(`answer -> ${fromPeerId}`);
      } catch (error) {
        pushSignalLog(`offer handling failed <- ${fromPeerId}`);
        setConnectionError(error instanceof Error ? error.message : "Failed to handle offer.");
      }
    },
    [attachLocalTracks, createPeerConnection, flushPendingIceCandidates, pushSignalLog, registerPeer]
  );

  const handleIncomingAnswer = useCallback(
    async (fromPeerId: string, sdp: SessionDescriptionPayload) => {
      const description = asRtcDescription(sdp);
      if (!description || description.type !== "answer") {
        pushSignalLog(`invalid answer <- ${fromPeerId}`);
        return;
      }

      const pc = peerConnectionsRef.current.get(fromPeerId);
      if (!pc) {
        pushSignalLog(`answer ignored (missing peer) <- ${fromPeerId}`);
        return;
      }

      try {
        await pc.setRemoteDescription(description);
        await flushPendingIceCandidates(fromPeerId, pc);
        pushSignalLog(`answer <- ${fromPeerId}`);
      } catch (error) {
        pushSignalLog(`answer handling failed <- ${fromPeerId}`);
        setConnectionError(error instanceof Error ? error.message : "Failed to handle answer.");
      }
    },
    [flushPendingIceCandidates, pushSignalLog]
  );

  const handleIncomingIce = useCallback(
    async (fromPeerId: string, candidatePayload: IceCandidatePayload) => {
      registerPeer(fromPeerId);
      const candidate = asRtcCandidate(candidatePayload);
      if (!candidate) {
        return;
      }

      const pc = peerConnectionsRef.current.get(fromPeerId);
      if (!pc || !pc.remoteDescription) {
        const queue = pendingIceByPeerRef.current.get(fromPeerId) ?? [];
        queue.push(candidate);
        pendingIceByPeerRef.current.set(fromPeerId, queue);
        return;
      }

      try {
        await pc.addIceCandidate(candidate);
        pushSignalLog(`ice <- ${fromPeerId}`);
      } catch {
        pushSignalLog(`ice handling failed <- ${fromPeerId}`);
      }
    },
    [pushSignalLog, registerPeer]
  );

  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.disconnect();
      socketRef.current = null;
    }

    closeAllPeerConnections();
    setConnectionStatus("idle");
    setSelfPeerId(null);
    setKnownPeerIds([]);
    setSelectedPeerId("");
    setActiveHostPeerId(null);
  }, [closeAllPeerConnections]);

  const connect = useCallback(async () => {
    const trimmedHostUserId = roomHostUserId.trim();
    if (!trimmedHostUserId) {
      setConnectionStatus("error");
      setConnectionError("hostUserId is required.");
      return;
    }

    setConnectionStatus("connecting");
    setConnectionError(null);
    setKnownPeerIds([]);
    setSelectedPeerId("");
    setSignalLogs([]);
    setActiveHostPeerId(null);
    closeAllPeerConnections();

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

      const socket = createSignalSocket({ token });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnectionStatus("connected");
        setConnectionError(null);
        setSelfPeerId(socket.id ?? null);
        socket.emit("signal:join", { hostUserId: trimmedHostUserId });
        pushSignalLog(`connected: ${socket.id}`);
      });

      socket.on("connect_error", (error) => {
        setConnectionStatus("error");
        setConnectionError(error.message || "Failed to connect signal socket.");
      });

      socket.on("disconnect", (reason) => {
        closeAllPeerConnections();
        setConnectionStatus("idle");
        setKnownPeerIds([]);
        setSelectedPeerId("");
        setActiveHostPeerId(null);
        pushSignalLog(`disconnected: ${reason}`);
      });

      socket.on("signal:peer_joined", ({ peerId }) => {
        registerPeer(peerId);
        pushSignalLog(`peer joined: ${peerId}`);

        if (signalRoleRef.current === "host" && localStreamRef.current) {
          void sendOfferToPeer(peerId);
        }
      });

      (socket as any).on("signal:peer_left", ({ peerId }: { peerId: string }) => {
        unregisterPeer(peerId);
        pushSignalLog(`peer left: ${peerId}`);
      });

      socket.on("webrtc:offer", ({ fromPeerId, sdp }) => {
        void handleIncomingOffer(fromPeerId, sdp);
      });

      socket.on("webrtc:answer", ({ fromPeerId, sdp }) => {
        void handleIncomingAnswer(fromPeerId, sdp);
      });

      socket.on("webrtc:ice", ({ fromPeerId, candidate }) => {
        void handleIncomingIce(fromPeerId, candidate);
      });

      socket.on("stream:host:start", ({ hostPeerId }) => {
        registerPeer(hostPeerId);
        setActiveHostPeerId(hostPeerId);
        pushSignalLog(`host stream start: ${hostPeerId}`);
      });

      socket.on("stream:host:stop", ({ hostPeerId }) => {
        setActiveHostPeerId((prev) => (prev === hostPeerId ? null : prev));
        closePeerConnection(hostPeerId);
        pushSignalLog(`host stream stop: ${hostPeerId}`);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect signal socket.";
      setConnectionStatus("error");
      setConnectionError(message);
    }
  }, [
    closeAllPeerConnections,
    closePeerConnection,
    handleIncomingAnswer,
    handleIncomingIce,
    handleIncomingOffer,
    pushSignalLog,
    registerPeer,
    roomHostUserId,
    sendOfferToPeer,
    unregisterPeer
  ]);

  const startHostStream = useCallback(async () => {
    if (signalRole !== "host") {
      setConnectionError("Host role is required.");
      return;
    }

    const socket = socketRef.current;
    if (!socket?.connected) {
      setConnectionError("Connect signal first.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setConnectionError("MediaDevices API is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: resolveVideoConstraints(constraintsProfile)
      });

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          track.stop();
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setActiveHostPeerId(socket.id ?? selfPeerId);
      socket.emit("stream:host:start", { constraintsProfile });
      pushSignalLog(`host stream local start (${constraintsProfile})`);

      for (const peerId of knownPeerIds) {
        await sendOfferToPeer(peerId);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Failed to start host stream.");
    }
  }, [constraintsProfile, knownPeerIds, pushSignalLog, selfPeerId, sendOfferToPeer, signalRole]);

  const stopHostStream = useCallback(() => {
    if (signalRole !== "host") {
      setConnectionError("Host role is required.");
      return;
    }

    const socket = socketRef.current;
    if (!socket?.connected) {
      setConnectionError("Connect signal first.");
      return;
    }

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setActiveHostPeerId(null);
    closeAllPeerConnections();
    socket.emit("stream:host:stop");
    pushSignalLog("host stream local stop");
  }, [closeAllPeerConnections, pushSignalLog, signalRole]);

  const renegotiateSelectedPeer = useCallback(() => {
    const peerId = selectedPeerId.trim();
    if (!peerId) {
      setConnectionError("Select a peer first.");
      return;
    }

    if (signalRole !== "host") {
      setConnectionError("Only host can renegotiate offers.");
      return;
    }

    void sendOfferToPeer(peerId);
  }, [selectedPeerId, sendOfferToPeer, signalRole]);

  useEffect(() => {
    return () => {
      disconnect();

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          track.stop();
        }
      }
      localStreamRef.current = null;
    };
  }, [disconnect]);

  useEffect(() => {
    if (signalRole === "host") {
      return;
    }

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
    }

    localStreamRef.current = null;
    setLocalStream(null);
    setActiveHostPeerId(null);
    closeAllPeerConnections();
  }, [closeAllPeerConnections, signalRole]);

  useEffect(() => {
    if (autoConnectedRef.current || !shouldAutoConnectRef.current) {
      return;
    }

    if (!roomHostUserId.trim()) {
      return;
    }

    autoConnectedRef.current = true;
    void connect();
  }, [connect, roomHostUserId]);

  const isConnected = connectionStatus === "connected";

  const remoteStreamCount = useMemo(() => remoteMediaEntries.length, [remoteMediaEntries.length]);

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div>
          <h2>Realtime Signal</h2>
          <p>WebRTC peer negotiation over `/signal` with host media streaming.</p>
        </div>
        <span className={`${styles.status} ${styles[`status${connectionStatus[0].toUpperCase()}${connectionStatus.slice(1)}`]}`}>
          {connectionStatus}
        </span>
      </div>

      <div className={styles.connectRow}>
        <label htmlFor="signalHostUserId">Host User ID</label>
        <input
          id="signalHostUserId"
          value={roomHostUserId}
          onChange={(event) => setRoomHostUserId(event.target.value)}
          placeholder="host user id"
        />
        <select value={signalRole} onChange={(event) => setSignalRole(event.target.value === "host" ? "host" : "viewer")}>
          <option value="viewer">viewer</option>
          <option value="host">host</option>
        </select>
        <button type="button" className={styles.connectButton} disabled={isConnected} onClick={() => void connect()}>
          Connect
        </button>
        <button type="button" className={styles.disconnectButton} disabled={!isConnected} onClick={disconnect}>
          Disconnect
        </button>
      </div>

      {connectionError ? <p className={styles.errorText}>{connectionError}</p> : null}

      <div className={styles.metaRow}>
        <span>User: {selfUserId ?? "-"}</span>
        <span>Peer: {selfPeerId ?? "-"}</span>
        <span>Role: {signalRole}</span>
        <span>Known Peers: {knownPeerIds.length}</span>
        <span>Remote Streams: {remoteStreamCount}</span>
        <span>Host Stream: {activeHostPeerId ?? "inactive"}</span>
      </div>

      <div className={styles.grid}>
        <section className={styles.box}>
          <h3>Host Stream Controls</h3>
          <div className={styles.hostRow}>
            <label htmlFor="constraintsProfile">Constraints</label>
            <select
              id="constraintsProfile"
              value={constraintsProfile}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "high" || value === "balanced" || value === "low") {
                  setConstraintsProfile(value);
                }
              }}
            >
              <option value="high">high</option>
              <option value="balanced">balanced</option>
              <option value="low">low</option>
            </select>
            <button type="button" className={styles.connectButton} disabled={!isConnected || signalRole !== "host"} onClick={() => void startHostStream()}>
              Start Host Stream
            </button>
            <button type="button" className={styles.disconnectButton} disabled={!isConnected || signalRole !== "host"} onClick={stopHostStream}>
              Stop Host Stream
            </button>
          </div>

          <div className={styles.hostRow}>
            <label htmlFor="peerSelector">Peer</label>
            <select id="peerSelector" value={selectedPeerId} onChange={(event) => setSelectedPeerId(event.target.value)}>
              <option value="">Select peer</option>
              {knownPeerIds.map((peerId) => (
                <option key={peerId} value={peerId}>
                  {peerId}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.connectButton}
              disabled={!isConnected || signalRole !== "host" || !selectedPeerId}
              onClick={renegotiateSelectedPeer}
            >
              Renegotiate
            </button>
          </div>

          <div className={styles.videoGrid}>
            <div className={styles.videoCard}>
              <h4>Local Stream</h4>
              {localStream ? <StreamVideo stream={localStream} muted={true} /> : <p className={styles.mutedText}>Host stream is not active.</p>}
            </div>
          </div>
        </section>

        <section className={styles.box}>
          <h3>Remote Streams</h3>
          {!remoteMediaEntries.length ? <p className={styles.mutedText}>No remote media streams yet.</p> : null}
          <div className={styles.videoGrid}>
            {remoteMediaEntries.map((entry) => (
              <div key={`${entry.peerId}-${entry.stream.id}`} className={styles.videoCard}>
                <h4>{entry.peerId}</h4>
                <StreamVideo stream={entry.stream} muted={false} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.box}>
        <h3>Signal Logs</h3>
        {!signalLogs.length ? <p className={styles.mutedText}>No signal events yet.</p> : null}
        <ul className={styles.logList}>
          {signalLogs.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
