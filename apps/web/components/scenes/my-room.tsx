"use client";

import { motion } from "framer-motion";
import { AvatarPreview } from "../avatar/avatar-preview";
import { Edit2, Leaf, TreePine } from "lucide-react";
import { NatureBackground } from "@/components/ui/nature-background";

interface MyRoomProps {
  layers: Record<string, string>;
  loading: boolean;
  onOpenInventory: () => void;
  isOverlay?: boolean;
}

export function MyRoom({ layers, loading, onOpenInventory, isOverlay = false }: MyRoomProps) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overscroll-none">
      {/* Ghibli Nature Background */}
      <NatureBackground variant="meadow" />

      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Warm sunlight shaft from upper-right */}
        <div
          className="absolute -top-20 -right-10 w-[400px] h-[400px] opacity-40"
          style={{
            background: "radial-gradient(circle at center, rgba(242,184,138,0.3) 0%, transparent 70%)",
          }}
        />

        {/* Floating leaves */}
        <motion.div
          animate={{ y: [0, -15, 0], x: [0, 5, 0], rotate: [0, 10, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4"
        >
          <Leaf className="text-ghibli-meadow w-7 h-7 opacity-50" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, -8, 0], rotate: [0, -15, 5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-1/3 right-1/4"
        >
          <Leaf className="text-ghibli-forest-light w-5 h-5 opacity-40" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-1/3 right-1/3"
        >
          <TreePine className="text-ghibli-forest/20 w-6 h-6" />
        </motion.div>
      </div>

      {/* Avatar Container */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <AvatarPreview layers={layers} width={340} height={420} />
          </motion.div>
        </motion.div>

        {/* Grassy pedestal shadow */}
        <div
          className="w-48 h-12 rounded-[50%] blur-md -mt-10 z-10 transform scale-y-50"
          style={{
            background: "radial-gradient(ellipse, rgba(168,198,134,0.35) 0%, rgba(74,124,89,0.1) 60%, transparent 80%)",
          }}
        />

        {/* Edit Button — forest-themed */}
        {!isOverlay && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onOpenInventory}
            className="absolute -right-8 bottom-10 bg-ghibli-cloud p-3.5 rounded-2xl shadow-lg border-2 border-ghibli-forest/20 text-ghibli-forest z-30 btn-organic"
          >
            <Edit2 size={24} strokeWidth={2.5} />
          </motion.button>
        )}

        {/* Chat Bubble — nature-panel style */}
        {!isOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 nature-panel px-5 py-2.5 shadow-lg whitespace-nowrap z-30"
          >
            <p className="text-sm font-bold text-ghibli-ink flex items-center gap-1">
              <Leaf size={14} className="text-ghibli-forest" />
              <span>오늘도 멋진 하루!</span>
            </p>
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
              style={{
                background: "rgba(245, 240, 232, 0.75)",
                borderRight: "1.5px solid rgba(214, 207, 197, 0.6)",
                borderBottom: "1.5px solid rgba(214, 207, 197, 0.6)",
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
