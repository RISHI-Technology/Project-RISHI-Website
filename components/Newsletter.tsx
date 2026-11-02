"use client";

import { useState } from "react";

/**
 * Newsletter — email capture for the semesterly newsletter.
 * Submits the email to the newsletter subscribe API.
 */
export default function Newsletter({ variant = "classic" }: { variant?: "classic" | "site" } = {}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    try {
      const res = await fetch("/api/lms/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Couldn't sign you up. Please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (variant === "site") {
    return (
      <div>
        <p className="a-title3 text-white">Sign up for our newsletter</p>
        {done ? (
          <p className="a-callout mt-4 rounded-[var(--a-r-sm)] bg-marigold/15 px-4 py-3 text-white">
            Thanks for subscribing — we&rsquo;ll be in touch.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@berkeley.edu"
              aria-label="Email address"
              className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/20 bg-white/[0.06] px-4 text-[1rem] text-white placeholder:text-white/45 transition-colors duration-150 focus:border-marigold"
            />
            <button type="submit" className="a-btn a-btn-primary shrink-0">
              Submit
            </button>
          </form>
        )}
        {error && <p className="a-callout mt-2 text-marigold">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <p className="font-display text-xl font-semibold text-paper">
        Sign up for our newsletter
      </p>
      {done ? (
        <p className="mt-4 rounded-xl bg-marigold/15 px-4 py-3 text-sm text-marigold-soft">
          Thanks for subscribing — we&rsquo;ll be in touch.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@berkeley.edu"
            className="min-w-0 flex-1 rounded-full border border-paper/20 bg-paper/5 px-4 py-2.5 text-sm text-paper placeholder:text-paper/40 focus:border-marigold focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-marigold px-5 py-2.5 text-sm font-semibold text-pine-deep transition-colors hover:bg-marigold-deep hover:text-paper"
          >
            Submit
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-marigold-soft">{error}</p>}
    </div>
  );
}
