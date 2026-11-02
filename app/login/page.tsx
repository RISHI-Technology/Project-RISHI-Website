"use client";

import { Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteLabel from "@/components/SiteLabel";

function LoginCard() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <div className="w-full max-w-md rounded-[var(--r-media)] border border-graphite/10 bg-snow p-8 shadow-[0_24px_60px_-32px_rgb(var(--c-graphite)/0.35)] sm:p-10">
      <SiteLabel>Members Only</SiteLabel>
      <h1 className="t-h2 mt-6 text-deodar">Member Login</h1>
      <p className="t-small mt-3 text-stone">
        Sign in with your Berkeley email to access the member
        dashboard.
      </p>

      {error && (
        <p role="alert" className="t-small mt-6 rounded-[var(--r-control)] border border-red-700/20 bg-red-50 px-4 py-3 text-red-800">
          That account isn&rsquo;t on the member list. If this is a mistake,
          please inform Webmaster.
        </p>
      )}

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="s-btn s-btn-outline mt-8 w-full gap-3"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Sign in with Google
      </button>

      <p className="t-small mt-6 text-stone">
        Access is limited to registered members. Not a member?{" "}
        <a href="/apply" className="s-link font-medium">
          Apply to join
        </a>
        .
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <section className="site flex min-h-[88vh] items-center justify-center bg-mist px-6 pb-16 pt-[calc(var(--header-h)+3rem)]">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </section>
  );
}
