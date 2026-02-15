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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { RoomInfo } from "./square-container";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (room: RoomInfo) => void;
}

export function CreateRoomDialog({ open, onOpenChange, onCreated }: CreateRoomDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("방 이름을 입력해주세요");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/square/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || undefined,
          isPublic,
          password: !isPublic ? password : undefined,
          maxPlayers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "방 생성에 실패했어요");
      }

      const { room } = await res.json();

      // Join the room via API
      await fetch(`/api/square/rooms/${room.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: !isPublic ? password : undefined }),
      });

      onOpenChange(false);
      setTitle("");
      setDescription("");
      setIsPublic(true);
      setPassword("");
      setMaxPlayers(20);

      onCreated({
        id: room.id,
        title: room.title,
        description: room.description,
        hostUserId: "",
        hostDisplayName: "",
        isPublic: room.isPublic,
        hasPassword: !room.isPublic && !!password,
        playerCount: 1,
        maxPlayers: room.maxPlayers,
        isOnline: true,
        isHost: true,
      });

      toast.success("방이 만들어졌어요!");
    } catch (e: any) {
      toast.error(e.message || "방 생성에 실패했어요");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nature-panel border-ghibli-mist">
        <DialogHeader>
          <DialogTitle className="font-display text-ghibli-ink">방 만들기</DialogTitle>
          <DialogDescription className="text-ghibli-ink-light">
            친구들과 함께할 공간을 만들어보세요
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-ghibli-ink text-sm">방 이름</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="우리들의 아지트"
              maxLength={50}
              className="border-ghibli-mist"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-ghibli-ink text-sm">설명 (선택)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="자유롭게 이야기해요"
              maxLength={200}
              className="border-ghibli-mist"
            />
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-ghibli-ink text-sm">공개 여부</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={isPublic ? "forest" : "nature"}
                onClick={() => setIsPublic(true)}
              >
                공개
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!isPublic ? "sunset" : "nature"}
                onClick={() => setIsPublic(false)}
              >
                비밀
              </Button>
            </div>
          </div>

          {!isPublic && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-ghibli-ink text-sm">비밀번호</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                maxLength={30}
                className="border-ghibli-mist"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-ghibli-ink text-sm">최대 인원</Label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-ghibli-mist bg-transparent px-3 py-1 text-sm"
            >
              {[5, 10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>{n}명</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="forest" onClick={handleCreate} disabled={creating}>
            {creating ? "만드는 중..." : "만들기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
