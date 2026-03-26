"use client";

import { forwardRef } from "react";

interface ReferralCardProps {
  userName: string;
  referralCode: string;
}

/**
 * A 600x315 shareable referral card optimized for social media screenshots.
 * Pure CSS visuals (no canvas) so it renders crisply at any zoom level.
 */
export const ReferralCard = forwardRef<HTMLDivElement, ReferralCardProps>(
  function ReferralCard({ userName, referralCode }, ref) {
  return (
    <div
      ref={ref}
      className="relative w-[600px] h-[315px] rounded-2xl overflow-hidden select-none flex-shrink-0"
      style={{
        background: "#08080c",
        border: "1px solid rgba(196,149,106,0.15)",
        boxShadow:
          "0 24px 80px -20px rgba(0,0,0,0.6), 0 0 1px rgba(196,149,106,0.2)",
        fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
      }}
    >
      {/* === LEFT PANEL — Atmospheric orb scene === */}
      <div className="absolute inset-0 w-[58%] h-full overflow-hidden">
        {/* Deep background texture — layered radial gradients */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 45% 45%, rgba(224,124,56,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 50% 80% at 30% 70%, rgba(196,149,106,0.06) 0%, transparent 50%),
              radial-gradient(ellipse 120% 100% at 50% 50%, rgba(8,8,12,1) 40%, transparent 100%),
              linear-gradient(165deg, #0c0b10 0%, #08080c 50%, #0a0910 100%)
            `,
          }}
        />

        {/* Subtle constellation dots */}
        {[
          { x: "15%", y: "20%", s: 1.5, o: 0.3 },
          { x: "72%", y: "15%", s: 1, o: 0.2 },
          { x: "80%", y: "68%", s: 1.2, o: 0.15 },
          { x: "25%", y: "75%", s: 1, o: 0.2 },
          { x: "60%", y: "30%", s: 0.8, o: 0.15 },
          { x: "10%", y: "50%", s: 1, o: 0.1 },
          { x: "50%", y: "80%", s: 0.8, o: 0.12 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: dot.x,
              top: dot.y,
              width: dot.s,
              height: dot.s,
              background: `rgba(196,149,106,${dot.o})`,
              boxShadow: `0 0 ${dot.s * 3}px rgba(196,149,106,${dot.o * 0.5})`,
            }}
          />
        ))}

        {/* The Orb — CSS-only glowing sphere */}
        <div className="absolute" style={{ left: "38%", top: "30%", transform: "translate(-50%, -50%)" }}>
          {/* Outermost glow */}
          <div
            className="absolute rounded-full"
            style={{
              width: 160,
              height: 160,
              left: -40,
              top: -40,
              background: "radial-gradient(circle, rgba(224,124,56,0.08) 0%, transparent 70%)",
            }}
          />
          {/* Mid glow ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: 110,
              height: 110,
              left: -15,
              top: -15,
              background: "radial-gradient(circle, rgba(224,124,56,0.15) 0%, rgba(196,149,106,0.05) 50%, transparent 70%)",
            }}
          />
          {/* Core orb */}
          <div
            className="relative rounded-full"
            style={{
              width: 80,
              height: 80,
              background: `
                radial-gradient(circle at 35% 30%, rgba(255,200,140,0.4) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, #e07c38 0%, #d16426 40%, #a04a1a 70%, rgba(8,8,12,0.8) 100%)
              `,
              boxShadow: `
                0 0 40px rgba(224,124,56,0.4),
                0 0 80px rgba(224,124,56,0.2),
                0 0 4px rgba(255,180,100,0.3),
                inset 0 -8px 20px rgba(0,0,0,0.4),
                inset 0 4px 12px rgba(255,200,140,0.15)
              `,
            }}
          >
            {/* Specular highlight */}
            <div
              className="absolute rounded-full"
              style={{
                width: 24,
                height: 18,
                left: 18,
                top: 14,
                background: "radial-gradient(ellipse, rgba(255,220,180,0.35) 0%, transparent 70%)",
                filter: "blur(3px)",
                transform: "rotate(-15deg)",
              }}
            />
          </div>
        </div>

        {/* Brand text */}
        <div className="absolute bottom-0 left-0 right-0 px-7 pb-6">
          <p
            className="font-display text-3xl font-medium tracking-tight italic"
            style={{ color: "rgba(232,228,222,0.9)" }}
          >
            Sage
          </p>
          <p
            className="text-[11px] mt-1 tracking-[0.15em] uppercase"
            style={{
              color: "rgba(196,149,106,0.5)",
              fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
            }}
          >
            Think clearly. Speak freely.
          </p>
        </div>
      </div>

      {/* === LUMINOUS DIVIDER === */}
      <div
        className="absolute h-full"
        style={{
          left: "58%",
          width: 1,
          background: `linear-gradient(
            to bottom,
            transparent 5%,
            rgba(196,149,106,0.08) 15%,
            rgba(224,124,56,0.25) 40%,
            rgba(224,124,56,0.35) 50%,
            rgba(224,124,56,0.25) 60%,
            rgba(196,149,106,0.08) 85%,
            transparent 95%
          )`,
          boxShadow: "0 0 12px rgba(224,124,56,0.15), 0 0 4px rgba(224,124,56,0.1)",
        }}
      />

      {/* === RIGHT PANEL — Personalized info === */}
      <div
        className="absolute right-0 top-0 h-full flex flex-col justify-between"
        style={{ width: "42%", padding: "28px 28px 24px" }}
      >
        {/* Subtle texture on right panel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 80% 20%, rgba(224,124,56,0.03) 0%, transparent 60%),
              linear-gradient(175deg, rgba(12,11,16,0.5) 0%, transparent 100%)
            `,
          }}
        />

        {/* Top — Referrer info */}
        <div className="relative z-10">
          <p
            className="text-[10px] uppercase tracking-[0.2em] mb-2"
            style={{
              color: "rgba(196,149,106,0.45)",
              fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
            }}
          >
            Invited by
          </p>
          <p
            className="font-display text-xl font-medium italic truncate"
            style={{ color: "rgba(232,228,222,0.85)" }}
          >
            {userName || "A Friend"}
          </p>

          {/* Thin decorative line */}
          <div
            className="mt-3 mb-4"
            style={{
              width: 40,
              height: 1,
              background: "linear-gradient(to right, rgba(224,124,56,0.4), transparent)",
            }}
          />

          {/* Offer */}
          <div>
            <p
              className="text-[22px] font-display font-semibold"
              style={{ color: "#e07c38", lineHeight: 1.1 }}
            >
              2 free minutes
            </p>
            <p
              className="text-[11px] mt-1.5 leading-relaxed"
              style={{
                color: "rgba(196,149,106,0.5)",
                fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
              }}
            >
              of voice coaching with AI
            </p>
          </div>
        </div>

        {/* Bottom — Code & domain */}
        <div className="relative z-10">
          {/* Referral code pill */}
          <div
            className="inline-flex items-center rounded-lg px-3 py-1.5 mb-3"
            style={{
              background: "rgba(224,124,56,0.08)",
              border: "1px solid rgba(224,124,56,0.15)",
            }}
          >
            <span
              className="text-[10px] uppercase tracking-wider mr-2"
              style={{
                color: "rgba(196,149,106,0.5)",
                fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
              }}
            >
              Code
            </span>
            <span
              className="text-xs font-medium tracking-wide font-mono"
              style={{ color: "#e07c38" }}
            >
              {referralCode}
            </span>
          </div>

          <p
            className="text-[11px] tracking-wide"
            style={{
              color: "rgba(196,149,106,0.35)",
              fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
            }}
          >
            answerswithsage.xyz
          </p>
        </div>
      </div>

      {/* Corner accent — subtle gold border glow top-left */}
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: 80,
          height: 80,
          background: `
            linear-gradient(135deg, rgba(196,149,106,0.1) 0%, transparent 50%)
          `,
          borderTopLeftRadius: 16,
        }}
      />

      {/* Corner accent — bottom-right */}
      <div
        className="absolute bottom-0 right-0 pointer-events-none"
        style={{
          width: 60,
          height: 60,
          background: `
            linear-gradient(-45deg, rgba(224,124,56,0.06) 0%, transparent 50%)
          `,
          borderBottomRightRadius: 16,
        }}
      />
    </div>
  );
});
