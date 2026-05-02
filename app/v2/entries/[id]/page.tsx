"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { EntryDetailPane } from "@/components/v2/entry-detail-pane";

export default function EntryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // On desktop the master/detail view at /v2/entries handles this id directly;
  // bounce there so we don't show a redundant single-pane page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      router.replace(`/v2/entries?id=${id}`);
    }
  }, [id, router]);

  return (
    <div className="lg:hidden">
      <div className="v2-screen bg-chamber-900 px-0">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <Link
            href="/v2/entries"
            className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </Link>
          <span className="text-xs text-chamber-500 lowercase">reflection</span>
          <span className="w-9" />
        </div>
        <EntryDetailPane id={id} variant="page" />
      </div>
    </div>
  );
}
