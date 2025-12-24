"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Coins,
  Calendar,
  MessageSquare,
  Loader2,
  Check,
  Save,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  credits: number;
  createdAt: string;
  _count?: {
    conversations: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setName(data.name || "");
      } else {
        setError("Failed to load profile");
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = profile && name !== (profile.name || "");

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-orange-500/[0.02] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </Link>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-stone-900/50 border border-stone-700/30 rounded-2xl p-6">
              {/* Avatar and Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-bold">
                  {name ? name[0].toUpperCase() : profile.email[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {name || "Add your name"}
                  </h2>
                  <p className="text-white/50 text-sm">{profile.email}</p>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Your Name
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="flex-1 px-4 py-3 bg-stone-800/50 border border-stone-700/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:cursor-not-allowed text-black disabled:text-stone-400 font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : saveSuccess ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? "Saving" : saveSuccess ? "Saved" : "Save"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    Sage will use your name to personalize your conversations
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-900/50 border border-stone-700/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Coins className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-sm text-white/60">Credits</span>
                </div>
                <p className="text-2xl font-bold">{profile.credits.toLocaleString()}</p>
              </div>

              <div className="bg-stone-900/50 border border-stone-700/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm text-white/60">Conversations</span>
                </div>
                <p className="text-2xl font-bold">{profile._count?.conversations ?? 0}</p>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-stone-900/50 border border-stone-700/30 rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-white/80 mb-4">Account Details</h3>

              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-white/40" />
                <span className="text-white/60">Email:</span>
                <span className="text-white/90">{profile.email}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-white/40" />
                <span className="text-white/60">Member since:</span>
                <span className="text-white/90">
                  {new Date(profile.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
