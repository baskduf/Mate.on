export type Slot = "hair" | "top" | "bottom" | "accessory" | "effect";

export interface SessionDescriptionPayload {
  type: string;
  sdp?: string;
}

export interface IceCandidatePayload {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface AvatarMovePayload {
  x: number;
  y: number;
  vx: number;
  vy: number;
  monitorId: string;
  ts: number;
}

export interface ChatBubblePayload {
  text: string;
  ts: number;
}

export interface AvatarEquipPayload {
  hostUserId: string;
  layers: Record<string, string | null>;
  equipped: Array<{ slot: string; itemId: string; name?: string }>;
  ts: number;
}

export interface AvatarEquipBroadcastPayload extends AvatarEquipPayload {
  userId: string;
}

export interface AvatarStatePayload {
  userId: string;
  x: number;
  y: number;
  equipped: Partial<Record<Slot, string>>;
  motion: "idle" | "walk" | "reaction";
  ts: number;
}

export interface PresenceClientToServerEvents {
  "room:join": (payload: { hostUserId: string }) => void;
  "room:leave": (payload: { hostUserId: string }) => void;
  "avatar:move": (payload: AvatarMovePayload) => void;
  "avatar:equip": (payload: AvatarEquipPayload) => void;
  "chat:bubble": (payload: ChatBubblePayload) => void;
}

export interface PresenceServerToClientEvents {
  "room:user_joined": (payload: { userId: string; avatarState?: AvatarStatePayload }) => void;
  "room:user_left": (payload: { userId: string }) => void;
  "avatar:state": (payload: AvatarStatePayload) => void;
  "avatar:equip": (payload: AvatarEquipBroadcastPayload) => void;
  "chat:bubble": (payload: { userId: string; text: string; ts: number }) => void;
}

export interface SignalClientToServerEvents {
  "signal:join": (payload: { hostUserId: string }) => void;
  "webrtc:offer": (payload: { toPeerId: string; sdp: SessionDescriptionPayload }) => void;
  "webrtc:answer": (payload: { toPeerId: string; sdp: SessionDescriptionPayload }) => void;
  "webrtc:ice": (payload: { toPeerId: string; candidate: IceCandidatePayload }) => void;
  "stream:host:start": (payload: { constraintsProfile: "high" | "balanced" | "low" }) => void;
  "stream:host:stop": () => void;
}

export interface SignalServerToClientEvents {
  "signal:peer_joined": (payload: { peerId: string }) => void;
  "signal:peer_left": (payload: { peerId: string }) => void;
  "webrtc:offer": (payload: { fromPeerId: string; sdp: SessionDescriptionPayload }) => void;
  "webrtc:answer": (payload: { fromPeerId: string; sdp: SessionDescriptionPayload }) => void;
  "webrtc:ice": (payload: { fromPeerId: string; candidate: IceCandidatePayload }) => void;
  "stream:host:start": (payload: { hostPeerId: string }) => void;
  "stream:host:stop": (payload: { hostPeerId: string }) => void;
}

export interface SocketData {
  userId: string;
}
