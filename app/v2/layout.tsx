import type { ReactNode } from "react";
import { TopNav } from "@/components/v2/top-nav";

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-black v2-desktop-backdrop">
      <TopNav />
      <div className="v2-shell">{children}</div>
    </div>
  );
}
