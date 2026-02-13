"use client";

import { cn } from "@/lib/utils";

interface NatureBackgroundProps {
  variant?: "meadow" | "forest" | "sky" | "sunset";
  className?: string;
}

const variantStyles = {
  meadow: [
    "bg-[radial-gradient(ellipse_at_30%_60%,rgba(168,198,134,0.2)_0%,transparent_55%)]",
    "bg-[radial-gradient(ellipse_at_70%_30%,rgba(135,187,202,0.15)_0%,transparent_45%)]",
  ],
  forest: [
    "bg-[radial-gradient(ellipse_at_20%_80%,rgba(74,124,89,0.12)_0%,transparent_50%)]",
    "bg-[radial-gradient(ellipse_at_75%_20%,rgba(125,184,142,0.1)_0%,transparent_45%)]",
  ],
  sky: [
    "bg-[radial-gradient(ellipse_at_50%_0%,rgba(135,187,202,0.2)_0%,transparent_60%)]",
    "bg-[radial-gradient(ellipse_at_20%_70%,rgba(155,142,196,0.08)_0%,transparent_40%)]",
  ],
  sunset: [
    "bg-[radial-gradient(ellipse_at_80%_20%,rgba(232,149,109,0.18)_0%,transparent_50%)]",
    "bg-[radial-gradient(ellipse_at_30%_70%,rgba(242,184,138,0.1)_0%,transparent_45%)]",
  ],
};

export function NatureBackground({
  variant = "meadow",
  className,
}: NatureBackgroundProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      {/* Gradient wash layers */}
      <div className={cn("absolute inset-0", variantStyles[variant][0])} />
      <div className={cn("absolute inset-0", variantStyles[variant][1])} />

      {/* Subtle light ray from top-right */}
      <div
        className="absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(245,240,232,0.6) 0%, transparent 70%)",
        }}
      />

      {/* Floating cloud shapes */}
      <div
        className="absolute top-[15%] left-[10%] h-12 w-24 rounded-full opacity-20 animate-drift"
        style={{ background: "rgba(245,240,232,0.8)" }}
      />
      <div
        className="absolute top-[8%] right-[20%] h-8 w-16 rounded-full opacity-15 animate-drift"
        style={{
          background: "rgba(245,240,232,0.7)",
          animationDelay: "2s",
          animationDuration: "8s",
        }}
      />
    </div>
  );
}
