"use client";

import { useCallback, useEffect, useRef } from "react";

export interface InputState {
  vx: number;
  vy: number;
}

const MOVEMENT_KEYS = new Set([
  "arrowup", "arrowdown", "arrowleft", "arrowright",
  "w", "a", "s", "d",
]);

export function useInput(enabled: boolean) {
  const keysRef = useRef(new Set<string>());
  const touchRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  useEffect(() => {
    if (!enabled) {
      // Clear keys when disabled (e.g. chat focused)
      keysRef.current.clear();
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is on an input/textarea element
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Skip IME composition
      if (e.isComposing || e.keyCode === 229) return;

      const key = e.key.toLowerCase();
      if (MOVEMENT_KEYS.has(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const onBlur = () => {
      keysRef.current.clear();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled]);

  const getInput = useCallback((): InputState => {
    const keys = keysRef.current;
    let vx = 0;
    let vy = 0;

    if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
    if (keys.has("arrowright") || keys.has("d")) vx += 1;
    if (keys.has("arrowup") || keys.has("w")) vy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) vy += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    // Add touch joystick input
    if (touchRef.current.vx !== 0 || touchRef.current.vy !== 0) {
      vx = touchRef.current.vx;
      vy = touchRef.current.vy;
    }

    return { vx, vy };
  }, []);

  const setTouchInput = useCallback((vx: number, vy: number) => {
    touchRef.current = { vx, vy };
  }, []);

  return { getInput, setTouchInput };
}
