"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

// Re-export logo orb for convenient imports
export { LogoOrb } from "./logo";
export type { LogoOrbProps } from "./logo";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceOrbProps {
  state: OrbState;
  audioLevel?: number;
  size?: number;
  className?: string;
}

// State-based colors and behaviors
const STATE_CONFIG = {
  idle: {
    primary: "#d97706", // amber-600
    secondary: "#f59e0b", // amber-500
    glow: "rgba(217, 119, 6, 0.4)",
    pulseSpeed: 3000,
    particleSpeed: 0.3,
  },
  listening: {
    primary: "#22c55e", // green-500
    secondary: "#4ade80", // green-400
    glow: "rgba(34, 197, 94, 0.5)",
    pulseSpeed: 2000,
    particleSpeed: 0.5,
  },
  thinking: {
    primary: "#d97706", // amber-600
    secondary: "#fbbf24", // amber-400
    glow: "rgba(217, 119, 6, 0.5)",
    pulseSpeed: 800,
    particleSpeed: 1.2,
  },
  speaking: {
    primary: "#ea580c", // orange-600
    secondary: "#fb923c", // orange-400
    glow: "rgba(234, 88, 12, 0.6)",
    pulseSpeed: 1500,
    particleSpeed: 0.8,
  },
};

export function VoiceOrb({
  state,
  audioLevel = 0,
  size = 200,
  className,
}: VoiceOrbProps) {
  // Add padding for glow and particles that extend beyond the orb
  const padding = size * 0.5; // 50% padding for glow effects
  const canvasSize = size + padding * 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    phase: number;
  }>>([]);
  const [smoothedLevel, setSmoothedLevel] = useState(0);
  const timeRef = useRef(0);

  // Smooth the audio level
  useEffect(() => {
    setSmoothedLevel(prev => prev + (audioLevel - prev) * 0.25);
  }, [audioLevel]);

  // Initialize particles
  useEffect(() => {
    const particles = [];
    const particleCount = 60;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const baseRadius = size * 0.25;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = baseRadius + Math.random() * baseRadius * 0.5;
      particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 2 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;
  }, [size, canvasSize]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.scale(dpr, dpr);

    const config = STATE_CONFIG[state];
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const baseRadius = size * 0.28;

    const animate = () => {
      timeRef.current += 16;
      const time = timeRef.current;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Calculate pulse
      const pulsePhase = (time / config.pulseSpeed) * Math.PI * 2;
      const pulse = Math.sin(pulsePhase) * 0.08;
      const audioPulse = smoothedLevel * 0.25;
      const currentRadius = baseRadius * (1 + pulse + audioPulse);

      // Draw outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, currentRadius * 0.3,
        centerX, centerY, currentRadius * 2.2
      );
      glowGradient.addColorStop(0, config.glow);
      glowGradient.addColorStop(0.5, config.glow.replace(/[\d.]+\)$/, "0.15)"));
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw particles
      const particles = particlesRef.current;
      particles.forEach((p, i) => {
        // Update particle position - orbit around center
        const angle = Math.atan2(p.y - centerY, p.x - centerX);
        const dist = Math.sqrt(
          Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2)
        );

        // Target orbit radius
        const targetRadius = currentRadius * (1.1 + Math.sin(p.phase + time * 0.001) * 0.3);

        // Move towards target radius
        const radiusDiff = targetRadius - dist;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        p.x += nx * radiusDiff * 0.03;
        p.y += ny * radiusDiff * 0.03;

        // Orbital motion
        const orbitSpeed = config.particleSpeed * 0.02 * (1 + smoothedLevel * 0.5);
        p.x += -ny * orbitSpeed * (0.5 + Math.sin(p.phase) * 0.5);
        p.y += nx * orbitSpeed * (0.5 + Math.sin(p.phase) * 0.5);

        // Chaos for thinking state
        if (state === "thinking") {
          p.x += Math.sin(time * 0.005 + p.phase * 3) * 0.8;
          p.y += Math.cos(time * 0.004 + p.phase * 2) * 0.8;
        }

        // Burst effect for speaking
        if (state === "speaking" && smoothedLevel > 0.1) {
          const burstForce = smoothedLevel * 2 * Math.sin(time * 0.01 + p.phase);
          p.x += nx * burstForce;
          p.y += ny * burstForce;
        }

        // Draw particle
        const particleAlpha = p.alpha * (0.6 + smoothedLevel * 0.4);
        const particleSize = p.size * (1 + smoothedLevel * 0.5);

        ctx.beginPath();
        ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = config.secondary.replace(")", `, ${particleAlpha})`).replace("rgb", "rgba");
        ctx.fill();
      });

      // Draw core orb layers
      for (let layer = 3; layer >= 0; layer--) {
        const layerRadius = currentRadius * (1 - layer * 0.12);
        const layerAlpha = 0.3 + (3 - layer) * 0.2;

        // Slight wobble for organic feel
        ctx.beginPath();
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const segAngle = (i / segments) * Math.PI * 2;
          const wobble = state === "idle"
            ? 2
            : (4 + smoothedLevel * 8);
          const wobbleOffset =
            Math.sin(segAngle * 3 + time * 0.002) * wobble +
            Math.sin(segAngle * 5 - time * 0.0015) * wobble * 0.5;
          const r = layerRadius + wobbleOffset;
          const x = centerX + Math.cos(segAngle) * r;
          const y = centerY + Math.sin(segAngle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Gradient fill
        const gradient = ctx.createRadialGradient(
          centerX - layerRadius * 0.25,
          centerY - layerRadius * 0.25,
          0,
          centerX,
          centerY,
          layerRadius * 1.2
        );
        gradient.addColorStop(0, config.secondary);
        gradient.addColorStop(0.5, config.primary);
        gradient.addColorStop(1, config.primary + "88");

        ctx.fillStyle = gradient;
        ctx.globalAlpha = layerAlpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Draw highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.35,
        0,
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.35,
        currentRadius * 0.5
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.35)");
      highlightGradient.addColorStop(1, "transparent");
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, canvasSize, state, smoothedLevel]);

  return (
    <div
      className={clsx("relative", className)}
      style={{ width: size, height: size }}
    >
      {/* Canvas with extra padding for glow - positioned to center the orb */}
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
        className="transition-transform duration-300"
      />
      {/* State indicator ring */}
      <div
        className={clsx(
          "absolute inset-0 rounded-full border-2 transition-all duration-500",
          state === "listening" && "border-green-500/40 animate-ping",
          state === "thinking" && "border-amber-500/40 animate-pulse",
          state === "speaking" && "border-orange-500/40",
          state === "idle" && "border-amber-700/20"
        )}
        style={{
          width: size,
          height: size,
          animationDuration: state === "thinking" ? "0.8s" : "2s",
        }}
      />
    </div>
  );
}
