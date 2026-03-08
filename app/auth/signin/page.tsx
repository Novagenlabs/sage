"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { LogoOrb } from "@/components/voice-orb-3d";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen-safe bg-chamber-900 flex items-center justify-center px-4 py-8 sm:py-12">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Background effects */}
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

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <LogoOrb size={64} className="sm:hidden" />
            <LogoOrb size={80} className="hidden sm:block" animated />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-chamber-50 mb-2 text-balance">
            Welcome back
          </h1>
          <p className="text-sm sm:text-base text-chamber-400 text-pretty">
            Sign in to continue your journey
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-chamber-300 mb-1.5 sm:mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 sm:px-4 py-3 glass-strong rounded-xl text-chamber-100 placeholder-chamber-500 focus:outline-none focus:ring-2 focus:ring-ember-500/50 focus:border-transparent transition-all text-base"
              placeholder="you@example.com"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-chamber-300 mb-1.5 sm:mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 sm:px-4 py-3 pr-11 glass-strong rounded-xl text-chamber-100 placeholder-chamber-500 focus:outline-none focus:ring-2 focus:ring-ember-500/50 focus:border-transparent transition-all text-base"
                placeholder="Enter your password"
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-chamber-400 hover:text-chamber-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-ember-500 hover:bg-ember-400 active:bg-ember-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 touch-manipulation shadow-lg shadow-ember-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm sm:text-base">Signing in...</span>
              </>
            ) : (
              <span className="text-sm sm:text-base">Sign in</span>
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-4 sm:mt-6 text-center text-chamber-500 text-xs sm:text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-ember-400 hover:text-ember-300 hover:underline transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
