"use client";

import { useState, useCallback } from "react";
import { GameLayout } from "../game-layout";
import { RoomList } from "./room-list";
import { SquareLobby } from "./lobby/square-lobby";

export interface RoomInfo {
  id: string;
  title: string;
  description: string | null;
  hostUserId: string;
  hostDisplayName: string;
  isPublic: boolean;
  hasPassword: boolean;
  playerCount: number;
  maxPlayers: number;
  isOnline: boolean;
  isHost: boolean;
}

export function SquareContainer() {
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);

  const handleEnterRoom = useCallback((room: RoomInfo) => {
    setCurrentRoom(room);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    const roomId = currentRoom?.id;
    setCurrentRoom(null);

    // DB leave: called here (before unmount) so it reliably fires
    if (roomId) {
      fetch(`/api/square/rooms/${roomId}/leave`, {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    }
  }, [currentRoom?.id]);

  if (currentRoom) {
    return <SquareLobby roomId={currentRoom.id} roomTitle={currentRoom.title} onLeave={handleLeaveRoom} />;
  }

  return (
    <GameLayout>
      <RoomList onEnterRoom={handleEnterRoom} />
    </GameLayout>
  );
}
