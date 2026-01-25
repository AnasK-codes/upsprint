import { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard | UpSprint",
  description:
    "Global rankings of competitive programmers across all platforms.",
};

import { Suspense } from "react";
import Loading from "@/components/Loading";

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LeaderboardClient />
    </Suspense>
  );
}
