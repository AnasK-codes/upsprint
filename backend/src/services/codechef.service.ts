import axios from "axios";

export interface CodeChefProfile {
  username: string;
  rating: number;
  stars: string;
  globalRank: number | null;
  countryRank: number | null;
  raw: any;
}

export const fetchCodeChefProfile = async (username: string): Promise<CodeChefProfile> => {
  try {
    const response = await axios.get(`https://www.codechef.com/users/${username}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;

    // Extract Rating
    const ratingMatch = html.match(/class="rating-number">(\d+)<\/div>/);
    const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;

    // Extract Stars
    const starsMatch = html.match(/class="rating-star">.*?<span>(.*?)<\/span>/s);
    const stars = starsMatch ? starsMatch[1].trim() : "";

    // Extract Ranks
    const globalRankMatch = html.match(/Global Rank.*?<strong>(\d+)<\/strong>/s);
    const globalRank = globalRankMatch ? parseInt(globalRankMatch[1], 10) : null;

    const countryRankMatch = html.match(/Country Rank.*?<strong>(\d+)<\/strong>/s);
    const countryRank = countryRankMatch ? parseInt(countryRankMatch[1], 10) : null;

    if (rating === 0 && !response.request.path.includes(username)) {
    }

    return {
      username,
      rating,
      stars,
      globalRank,
      countryRank,
      raw: { rating, globalRank, countryRank },
    };
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      throw new Error("User not found");
    }
    console.error(`Error fetching CodeChef profile for ${username}:`, error.message);
    throw error;
  }
};
