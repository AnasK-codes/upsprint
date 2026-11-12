// Deterministic data generators shared by the mock platform server and the seeder,
// so payload shapes and sizes match between "seeded history" and "freshly fetched" data.

export const DAY = 86400;

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Unix seconds of 00:00 UTC for the given epoch-seconds. */
export const dayStart = (ts) => ts - (ts % DAY);

/**
 * Random-walk activity model. Returns Map<dayStartUnix, count> for `days` days
 * ending at `endDayUnix` (inclusive). Zero days are omitted, like LeetCode's calendar.
 * `p` (probability of being active) drifts as a bounded random walk.
 */
export function activityWalk(rng, endDayUnix, days) {
  const out = new Map();
  let p = 0.1 + rng() * 0.7;
  for (let i = days - 1; i >= 0; i--) {
    p = Math.min(0.95, Math.max(0.02, p + (rng() - 0.5) * 0.12));
    if (rng() < p) {
      let c = 1;
      while (rng() < 0.55 && c < 40) c++;
      out.set(endDayUnix - i * DAY, c);
    }
  }
  return out;
}

/** JSON string of {"<unix>": count} for entries in (toDay-365d, toDay]. */
export function calendarString(activity, toDayUnix) {
  const from = toDayUnix - 364 * DAY;
  const o = {};
  for (const [d, c] of activity) if (d >= from && d <= toDayUnix) o[d] = c;
  return JSON.stringify(o);
}

const CF_RANKS = [
  [1200, "newbie"], [1400, "pupil"], [1600, "specialist"], [1900, "expert"],
  [2100, "candidate master"], [2300, "master"], [2400, "international master"],
  [2600, "grandmaster"], [3000, "international grandmaster"], [99999, "legendary grandmaster"],
];
export const cfRank = (r) => CF_RANKS.find(([m]) => r < m)[1];

export function stars(rating) {
  if (rating < 1400) return "1★";
  if (rating < 1600) return "2★";
  if (rating < 1800) return "3★";
  if (rating < 2000) return "4★";
  if (rating < 2200) return "5★";
  if (rating < 2500) return "6★";
  return "7★";
}

/** Deterministic per-username profile for every platform. */
export function profileFor(username, endDayUnix) {
  const rng = mulberry32(fnv1a(username));
  const easy = Math.floor(rng() * 300);
  const medium = Math.floor(rng() * 500 * rng());
  const hard = Math.floor(rng() * 150 * rng());
  const lcRating = rng() < 0.7 ? Math.round(1300 + rng() * 1500) : null;
  const cfRating = Math.round(800 + rng() * rng() * 2400 + 400);
  const ccRating = Math.round(1000 + rng() * rng() * 1800 + 200);
  const activity = activityWalk(mulberry32(fnv1a(username + ":act")), endDayUnix, 365);
  return {
    leetcode: {
      easy, medium, hard,
      total: easy + medium + hard,
      rating: lcRating,
      globalRanking: lcRating ? Math.floor(1 + rng() * 400000) : null,
      profileRanking: Math.floor(1 + rng() * 3000000),
      activity,
    },
    codeforces: {
      rating: cfRating,
      maxRating: cfRating + Math.floor(rng() * 200),
      contribution: Math.floor(rng() * 20) - 3,
      friendOfCount: Math.floor(rng() * 80),
    },
    codechef: {
      rating: ccRating,
      globalRank: Math.floor(1 + rng() * 150000),
      countryRank: Math.floor(1 + rng() * 40000),
    },
  };
}

/** The `data` object LeetCode's GraphQL returns (this is what the app stores as rawData). */
export function leetcodeData(username, p, calendarJson) {
  return {
    matchedUser: {
      username,
      submissionCalendar: calendarJson,
      submitStats: {
        acSubmissionNum: [
          { difficulty: "All", count: p.total, submissions: Math.round(p.total * 1.9) },
          { difficulty: "Easy", count: p.easy, submissions: Math.round(p.easy * 1.4) },
          { difficulty: "Medium", count: p.medium, submissions: Math.round(p.medium * 2.3) },
          { difficulty: "Hard", count: p.hard, submissions: Math.round(p.hard * 3.5) },
        ],
      },
      profile: { ranking: p.profileRanking },
    },
    userContestRanking: p.rating
      ? { rating: p.rating + 0.37, globalRanking: p.globalRanking }
      : null,
  };
}

/** `result[0]` of Codeforces user.info (the app stores this as rawData). */
export function codeforcesUser(handle, p, nowUnix) {
  return {
    lastOnlineTimeSeconds: nowUnix - 3600,
    city: "Bench City",
    rating: p.rating,
    friendOfCount: p.friendOfCount,
    titlePhoto: "https://userpic.codeforces.org/no-title.jpg",
    handle,
    avatar: "https://userpic.codeforces.org/no-avatar.jpg",
    contribution: p.contribution,
    organization: "Bench University",
    rank: cfRank(p.rating),
    maxRating: p.maxRating,
    registrationTimeSeconds: nowUnix - 86400 * 900,
    maxRank: cfRank(p.maxRating),
    country: "India",
  };
}

/** HTML containing exactly the fragments codechef.service.ts regexes parse, plus filler. */
export function codechefHtml(username, p) {
  const filler = '<div class="filler">'.padEnd(2000, "x") + "</div>";
  return `<!doctype html><html><head><title>${username} | CodeChef</title></head><body>
<div class="user-details-container"><h1>${username}</h1></div>
<div class="rating-header text-center">
  <div class="rating-number">${p.rating}</div>
  <div class="rating-star"><span>${stars(p.rating)}</span></div>
</div>
<div class="rating-ranks-alt">
  <div>Global Rank <strong>${p.globalRank}</strong></div>
  <div>Country Rank <strong>${p.countryRank}</strong></div>
</div>
${filler}
</body></html>`;
}
