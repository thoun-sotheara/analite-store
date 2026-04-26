"use client";

import { useMemo } from "react";

type ConfettiParticle = {
  id: number;
  left: string;
  delay: string;
  duration: string;
  bg: string;
};

const colors = ["#3B82F6", "#22D3EE", "#FBBF24", "#34D399", "#F87171"];

export function ConfettiOverlay() {
  const particles = useMemo<ConfettiParticle[]>(
    () =>
      Array.from({ length: 50 }).map((_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1.2}s`,
        duration: `${1.4 + Math.random() * 1.6}s`,
        bg: colors[index % colors.length],
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="pointer-events-none absolute -top-2 h-2 w-2 animate-[confetti_var(--dur)_linear_var(--delay)_forwards] rounded-sm"
          style={
            {
              left: particle.left,
              backgroundColor: particle.bg,
              "--dur": particle.duration,
              "--delay": particle.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
