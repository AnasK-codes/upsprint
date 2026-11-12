import axios from "axios";
import { HTTP_TIMEOUT_MS, USER_AGENT } from "../utils/http.js";

const LEETCODE_GRAPHQL_URL = `${process.env.LEETCODE_BASE_URL ?? "https://leetcode.com"}/graphql`;

const query = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submissionCalendar
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
      profile {
        ranking
      }
    }
    userContestRanking(username: $username) {
      rating
      globalRanking
    }
  }
`;

export const fetchLeetCodeProfile = async (username: string) => {
  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query,
        variables: { username },
      },
      {
        timeout: HTTP_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
      }
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const data = response.data.data;
    const matchedUser = data.matchedUser;
    const userContestRanking = data.userContestRanking;

    if (!matchedUser) {
      throw new Error("User not found");
    }

    const acSubmissionNum = matchedUser.submitStats.acSubmissionNum;
    const totalSolved = acSubmissionNum.find((item: any) => item.difficulty === "All").count;
    const easySolved = acSubmissionNum.find((item: any) => item.difficulty === "Easy").count;
    const mediumSolved = acSubmissionNum.find((item: any) => item.difficulty === "Medium").count;
    const hardSolved = acSubmissionNum.find((item: any) => item.difficulty === "Hard").count;

    return {
      username: matchedUser.username,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      rating: userContestRanking?.rating ? Math.round(userContestRanking.rating) : null,
      globalRanking: userContestRanking?.globalRanking || Number(matchedUser.profile?.ranking) || null,
      submissionCalendar: matchedUser.submissionCalendar ? JSON.parse(matchedUser.submissionCalendar) : {},
      raw: data,
    };
  } catch (error: any) {
    console.error(`Error fetching LeetCode profile for ${username}:`, error.message);
    throw error;
  }
};
