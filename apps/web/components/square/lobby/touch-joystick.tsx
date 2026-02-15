"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface TouchJoystickProps {
  onMove: (vx: number, vy: number) => void;
}

export function TouchJoystick({ onMove }: TouchJoystickProps) {
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  const BASE_RADIUS = 40;
  const KNOB_RADIUS = 20;
  const MAX_DIST = BASE_RADIUS - KNOB_RADIUS;

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;

    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setActive(true);
    updatePosition(clientX, clientY);
  }, []);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const center = centerRef.current;
    let dx = clientX - center.x;
    let dy = clientY - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > MAX_DIST) {
      dx = (dx / dist) * MAX_DIST;
      dy = (dy / dist) * MAX_DIST;
    }

    setKnobPos({ x: dx, y: dy });

    const normalizedDist = Math.min(dist, MAX_DIST) / MAX_DIST;
    if (normalizedDist > 0.15) {
      const vx = (dx / MAX_DIST);
      const vy = (dy / MAX_DIST);
      onMove(vx, vy);
    } else {
      onMove(0, 0);
    }
  }, [MAX_DIST, onMove]);

  const handleEnd = useCallback(() => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    if (!active) return;

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      updatePosition(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => handleEnd();

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [active, updatePosition, handleEnd]);

  if (!isTouchDevice) return null;

  return (
    <div className="fixed bottom-20 left-6 z-40 pointer-events-auto">
      <div
        ref={baseRef}
        className="relative rounded-full border-2 border-white/30 bg-black/20 backdrop-blur-sm"
        style={{ width: BASE_RADIUS * 2, height: BASE_RADIUS * 2 }}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          handleStart(touch.clientX, touch.clientY);
        }}
      >
        <div
          className="absolute rounded-full bg-white/60 border border-white/40 transition-none"
          style={{
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            left: BASE_RADIUS - KNOB_RADIUS + knobPos.x,
            top: BASE_RADIUS - KNOB_RADIUS + knobPos.y,
          }}
        />
      </div>
    </div>
  );
}
