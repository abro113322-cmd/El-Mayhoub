"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");

  const confirmationFailed = searchParams.get("error") === "confirmation";

  useEffect(() => {
    async function loadAuthenticatedUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        router.replace("/dashboard");
        return;
      }

      if (user?.email) {
        setEmail(user.email);
      }

      setLoading(false);
    }

    void loadAuthenticatedUser();
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = window.setInterval(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldown]);

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail || cooldown > 0) return;

    setSending(true);
    setMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    setSending(false);
    setCooldown(RESEND_COOLDOWN_SECONDS);

    if (error) {
      setMessage("We could not send an email right now. Please wait a moment and try again.");
      return;
    }

    setMessage("If an account is eligible for confirmation, a new email has been sent.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050816] px-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl p-10 border border-slate-700">
        <h1 className="text-4xl font-bold text-white text-center mb-3">
          Confirm your email
        </h1>

        <p className="text-slate-400 text-center mb-6">
          Email confirmation is required before you can access your dashboard.
        </p>

        {confirmationFailed && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-400 text-sm mb-5">
            This confirmation link is invalid or expired. Request a new email below.
          </div>
        )}

        <form onSubmit={handleResend} className="space-y-5">
          <div>
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading || sending}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {message && (
            <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-3 text-blue-200 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || sending || cooldown > 0}
            className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-xl py-4 text-white font-bold disabled:opacity-50"
          >
            {sending
              ? "Sending..."
              : cooldown > 0
              ? `Try again in ${cooldown}s`
              : "Resend confirmation email"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-8">
          Already confirmed your email?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400">
            Return to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050816]" aria-busy="true" />
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
