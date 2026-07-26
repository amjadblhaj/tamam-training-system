"use client";

import { useEffect, useState } from "react";

const COLORS = ["#86BC76", "#F18E64", "#68925C", "#1A2E1A"];
const PARTICLE_COUNT = 18;
const DURATION_MS = 900;

interface Particle {
  id: number;
  tx: number;
  ty: number;
  rot: number;
  color: string;
  size: number;
  delay: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
    const distance = 60 + Math.random() * 60;
    return {
      id: i,
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      rot: Math.random() * 360 - 180,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      delay: Math.random() * 100,
    };
  });
}

/**
 * A brief, dependency-free confetti burst (pure CSS keyframe, randomized
 * per-particle via inline custom properties) — for the reward-redemption
 * success moment. Calls `onDone` after the animation finishes so the parent
 * can unmount it.
 */
export function ConfettiBurst({ onDone }: { onDone: () => void }): JSX.Element {
  const [particles] = useState(makeParticles);

  useEffect(() => {
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center">
      {particles.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute rounded-sm"
          style={
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
