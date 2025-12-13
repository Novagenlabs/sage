"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

interface VoiceOrbProps {
  state: "idle" | "listening" | "thinking" | "speaking";
  audioLevel?: number; // 0-1
  size?: number;
  className?: string;
}

export function VoiceOrb({
  state,
  audioLevel = 0,
  size = 200,
  className
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [smoothedLevel, setSmoothedLevel] = useState(0);

  // Smooth the audio level for nicer animations
  useEffect(() => {
    setSmoothedLevel(prev => prev + (audioLevel - prev) * 0.3);
  }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const getColors = () => {
      switch (state) {
        case "listening":
          return {
            primary: "#22c55e", // green
            secondary: "#4ade80",
            glow: "rgba(34, 197, 94, 0.4)",
          };
        case "thinking":
          return {
            primary: "#d97706", // amber-600
            secondary: "#f59e0b", // amber-500
            glow: "rgba(217, 119, 6, 0.4)",
          };
        case "speaking":
          return {
            primary: "#ea580c", // orange-600
            secondary: "#f97316", // orange-500
            glow: "rgba(234, 88, 12, 0.5)",
          };
        default:
          return {
            primary: "#b45309", // amber-700
            secondary: "#d97706", // amber-600
            glow: "rgba(180, 83, 9, 0.3)",
          };
      }
    };

    const animate = () => {
      const colors = getColors();
      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.3;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Calculate pulse based on state and audio level
      const stateMultiplier = state === "speaking" ? 1.5 : state === "listening" ? 1.2 : 1;
      const pulse = Math.sin(time * 0.05) * 0.1 * stateMultiplier;
      const audioPulse = smoothedLevel * 0.2;
      const radius = baseRadius * (1 + pulse + audioPulse);

      // Draw outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.5,
        centerX, centerY, radius * 2
      );
      glowGradient.addColorStop(0, colors.glow);
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, size, size);

      // Draw multiple orb layers for depth
      for (let i = 3; i >= 0; i--) {
        const layerRadius = radius * (1 - i * 0.1);
        const layerOpacity = 0.3 + (3 - i) * 0.2;

        // Create organic wobble
        ctx.beginPath();
        const points = 64;
        for (let j = 0; j <= points; j++) {
          const angle = (j / points) * Math.PI * 2;
          const wobbleAmount = state === "idle" ? 2 : 5 + smoothedLevel * 10;
          const wobble =
            Math.sin(angle * 3 + time * 0.03) * wobbleAmount +
            Math.sin(angle * 5 - time * 0.02) * wobbleAmount * 0.5 +
            Math.sin(angle * 7 + time * 0.04) * wobbleAmount * 0.3;
          const r = layerRadius + wobble;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Gradient fill
        const gradient = ctx.createRadialGradient(
          centerX - radius * 0.3,
          centerY - radius * 0.3,
          0,
          centerX,
          centerY,
          layerRadius * 1.2
        );
        gradient.addColorStop(0, colors.secondary);
        gradient.addColorStop(0.5, colors.primary);
        gradient.addColorStop(1, `${colors.primary}88`);

        ctx.fillStyle = gradient;
        ctx.globalAlpha = layerOpacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Draw highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.4,
        0,
        centerX - radius * 0.3,
        centerY - radius * 0.4,
        radius * 0.6
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
      highlightGradient.addColorStop(1, "transparent");
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw particle effects when speaking
      if (state === "speaking" || state === "listening") {
        const particleCount = state === "speaking" ? 12 : 6;
        for (let i = 0; i < particleCount; i++) {
          const particleAngle = (i / particleCount) * Math.PI * 2 + time * 0.02;
          const particleDistance = radius * (1.2 + Math.sin(time * 0.05 + i) * 0.3);
          const particleX = centerX + Math.cos(particleAngle) * particleDistance;
          const particleY = centerY + Math.sin(particleAngle) * particleDistance;
          const particleSize = 2 + smoothedLevel * 4;

          ctx.beginPath();
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          ctx.fillStyle = `${colors.secondary}88`;
          ctx.fill();
        }
      }

      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, state, smoothedLevel]);

  return (
    <div className={clsx("relative", className)}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="transition-transform duration-300"
      />
      {/* State indicator ring */}
      <div
        className={clsx(
          "absolute inset-0 rounded-full border-2 transition-all duration-500",
          state === "listening" && "border-green-500/30 animate-ping",
          state === "thinking" && "border-amber-500/30 animate-pulse",
          state === "speaking" && "border-orange-500/30",
          state === "idle" && "border-amber-700/20"
        )}
        style={{
          width: size,
          height: size,
          animationDuration: state === "thinking" ? "1s" : "2s"
        }}
      />
    </div>
  );
}
