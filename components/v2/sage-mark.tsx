"use client";

// Sage brand mark for v2 — wraps the v1 animated LogoOrb (canvas-painted
// ember orb with breathing pulse). Pass `animated` to enable the breathe.
import { LogoOrb } from "@/components/voice-orb-3d/logo";

export function SageMark({
  size = 48,
  className = "",
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return <LogoOrb size={size} className={className} animated={animated} />;
}

export function SageWordmark({
  className = "",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <SageMark size={28} animated={animated} />
      <span className="font-display text-2xl tracking-tight lowercase">sage</span>
    </div>
  );
}
