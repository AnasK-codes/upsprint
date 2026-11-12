/**
 * Standard competition ranking ("1224"): items with equal keys share a rank and
 * the following rank skips accordingly (1, 2, 2, 4).
 *
 * `items` must already be sorted best-first. `skip` is how many items precede
 * this slice in the full list (page offset). `firstRank` is the rank of the
 * first item; it defaults to skip + 1, but callers paging into the middle of a
 * tie group must pass 1 + the number of items strictly ahead of it.
 */
export function competitionRanks<T>(
  items: T[],
  key: (item: T) => string | number,
  skip = 0,
  firstRank = skip + 1
): number[] {
  const ranks: number[] = [];
  items.forEach((item, i) => {
    if (i === 0) ranks.push(firstRank);
    else if (key(item) === key(items[i - 1])) ranks.push(ranks[i - 1]);
    else ranks.push(skip + i + 1);
  });
  return ranks;
}
