"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandedLoader from "../../components/BrandedLoader";

function OAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setTimeout(() => {
        router.push("/leaderboard");
      }, 1500);
    } else {
      router.push("/");
    }
  }, [router, searchParams]);

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
