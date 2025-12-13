"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Coins } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but failed to sign in. Please try signing in manually.");
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
    <div className="min-h-screen-safe bg-[#0a0a0f] flex items-center justify-center px-4 py-8 sm:py-12">
      {/* Background effects - smaller on mobile */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-amber-500/[0.03] rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-orange-500/[0.02] rounded-full blur-[60px] sm:blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-1 ring-stone-500/20 shadow-xl shadow-black/40">
              <img
                src="/sage.png"
                alt="Sage"
                className="w-full h-full object-cover object-top scale-150"
              />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Create your account</h1>
          <p className="text-sm sm:text-base text-white/50">Start your journey of self-discovery</p>
        </div>

        {/* Free credits banner */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 sm:gap-3">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-amber-200/80">
            Get <span className="font-semibold text-amber-400">1,000 free credits</span> when you sign up
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
            <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
              Name <span className="text-white/40">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full px-3 sm:px-4 py-3 bg-stone-900/50 border border-stone-700/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/50 focus:border-transparent transition-all text-base"
              placeholder="Your name"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 sm:px-4 py-3 bg-stone-900/50 border border-stone-700/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/50 focus:border-transparent transition-all text-base"
              placeholder="you@example.com"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 sm:px-4 py-3 bg-stone-900/50 border border-stone-700/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/50 focus:border-transparent transition-all text-base"
              placeholder="At least 6 characters"
              style={{ fontSize: '16px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 active:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-manipulation"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm sm:text-base">Creating account...</span>
              </>
            ) : (
              <span className="text-sm sm:text-base">Create account</span>
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-4 sm:mt-6 text-center text-white/50 text-xs sm:text-sm">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
