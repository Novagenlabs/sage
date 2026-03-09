"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Coins,
  Calendar,
  MessageSquare,
  Loader2,
  Check,
  Save,
  Gift,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="min-h-screen-safe bg-chamber-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-chamber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-chamber-900 text-chamber-100">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full animate-ambient"
          style={{
            background: "radial-gradient(circle, rgba(224, 124, 56, 0.06) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full animate-ambient-slow"
          style={{
            background: "radial-gradient(circle, rgba(196, 149, 106, 0.04) 0%, transparent 60%)",
            animationDelay: "-10s",
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className={`flex items-center gap-4 mb-8 ${mounted ? "animate-fade-in" : "opacity-0"}`}>
          <Link
            href="/"
            className="p-2 hover:bg-chamber-800/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-chamber-400" />
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-chamber-50">
            Profile
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {profile && (
          <div className="space-y-5 sm:space-y-6">
            {/* Profile Card */}
            <div className={`glass rounded-2xl p-5 sm:p-6 ${mounted ? "animate-fade-up stagger-2" : "opacity-0"}`}>
              {/* Avatar and Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-ember-500 to-ember-700 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg shadow-ember-500/20">
                  {name ? name[0].toUpperCase() : profile.email[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-medium text-chamber-50">
                    {name || "Add your name"}
                  </h2>
                  <p className="text-sm text-chamber-500">{profile.email}</p>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-chamber-300 mb-2">
                  Your Name
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 px-3 sm:px-4 py-3 glass-strong rounded-xl text-chamber-100 placeholder-chamber-600 focus:outline-none focus:ring-2 focus:ring-ember-500/50 focus:border-transparent transition-all text-base"
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="px-4 py-3 bg-ember-500 hover:bg-ember-400 active:bg-ember-600 disabled:bg-chamber-700 disabled:cursor-not-allowed text-white disabled:text-chamber-500 font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-ember-500/20 disabled:shadow-none"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {isSaving ? "Saving" : saveSuccess ? "Saved" : "Save"}
                    </span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-chamber-600">
                  Sage will use your name to personalize your conversations
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-3 gap-3 sm:gap-4 ${mounted ? "animate-fade-up stagger-3" : "opacity-0"}`}>
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-ember-500/10 border border-ember-500/15 rounded-lg">
                    <Coins className="w-3.5 h-3.5 text-ember-400" />
                  </div>
                  <span className="text-xs text-chamber-500">Credits</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-chamber-50">{profile.credits.toLocaleString()}</p>
                <Link
                  href="/credits"
                  className="mt-2 inline-block text-xs font-medium text-ember-400 hover:text-ember-300 transition-colors"
                >
                  Buy more &rarr;
                </Link>
              </div>

              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-sage-900/40 border border-sage-500/15 rounded-lg">
                    <MessageSquare className="w-3.5 h-3.5 text-sage-400" />
                  </div>
                  <span className="text-xs text-chamber-500">Sessions</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-chamber-50">{profile._count?.conversations ?? 0}</p>
              </div>

              <Link href="/referrals" className="glass rounded-xl p-4 hover:bg-chamber-800/40 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-gold-400/10 border border-gold-400/15 rounded-lg">
                    <Gift className="w-3.5 h-3.5 text-gold-400" />
                  </div>
                  <span className="text-xs text-chamber-500">Referrals</span>
                </div>
                <p className="text-xs text-ember-400 group-hover:text-ember-300 font-medium transition-colors mt-1">
                  Invite friends &rarr;
                </p>
              </Link>
            </div>

            {/* Account Info */}
            <div className={`glass rounded-xl p-4 sm:p-5 space-y-3 ${mounted ? "animate-fade-up stagger-4" : "opacity-0"}`}>
              <h3 className="font-display text-base font-medium text-chamber-200 mb-4">Account Details</h3>

              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-chamber-500" />
                <span className="text-chamber-500">Email:</span>
                <span className="text-chamber-200">{profile.email}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-chamber-500" />
                <span className="text-chamber-500">Member since:</span>
                <span className="text-chamber-200">
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
