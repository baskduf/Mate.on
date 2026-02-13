import { io, type Socket } from "socket.io-client";
import type { SignalClientToServerEvents, SignalServerToClientEvents } from "@mateon/shared";

export type SignalSocket = Socket<SignalServerToClientEvents, SignalClientToServerEvents>;

interface CreateSignalSocketOptions {
  token: string;
  baseUrl?: string;
}

export function createSignalSocket(options: CreateSignalSocketOptions): SignalSocket {
  const socketBaseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4002";
  return io(`${socketBaseUrl}/signal`, {
    auth: { token: options.token },
    withCredentials: true,
    transports: ["websocket", "polling"]
  });
}
