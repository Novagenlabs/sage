// Shared shell for the Privacy Policy and Terms pages. Plain, readable, dark
// ember-themed document layout — server component, no client JS needed.

import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#08080c",
        color: "#e8e4de",
        padding: "48px 20px 96px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            color: "#e07c38",
            textDecoration: "none",
            fontSize: 14,
            letterSpacing: "0.02em",
          }}
        >
          ← Sage
        </Link>

        <h1
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: 40,
            fontWeight: 600,
            margin: "24px 0 8px",
            color: "#f5f1ea",
          }}
        >
          {title}
        </h1>
        <p style={{ color: "#9a958c", fontSize: 14, margin: "0 0 40px" }}>
          Effective {effectiveDate}
        </p>

        <article
          style={{
            fontFamily: "var(--font-body), system-ui, sans-serif",
            fontSize: 16,
            lineHeight: 1.7,
            color: "#cfc9c0",
          }}
        >
          {children}
        </article>
      </div>
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display), Georgia, serif",
        fontSize: 24,
        fontWeight: 600,
        color: "#f5f1ea",
        margin: "40px 0 12px",
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 16px" }}>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul style={{ margin: "0 0 16px", paddingLeft: 22 }}>{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return <li style={{ margin: "0 0 8px" }}>{children}</li>;
}
