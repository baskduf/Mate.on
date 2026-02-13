import "dotenv/config";
import Fastify from "fastify";
import { Server } from "socket.io";
import type {
  AvatarMovePayload,
  ChatBubblePayload,
  IceCandidatePayload,
  SessionDescriptionPayload,
  SocketData
} from "@mateon/shared";
import { verifyClerkToken } from "./auth";

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

  socket.on("disconnect", () => app.log.info({ id: socket.id }, "presence disconnected"));
});

signal.on("connection", (socket) => {
  app.log.info({ id: socket.id, userId: socket.data.userId }, "signal connected");

  socket.on("signal:join", ({ hostUserId }: { hostUserId: string }) => {
    socket.join(hostUserId);
    socket.to(hostUserId).emit("signal:peer_joined", { peerId: socket.id });
  });

  socket.on("webrtc:offer", ({ toPeerId, sdp }: { toPeerId: string; sdp: SessionDescriptionPayload }) => {
    signal.to(toPeerId).emit("webrtc:offer", { fromPeerId: socket.id, sdp });
  });

  socket.on("webrtc:answer", ({ toPeerId, sdp }: { toPeerId: string; sdp: SessionDescriptionPayload }) => {
    signal.to(toPeerId).emit("webrtc:answer", { fromPeerId: socket.id, sdp });
  });

  socket.on("webrtc:ice", ({ toPeerId, candidate }: { toPeerId: string; candidate: IceCandidatePayload }) => {
    signal.to(toPeerId).emit("webrtc:ice", { fromPeerId: socket.id, candidate });
  });

  socket.on("stream:host:start", () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) {
        continue;
      }

      socket.to(roomId).emit("stream:host:start", { hostPeerId: socket.id });
    }
  });

  socket.on("stream:host:stop", () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) {
        continue;
      }

      socket.to(roomId).emit("stream:host:stop", { hostPeerId: socket.id });
    }
  });

  socket.on("disconnect", () => app.log.info({ id: socket.id }, "signal disconnected"));
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
