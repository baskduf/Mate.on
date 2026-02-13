export function sanitizeRoomId(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

export function resolveSharedSignalRoomId(
  peerRoomById: ReadonlyMap<string, string>,
  senderPeerId: string,
  targetPeerId: string
): string | null {
  const senderRoomId = peerRoomById.get(senderPeerId);
  if (!senderRoomId) {
    return null;
  }

  const targetRoomId = peerRoomById.get(targetPeerId);
  if (!targetRoomId || targetRoomId !== senderRoomId) {
    return null;
  }

  return senderRoomId;
}
