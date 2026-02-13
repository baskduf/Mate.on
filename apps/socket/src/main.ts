import "dotenv/config";
import Fastify from "fastify";
import { Server } from "socket.io";
import type {
  AvatarEquipPayload,
  AvatarMovePayload,
  ChatBubblePayload,
  IceCandidatePayload,
  SessionDescriptionPayload,
  SocketData
} from "@mateon/shared";
import { verifyClerkToken } from "./auth";
import { resolveSharedSignalRoomId, sanitizeRoomId } from "./signal-routing";

const app = Fastify({ logger: true });
const io = new Server({
  cors: { origin: true, credentials: true }
});

const applyAuth = async (
  socket: { handshake: any; data: Partial<SocketData> },
  next: (error?: Error) => void
) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const handshakeToken = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : undefined;
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const token = handshakeToken ?? bearer;

    if (!token) {
      return next(new Error("Unauthorized: missing token"));
    }

    const session = await verifyClerkToken(token);
    socket.data.userId = session.userId;
    return next();
  } catch {
    return next(new Error("Unauthorized: invalid token"));
  }
};

const presence = io.of("/presence");
const signal = io.of("/signal");
const signalPeerRoomById = new Map<string, string>();

function getSignalRoomForSocket(socketId: string): string | null {
  const roomId = signalPeerRoomById.get(socketId);
  if (!roomId) {
    return null;
  }

  const socket = signal.sockets.get(socketId);
  if (!socket || !socket.rooms.has(roomId)) {
    return null;
  }
  return roomId;
}

function resolveRelayTarget(fromSocketId: string, toPeerId: string) {
  const senderRoomId = resolveSharedSignalRoomId(signalPeerRoomById, fromSocketId, toPeerId);
  if (!senderRoomId) {
    return null;
  }

  const senderSocket = signal.sockets.get(fromSocketId);
  const targetSocket = signal.sockets.get(toPeerId);
  if (!senderSocket || !targetSocket) {
    return null;
  }

  if (!senderSocket.rooms.has(senderRoomId) || !targetSocket.rooms.has(senderRoomId)) {
    return null;
  }

  return { targetSocket, senderRoomId };
}

presence.use(applyAuth);
signal.use(applyAuth);

presence.on("connection", (socket) => {
  app.log.info({ id: socket.id, userId: socket.data.userId }, "presence connected");

  socket.on("room:join", ({ hostUserId }: { hostUserId: string }) => {
    socket.join(hostUserId);
    socket.to(hostUserId).emit("room:user_joined", { userId: socket.data.userId ?? "unknown" });
  });

  socket.on("room:leave", ({ hostUserId }: { hostUserId: string }) => {
    socket.leave(hostUserId);
    socket.to(hostUserId).emit("room:user_left", { userId: socket.data.userId ?? "unknown" });
  });

  socket.on("avatar:move", (payload: AvatarMovePayload) => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) {
        continue;
      }

      socket.to(roomId).emit("avatar:state", {
        userId: socket.data.userId ?? "unknown",
        x: payload.x,
        y: payload.y,
        equipped: {},
        motion: "walk",
        ts: payload.ts
      });
    }
  });

  socket.on("chat:bubble", (payload: ChatBubblePayload) => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) {
        continue;
      }

      socket.to(roomId).emit("chat:bubble", {
        userId: socket.data.userId ?? "unknown",
        text: payload.text,
        ts: payload.ts
      });
    }
  });

  socket.on("avatar:equip", (payload: AvatarEquipPayload) => {
    const roomId = sanitizeRoomId(payload.hostUserId);
    if (!roomId || !socket.rooms.has(roomId)) {
      return;
    }

    socket.to(roomId).emit("avatar:equip", {
      ...payload,
      userId: socket.data.userId ?? "unknown"
    });
  });

  socket.on("disconnect", () => app.log.info({ id: socket.id }, "presence disconnected"));
});

signal.on("connection", (socket) => {
  app.log.info({ id: socket.id, userId: socket.data.userId }, "signal connected");

  socket.on("signal:join", async ({ hostUserId }: { hostUserId: string }) => {
    const roomId = sanitizeRoomId(hostUserId);
    if (!roomId) {
      app.log.warn({ socketId: socket.id }, "signal join ignored: invalid room id");
      return;
    }

    const previousRoomId = signalPeerRoomById.get(socket.id);
    if (previousRoomId && previousRoomId !== roomId) {
      socket.to(previousRoomId).emit("signal:peer_left", { peerId: socket.id });
      socket.leave(previousRoomId);
    }

    const existingPeers = (await signal.in(roomId).fetchSockets())
      .map((peerSocket) => peerSocket.id)
      .filter((peerId) => peerId !== socket.id);

    socket.join(roomId);
    signalPeerRoomById.set(socket.id, roomId);

    for (const peerId of existingPeers) {
      socket.emit("signal:peer_joined", { peerId });
    }

    socket.to(roomId).emit("signal:peer_joined", { peerId: socket.id });
  });

  socket.on("webrtc:offer", ({ toPeerId, sdp }: { toPeerId: string; sdp: SessionDescriptionPayload }) => {
    const target = resolveRelayTarget(socket.id, toPeerId);
    if (!target) {
      app.log.warn({ fromPeerId: socket.id, toPeerId }, "webrtc offer ignored: room validation failed");
      return;
    }

    target.targetSocket.emit("webrtc:offer", { fromPeerId: socket.id, sdp });
  });

  socket.on("webrtc:answer", ({ toPeerId, sdp }: { toPeerId: string; sdp: SessionDescriptionPayload }) => {
    const target = resolveRelayTarget(socket.id, toPeerId);
    if (!target) {
      app.log.warn({ fromPeerId: socket.id, toPeerId }, "webrtc answer ignored: room validation failed");
      return;
    }

    target.targetSocket.emit("webrtc:answer", { fromPeerId: socket.id, sdp });
  });

  socket.on("webrtc:ice", ({ toPeerId, candidate }: { toPeerId: string; candidate: IceCandidatePayload }) => {
    const target = resolveRelayTarget(socket.id, toPeerId);
    if (!target) {
      app.log.warn({ fromPeerId: socket.id, toPeerId }, "webrtc ice ignored: room validation failed");
      return;
    }

    target.targetSocket.emit("webrtc:ice", { fromPeerId: socket.id, candidate });
  });

  socket.on("stream:host:start", ({ constraintsProfile }: { constraintsProfile: "high" | "balanced" | "low" }) => {
    const roomId = getSignalRoomForSocket(socket.id);
    if (!roomId) {
      app.log.warn({ socketId: socket.id }, "stream host start ignored: socket not in signal room");
      return;
    }

    app.log.info({ socketId: socket.id, roomId, constraintsProfile }, "stream host start");
    socket.to(roomId).emit("stream:host:start", { hostPeerId: socket.id });
  });

  socket.on("stream:host:stop", () => {
    const roomId = getSignalRoomForSocket(socket.id);
    if (!roomId) {
      app.log.warn({ socketId: socket.id }, "stream host stop ignored: socket not in signal room");
      return;
    }

    socket.to(roomId).emit("stream:host:stop", { hostPeerId: socket.id });
  });

  socket.on("disconnect", () => {
    const roomId = signalPeerRoomById.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit("signal:peer_left", { peerId: socket.id });
    }

    signalPeerRoomById.delete(socket.id);
    app.log.info({ id: socket.id }, "signal disconnected");
  });
});

app.get("/health", async () => ({ ok: true }));

const start = async () => {
  await app.listen({ port: Number(process.env.SOCKET_PORT ?? 4001), host: "0.0.0.0" });
  io.listen(Number(process.env.SOCKET_IO_PORT ?? 4002));
  app.log.info("socket server started");
};

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
