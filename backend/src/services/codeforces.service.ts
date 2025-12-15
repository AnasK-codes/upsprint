import axios from "axios";

export const fetchCodeforcesUser = async (handle: string) => {
  const res = await axios.get(
    `https://codeforces.com/api/user.info?handles=${handle}`
  );

  return res.data.result[0];
};
