export const calculateScore = (snapshot: any) => {
  let score = 0;

  if (snapshot.rating) score += snapshot.rating;
  if (snapshot.problemsSolved) score += snapshot.problemsSolved * 2;

  return score;
};
