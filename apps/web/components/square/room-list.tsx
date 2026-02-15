"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RoomInfo } from "./square-container";
import { RoomCard } from "./room-card";
import { CreateRoomDialog } from "./create-room-dialog";
import { PasswordDialog } from "./password-dialog";

interface RoomListProps {
  onEnterRoom: (room: RoomInfo) => void;
}

export function RoomList({ onEnterRoom }: RoomListProps) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordRoom, setPasswordRoom] = useState<RoomInfo | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/square/rooms?limit=50");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRooms(data.rooms);
    } catch {
      toast.error("방 목록을 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10_000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleJoinRoom = useCallback(async (room: RoomInfo) => {
    if (room.hasPassword && !room.isHost) {
      setPasswordRoom(room);
      return;
    }

    // Public room or host - join directly
    try {
      const res = await fetch(`/api/square/rooms/${room.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "입장에 실패했어요");
        return;
      }

      onEnterRoom(room);
    } catch {
      toast.error("입장에 실패했어요");
    }
  }, [onEnterRoom]);

  const handleCreated = useCallback((room: RoomInfo) => {
    onEnterRoom(room);
  }, [onEnterRoom]);

  const handlePasswordJoined = useCallback((room: RoomInfo) => {
    onEnterRoom(room);
  }, [onEnterRoom]);

  return (
    <div className="flex flex-col h-full pt-20 pb-28 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-ghibli-ink">광장</h1>
        <Button variant="ghost" size="icon-sm" onClick={() => { setLoading(true); fetchRooms(); }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {loading && rooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-ghibli-ink-light text-sm">방을 찾고 있어요...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <p className="text-ghibli-ink-light text-sm">아직 열린 방이 없어요</p>
          <Button variant="forest" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            첫 번째 방 만들기
          </Button>
        </div>
      ) : (
        <motion.div
          className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 content-start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
          ))}
        </motion.div>
      )}

      {/* Floating create button */}
      <motion.div
        className="fixed bottom-24 right-6 z-40"
        whileTap={{ scale: 0.9 }}
      >
        <Button
          variant="forest"
          size="lg"
          className="rounded-full shadow-lg h-14 w-14 p-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={24} />
        </Button>
      </motion.div>

      <CreateRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <PasswordDialog
        open={Boolean(passwordRoom)}
        onOpenChange={(open) => !open && setPasswordRoom(null)}
        room={passwordRoom}
        onJoined={handlePasswordJoined}
      />
    </div>
  );
}
