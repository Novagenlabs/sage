"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { VideoChat } from "@/components/v2/video-chat";

export default function VideoChatPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/chat/video");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  const credits = (session?.user as { credits?: number })?.credits ?? 0;

  return (
    <VideoChat
      userCredits={credits}
      onClose={(conversationId) =>
        router.push(
          conversationId
            ? `/entries/active?id=${conversationId}`
            : "/entries"
        )
      }
      onCreditsUpdate={() => update()}
    />
  );
}
