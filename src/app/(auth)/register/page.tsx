"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      setLoading(false);
      setError("Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setLoading(false);
      setError(
        "Username can only contain letters, numbers, and underscores."
      );
      return;
    }

    // Create Supabase account
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          full_name: fullName,
          username: cleanUsername,
        },
      },
    });

    if (error) {
      setLoading(false);
      setError("Unable to create the account. Please review your details and try again.");
      return;
    }

    setLoading(false);
    router.replace("/verify");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05091d] px-4">
      <div className="w-full max-w-md bg-[#141c32] rounded-3xl border border-slate-700 p-10">

        <h1 className="text-5xl font-bold text-white text-center">
          Create Account
        </h1>

        <p className="text-slate-400 text-center mt-4 mb-10">
          Join El-Mayhoub Finance
        </p>

        <form onSubmit={handleRegister} className="space-y-6">

          {/* Username */}
          <div>
            <label className="text-white block mb-2">
              Username
            </label>

            <input
              type="text"
              placeholder="Choose your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full rounded-xl bg-[#24304a] border border-slate-600 px-4 py-4 text-white outline-none focus:border-blue-500"
            />

            <p className="text-slate-500 text-xs mt-2">
              Letters, numbers, and underscores only.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="text-white block mb-2">
              Full Name
            </label>

            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl bg-[#24304a] border border-slate-600 px-4 py-4 text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-white block mb-2">
              Email
            </label>

            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-[#24304a] border border-slate-600 px-4 py-4 text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-white block mb-2">
              Password
            </label>

            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl bg-[#24304a] border border-slate-600 px-4 py-4 text-white outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition rounded-xl py-4 text-white font-bold"
          >
            {loading ? "Creating..." : "Register"}
          </button>

        </form>

        <p className="text-center text-slate-400 mt-8">
          Already have an account?{" "}

          <Link
            href="/login"
            className="text-blue-400 hover:underline"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}
