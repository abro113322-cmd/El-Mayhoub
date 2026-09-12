"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEmailConfirmationError = (message: string) => {
    const normalized = message.toLowerCase();

    return (
      normalized.includes("email not confirmed") ||
      (normalized.includes("confirm") && normalized.includes("email"))
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setLoading(false);

      if (isEmailConfirmationError(signInError.message)) {
        router.replace("/verify");
        return;
      }

      setError("Unable to sign in with those credentials.");
      return;
    }

    if (!data.session) {
      setLoading(false);
      setError("Unable to sign in with those credentials.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Unable to verify your sign-in. Please try again.");
      return;
    }

    if (!user.email_confirmed_at) {
      await supabase.auth.signOut();
      setLoading(false);
      router.replace("/verify");
      return;
    }

    try {
      await fetch("/api/auth/login-activity", {
        method: "POST",
        cache: "no-store",
      });
    } catch (logError) {
      // Login should still succeed even if activity logging fails.
      console.error("Login activity logging failed:", logError);
    }

    setLoading(false);
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050816] px-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl p-10 border border-slate-700">
        <h1 className="text-5xl font-bold text-white text-center mb-3">
          Welcome Back
        </h1>

        <p className="text-slate-400 text-center mb-8">
          Sign in to your El-Mayhoub account
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-white mb-2">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white outline-none focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-white mb-2">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-xl py-4 text-white font-bold disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Login"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-8">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-blue-500 hover:text-blue-400"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
