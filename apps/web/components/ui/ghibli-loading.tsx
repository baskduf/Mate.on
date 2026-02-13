"use client";

import { cn } from "@/lib/utils";

interface GhibliLoadingProps {
  variant?: "dots" | "leaf";
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { dot: "h-1.5 w-1.5", gap: "gap-1", leaf: "h-4 w-4" },
  md: { dot: "h-2 w-2", gap: "gap-1.5", leaf: "h-6 w-6" },
  lg: { dot: "h-3 w-3", gap: "gap-2", leaf: "h-8 w-8" },
};

export function GhibliLoading({
  variant = "dots",
  className,
  size = "md",
}: GhibliLoadingProps) {
  const s = sizeMap[size];

  if (variant === "leaf") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <svg
          className={cn(s.leaf, "animate-sway text-ghibli-forest")}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
        </svg>
      </div>
    );
  }

  // Default: dots variant
  return (
    <div className={cn("flex items-center justify-center", s.gap, className)}>
      <div
        className={cn(
          s.dot,
          "rounded-full bg-ghibli-forest animate-bounce-slight"
        )}
        style={{ animationDelay: "0ms" }}
      />
      <div
        className={cn(
          s.dot,
          "rounded-full bg-ghibli-forest/70 animate-bounce-slight"
        )}
        style={{ animationDelay: "150ms" }}
      />
      <div
        className={cn(
          s.dot,
          "rounded-full bg-ghibli-forest/40 animate-bounce-slight"
        )}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
