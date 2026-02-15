"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { RoomInfo } from "./square-container";

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomInfo | null;
  onJoined: (room: RoomInfo) => void;
}

export function PasswordDialog({ open, onOpenChange, room, onJoined }: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!room) return;

    setJoining(true);
    try {
      const res = await fetch(`/api/square/rooms/${room.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          toast.error("비밀번호가 틀렸어요");
        } else {
          toast.error(data.error || "입장에 실패했어요");
        }
        return;
      }

      onOpenChange(false);
      setPassword("");
      onJoined(room);
    } catch {
      toast.error("입장에 실패했어요");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nature-panel border-ghibli-mist">
        <DialogHeader>
          <DialogTitle className="font-display text-ghibli-ink">비밀번호 입력</DialogTitle>
          <DialogDescription className="text-ghibli-ink-light">
            &quot;{room?.title}&quot;에 입장하려면 비밀번호가 필요해요
          </DialogDescription>
        </DialogHeader>

        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="border-ghibli-mist"
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />

        <DialogFooter>
          <Button variant="forest" onClick={handleJoin} disabled={joining}>
            {joining ? "입장 중..." : "입장하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
