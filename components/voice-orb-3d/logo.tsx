"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

export interface LogoOrbProps {
  size?: number;
  className?: string;
  /** When true, orb pulses gently. Default false for static logo use. */
  animated?: boolean;
}

// Oracle's Chamber color scheme
const COLORS = {
  primary: "#e07c38", // ember-500
  secondary: "#c4956a", // gold-400
  tertiary: "#d16426", // ember-600
  glow: "rgba(224, 124, 56, 0.3)",
  glowOuter: "rgba(196, 149, 106, 0.15)",
};

export function LogoOrb({
  size = 32,
  className,
  animated = false,
}: LogoOrbProps) {
  const padding = size * 0.5;
  const canvasSize = size + padding * 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const shouldAnimate = animated && !prefersReducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.scale(dpr, dpr);

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const baseRadius = size * 0.35;

    const draw = () => {
      timeRef.current += 16;
      const time = timeRef.current;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Calculate breathing pulse for animated mode
      const breathe = shouldAnimate
        ? Math.sin((time / 4000) * Math.PI * 2) * 0.04 + Math.sin((time / 2000) * Math.PI * 2) * 0.02
        : 0;
      const currentRadius = baseRadius * (1 + breathe);

      // Draw outer atmospheric glow
      const outerGlow = ctx.createRadialGradient(
        centerX, centerY, currentRadius * 0.2,
        centerX, centerY, currentRadius * 2
      );
      outerGlow.addColorStop(0, COLORS.glowOuter);
      outerGlow.addColorStop(0.5, "rgba(196, 149, 106, 0.06)");
      outerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw inner glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, currentRadius * 0.3,
        centerX, centerY, currentRadius * 1.6
      );
      glowGradient.addColorStop(0, COLORS.glow);
      glowGradient.addColorStop(0.5, "rgba(224, 124, 56, 0.1)");
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw core orb with layered gradient
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);

      const gradient = ctx.createRadialGradient(
        centerX - currentRadius * 0.25,
        centerY - currentRadius * 0.3,
        0,
        centerX + currentRadius * 0.1,
        centerY + currentRadius * 0.1,
        currentRadius * 1.2
      );
      gradient.addColorStop(0, COLORS.secondary);
      gradient.addColorStop(0.4, COLORS.primary);
      gradient.addColorStop(0.8, COLORS.tertiary);
      gradient.addColorStop(1, "#8b4022"); // ember-800

      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.35,
        0,
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.35,
        currentRadius * 0.55
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.35)");
      highlightGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
      highlightGradient.addColorStop(1, "transparent");
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner light point
      const innerLight = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, currentRadius * 0.25
      );
      innerLight.addColorStop(0, "rgba(255, 255, 255, 0.12)");
      innerLight.addColorStop(1, "transparent");
      ctx.fillStyle = innerLight;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      if (shouldAnimate) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, canvasSize, shouldAnimate]);

  return (
    <div
      className={clsx("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Sage"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: canvasSize,
          height: canvasSize,
          position: "absolute",
          top: -padding,
          left: -padding,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
