/**
 * Generates PWA icon PNGs of the signature Sage orb.
 * Uses the same drawing logic as components/voice-orb-3d/logo.tsx.
 */
import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { join } from "path";

const COLORS = {
  primary: "#e07c38",
  secondary: "#c4956a",
  tertiary: "#d16426",
  glow: "rgba(224, 124, 56, 0.3)",
  glowOuter: "rgba(196, 149, 106, 0.15)",
};

function drawOrb(outputSize, padding = 0) {
  const canvasSize = outputSize;
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext("2d");

  // Dark background matching the app
  ctx.fillStyle = "#08080c";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const baseRadius = (canvasSize - padding * 2) * 0.35;

  // Outer atmospheric glow
  const outerGlow = ctx.createRadialGradient(
    centerX, centerY, baseRadius * 0.2,
    centerX, centerY, baseRadius * 2
  );
  outerGlow.addColorStop(0, COLORS.glowOuter);
  outerGlow.addColorStop(0.5, "rgba(196, 149, 106, 0.06)");
  outerGlow.addColorStop(1, "transparent");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Inner glow
  const glowGradient = ctx.createRadialGradient(
    centerX, centerY, baseRadius * 0.3,
    centerX, centerY, baseRadius * 1.6
  );
  glowGradient.addColorStop(0, COLORS.glow);
  glowGradient.addColorStop(0.5, "rgba(224, 124, 56, 0.1)");
  glowGradient.addColorStop(1, "transparent");
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Core orb
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);

  const gradient = ctx.createRadialGradient(
    centerX - baseRadius * 0.25,
    centerY - baseRadius * 0.3,
    0,
    centerX + baseRadius * 0.1,
    centerY + baseRadius * 0.1,
    baseRadius * 1.2
  );
  gradient.addColorStop(0, COLORS.secondary);
  gradient.addColorStop(0.4, COLORS.primary);
  gradient.addColorStop(0.8, COLORS.tertiary);
  gradient.addColorStop(1, "#8b4022");

  ctx.fillStyle = gradient;
  ctx.fill();

  // Highlight
  const highlightGradient = ctx.createRadialGradient(
    centerX - baseRadius * 0.3,
    centerY - baseRadius * 0.35,
    0,
    centerX - baseRadius * 0.3,
    centerY - baseRadius * 0.35,
    baseRadius * 0.55
  );
  highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  highlightGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
  highlightGradient.addColorStop(1, "transparent");
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // Inner light point
  const innerLight = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, baseRadius * 0.25
  );
  innerLight.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  innerLight.addColorStop(1, "transparent");
  ctx.fillStyle = innerLight;
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

const iconsDir = join(process.cwd(), "public", "icons");

// Standard icons (orb with glow on dark bg)
const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-192.png", size: 192, padding: 20 },
  { name: "icon-maskable-512.png", size: 512, padding: 50 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

for (const { name, size, padding } of sizes) {
  const canvas = drawOrb(size, padding || 0);
  const buffer = canvas.toBuffer("image/png");
  const path = join(iconsDir, name);
  writeFileSync(path, buffer);
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log("\nAll orb icons generated!");
