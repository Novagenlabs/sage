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

// Oracle's Chamber state-based colors
const STATE_CONFIG = {
  idle: {
    primary: "#e07c38", // ember-500
    secondary: "#c4956a", // gold-400
    tertiary: "#d16426", // ember-600
    glow: "rgba(224, 124, 56, 0.35)",
    glowOuter: "rgba(196, 149, 106, 0.15)",
    pulseSpeed: 4000,
    particleSpeed: 0.25,
  },
  listening: {
    primary: "#6b9a8d", // sage-400
    secondary: "#9eb9b0", // sage-300
    tertiary: "#4e7d70", // sage-500
    glow: "rgba(107, 154, 141, 0.45)",
    glowOuter: "rgba(158, 185, 176, 0.2)",
    pulseSpeed: 2500,
    particleSpeed: 0.45,
  },
  thinking: {
    primary: "#e07c38", // ember-500
    secondary: "#e9985c", // ember-400
    tertiary: "#c4956a", // gold-400
    glow: "rgba(224, 124, 56, 0.5)",
    glowOuter: "rgba(233, 152, 92, 0.25)",
    pulseSpeed: 900,
    particleSpeed: 1.0,
  },
  speaking: {
    primary: "#d4654a", // terra-500
    secondary: "#ec8d78", // terra-400
    tertiary: "#c14f34", // terra-600
    glow: "rgba(212, 101, 74, 0.55)",
    glowOuter: "rgba(236, 141, 120, 0.25)",
    pulseSpeed: 1200,
    particleSpeed: 0.7,
  },
};

export function VoiceOrb({
  state,
  audioLevel = 0,
  size = 200,
  className,
}: VoiceOrbProps) {
  const padding = size * 0.6;
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
    orbitRadius: number;
  }>>([]);
  const [smoothedLevel, setSmoothedLevel] = useState(0);
  const timeRef = useRef(0);
  const prevStateRef = useRef(state);
  const transitionRef = useRef(0);

  // Smooth the audio level with faster response
  useEffect(() => {
    setSmoothedLevel(prev => prev + (audioLevel - prev) * 0.3);
  }, [audioLevel]);

  // Initialize particles
  useEffect(() => {
    const particles = [];
    const particleCount = 80;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const baseRadius = size * 0.28;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const orbitRadius = baseRadius * (0.9 + Math.random() * 0.6);
      particles.push({
        x: centerX + Math.cos(angle) * orbitRadius,
        y: centerY + Math.sin(angle) * orbitRadius,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        orbitRadius,
      });
    }
    particlesRef.current = particles;
  }, [size, canvasSize]);

  // Handle state transitions
  useEffect(() => {
    if (prevStateRef.current !== state) {
      transitionRef.current = 0;
      prevStateRef.current = state;
    }
  }, [state]);

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

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const baseRadius = size * 0.28;

    const animate = () => {
      timeRef.current += 16;
      const time = timeRef.current;

      // Smooth transition progress
      transitionRef.current = Math.min(1, transitionRef.current + 0.02);

      const config = STATE_CONFIG[state];

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Calculate breathing pulse
      const breathPhase = (time / config.pulseSpeed) * Math.PI * 2;
      const breathe = Math.sin(breathPhase) * 0.06 + Math.sin(breathPhase * 0.5) * 0.03;
      const audioPulse = smoothedLevel * 0.3;
      const currentRadius = baseRadius * (1 + breathe + audioPulse);

      // Draw outer atmospheric glow
      const outerGlow = ctx.createRadialGradient(
        centerX, centerY, currentRadius * 0.2,
        centerX, centerY, currentRadius * 2.8
      );
      outerGlow.addColorStop(0, config.glowOuter);
      outerGlow.addColorStop(0.4, config.glowOuter.replace(/[\d.]+\)$/, "0.08)"));
      outerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw inner glow
      const innerGlow = ctx.createRadialGradient(
        centerX, centerY, currentRadius * 0.3,
        centerX, centerY, currentRadius * 1.8
      );
      innerGlow.addColorStop(0, config.glow);
      innerGlow.addColorStop(0.5, config.glow.replace(/[\d.]+\)$/, "0.12)"));
      innerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = innerGlow;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw particles
      const particles = particlesRef.current;
      particles.forEach((p) => {
        const angle = Math.atan2(p.y - centerY, p.x - centerX);
        const dist = Math.sqrt(
          Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2)
        );

        // Dynamic orbit radius based on state
        const targetRadius = currentRadius * (1.15 + Math.sin(p.phase + time * 0.0008) * 0.25);
        const radiusDiff = targetRadius - dist;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        p.x += nx * radiusDiff * 0.025;
        p.y += ny * radiusDiff * 0.025;

        // Orbital motion
        const orbitSpeed = config.particleSpeed * 0.015 * (1 + smoothedLevel * 0.4);
        const orbitVariation = 0.4 + Math.sin(p.phase) * 0.6;
        p.x += -ny * orbitSpeed * orbitVariation;
        p.y += nx * orbitSpeed * orbitVariation;

        // State-specific behaviors
        if (state === "thinking") {
          p.x += Math.sin(time * 0.004 + p.phase * 3) * 0.6;
          p.y += Math.cos(time * 0.003 + p.phase * 2) * 0.6;
        }

        if (state === "speaking" && smoothedLevel > 0.08) {
          const burstForce = smoothedLevel * 1.5 * Math.sin(time * 0.008 + p.phase);
          p.x += nx * burstForce;
          p.y += ny * burstForce;
        }

        if (state === "listening") {
          // Gentle pulsing toward center when listening
          const pulseIn = Math.sin(time * 0.002) * 0.3;
          p.x -= nx * pulseIn;
          p.y -= ny * pulseIn;
        }

        // Draw particle with trail effect
        const particleAlpha = p.alpha * (0.5 + smoothedLevel * 0.5);
        const particleSize = p.size * (1 + smoothedLevel * 0.4);

        // Particle glow
        const pGradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, particleSize * 2
        );
        pGradient.addColorStop(0, config.secondary.replace(")", `, ${particleAlpha})`).replace("#", "rgba(").replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) => `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`));
        pGradient.addColorStop(1, "transparent");
        ctx.fillStyle = pGradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, particleSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // Particle core
        ctx.beginPath();
        ctx.arc(p.x, p.y, particleSize * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha * 0.8})`;
        ctx.fill();
      });

      // Draw core orb with multiple layers
      for (let layer = 4; layer >= 0; layer--) {
        const layerRadius = currentRadius * (1 - layer * 0.1);
        const layerAlpha = 0.2 + (4 - layer) * 0.18;

        // Organic wobble
        ctx.beginPath();
        const segments = 72;
        for (let i = 0; i <= segments; i++) {
          const segAngle = (i / segments) * Math.PI * 2;
          const wobbleIntensity = state === "idle" ? 1.5 : (3 + smoothedLevel * 6);
          const wobbleOffset =
            Math.sin(segAngle * 3 + time * 0.0015) * wobbleIntensity +
            Math.sin(segAngle * 5 - time * 0.001) * wobbleIntensity * 0.4 +
            Math.sin(segAngle * 7 + time * 0.002) * wobbleIntensity * 0.2;
          const r = layerRadius + wobbleOffset;
          const x = centerX + Math.cos(segAngle) * r;
          const y = centerY + Math.sin(segAngle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Gradient fill with depth
        const gradient = ctx.createRadialGradient(
          centerX - layerRadius * 0.25,
          centerY - layerRadius * 0.3,
          0,
          centerX + layerRadius * 0.1,
          centerY + layerRadius * 0.1,
          layerRadius * 1.3
        );
        gradient.addColorStop(0, config.secondary);
        gradient.addColorStop(0.4, config.primary);
        gradient.addColorStop(0.8, config.tertiary);
        gradient.addColorStop(1, config.tertiary + "66");

        ctx.fillStyle = gradient;
        ctx.globalAlpha = layerAlpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Draw concentric rings
      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = currentRadius * (1.3 + ring * 0.25);
        const ringAlpha = 0.12 - ring * 0.03;
        const ringRotation = time * 0.0005 * (ring % 2 === 0 ? 1 : -1);

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, ringRotation, ringRotation + Math.PI * 1.5);
        ctx.strokeStyle = config.primary + Math.floor(ringAlpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.35,
        0,
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.35,
        currentRadius * 0.6
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
      highlightGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
      highlightGradient.addColorStop(1, "transparent");
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner light point
      const innerLight = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, currentRadius * 0.3
      );
      innerLight.addColorStop(0, "rgba(255, 255, 255, 0.15)");
      innerLight.addColorStop(1, "transparent");
      ctx.fillStyle = innerLight;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 0.3, 0, Math.PI * 2);
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
        className="transition-transform duration-500"
      />
      {/* State indicator ring */}
      <div
        className={clsx(
          "absolute inset-0 rounded-full border transition-all duration-700",
          state === "listening" && "border-sage-400/30 animate-ping",
          state === "thinking" && "border-ember-500/30 animate-pulse",
          state === "speaking" && "border-terra-500/30",
          state === "idle" && "border-gold-400/15"
        )}
        style={{
          width: size,
          height: size,
          animationDuration: state === "thinking" ? "0.9s" : "2.5s",
        }}
      />
    </div>
  );
}
