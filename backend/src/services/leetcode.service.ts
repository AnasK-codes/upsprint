import axios from "axios";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

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
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
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
