import { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard | UpSprint",
  description:
    "Global rankings of competitive programmers across all platforms.",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
