"use client";

import { motion } from "framer-motion";
import { Lock, Users, TreePine } from "lucide-react";
import type { RoomInfo } from "./square-container";

interface RoomCardProps {
  room: RoomInfo;
  onJoin: (room: RoomInfo) => void;
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onJoin(room)}
      className="nature-panel p-4 text-left w-full flex flex-col gap-2 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-bold text-ghibli-ink text-base truncate flex-1">
          {room.title}
        </h3>
        {!room.isPublic && (
          <span className="shrink-0 w-6 h-6 rounded-full bg-ghibli-sunset-light flex items-center justify-center">
            <Lock size={12} className="text-ghibli-sunset" />
          </span>
        )}
      </div>

      {room.description && (
        <p className="text-xs text-ghibli-ink-light line-clamp-2">{room.description}</p>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-ghibli-ink-light flex items-center gap-1">
          <TreePine size={12} className="text-ghibli-forest" />
          {room.hostDisplayName}
        </span>
        <span className="text-xs font-medium text-ghibli-forest flex items-center gap-1">
          <Users size={12} />
          {room.playerCount}/{room.maxPlayers}
        </span>
      </div>
    </motion.button>
  );
}
