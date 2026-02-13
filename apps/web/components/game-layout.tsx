"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Map as MapIcon, ShoppingBag, Menu, Settings, Plus, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom Navigation Bar
 * Ghibli nature-themed floating dock
 */
function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "홈", icon: Home, path: "/" },
    { label: "광장", icon: MapIcon, path: "/square" },
    { label: "상점", icon: ShoppingBag, path: "/shop" },
    { label: "메뉴", icon: Menu, path: "/menu" },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="nature-panel px-6 py-4 flex justify-between items-center shadow-lg">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <motion.button
              key={item.path}
              onClick={() => router.push(item.path)}
              whileTap={{ scale: 0.8 }}
              className="relative flex flex-col items-center justify-center gap-1 group w-14 h-14"
            >
              {isActive && (
                <motion.div
                  layoutId="active-blob"
                  className="absolute inset-0 bg-ghibli-forest rounded-2xl -z-10 shadow-lg"
                  style={{ boxShadow: "0 4px 16px rgba(74, 124, 89, 0.35)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
              <item.icon
                size={28}
                className={cn(
                  "transition-all duration-300",
                  isActive ? "text-white scale-110" : "text-ghibli-ink-light group-hover:text-ghibli-forest"
                )}
                strokeWidth={isActive ? 3 : 2.5}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Top Status Bar
 * Ghibli nature-themed HUD
 */
function TopBar() {
  return (
    <div className="fixed top-0 left-0 right-0 p-4 z-50 flex justify-between items-start pointer-events-none">
      {/* Profile / Level (Left) */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-ghibli-forest-light shadow-lg overflow-hidden bg-ghibli-sky relative z-10">
          <img src="/avatar/body.svg" alt="Profile" className="w-full h-full bg-ghibli-cloud-deep" />
        </div>
        <div className="nature-panel pl-6 pr-4 py-1.5 -ml-8 flex flex-col justify-center">
          <span className="text-xs font-bold text-ghibli-ink-light ml-2">Lv. 15</span>
          <div className="w-20 h-2 bg-ghibli-cloud-deep rounded-full ml-2 overflow-hidden">
            <div className="h-full bg-ghibli-meadow rounded-full w-[70%]" />
          </div>
        </div>
      </div>

      {/* Currency Pill (Right) */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="nature-panel pl-2 pr-4 py-1.5 flex items-center gap-2 shadow-md">
          <div className="w-8 h-8 rounded-full bg-ghibli-sunset-light border-2 border-white flex items-center justify-center shadow-sm">
            <Leaf size={16} className="text-ghibli-forest" />
          </div>
          <span className="font-display font-bold text-ghibli-ink text-lg">1,250</span>
          <button className="w-6 h-6 rounded-full bg-ghibli-forest text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform">
            <Plus size={14} strokeWidth={4} />
          </button>
        </div>
        <button className="w-10 h-10 nature-panel flex items-center justify-center hover:bg-ghibli-cloud-deep transition-colors shadow-md rounded-full btn-organic text-ghibli-ink-light">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}

export function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOverlay = searchParams.get("overlay") === "1";

  if (isOverlay) {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-transparent">
        <main className="w-full h-full relative">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Soft warm gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-ghibli-cloud/40 z-0" />

      <TopBar />

      <main className="w-full h-full relative z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
