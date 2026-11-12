"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandedLoader from "../../components/BrandedLoader";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

function OAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  // The code is single use, so guard against React strict-mode running the effect twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login");
      return;
    }

    // Remove the one-time code from the address bar / history right away.
    window.history.replaceState({}, document.title, window.location.pathname);

    (async () => {
      try {
        // Backend validates the code and sets the httpOnly auth cookie.
        await api.exchangeOAuthCode(code);
        await login();
        router.replace("/leaderboard");
      } catch {
        router.replace("/login?error=oauth");
      }
    })();
  }, [router, searchParams, login]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <BrandedLoader />
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-10">
          <BrandedLoader />
        </div>
      }
    >
      <OAuthSuccessContent />
    </Suspense>
  );
}
