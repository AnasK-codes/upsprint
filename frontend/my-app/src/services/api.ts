
const API_BASE = "http://localhost:4000";

export interface LeaderboardEntry {
  id: number;
  rank: number;
  score?: number;
  scoreType?: "normalized" | "leetcode" | "codeforces" | "codechef";
  currentStreak?: number;
  totalActiveDays?: number;
  lastActivityDate?: string;
  user: {
    id: number;
    name: string;
    accounts?: LinkedAccount[];
  };
}

export interface LinkedAccount {
  id: number;
  platform: string;
  username: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  batch: string | null;
  branch: string | null;
  avatarUrl: string | null;
  createdAt: string;
  accounts: LinkedAccount[];
  leaderboardVisibility: "GLOBAL_AND_GROUPS" | "GROUPS_ONLY";
}

export interface AuthResponse {
  message: string;
  token?: string;
  user?: UserProfile;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  code: string;
  createdAt: string;
}

export interface GroupMember {
  id: number;
  role: "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface Activity {
  id: string;
  type: "solve" | "connection" | "badge_unlock" | "rank_up";
  title: string;
  description: string;
  date: string;
  timestamp: number;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...options.headers,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: "include", // Important for cookies
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  login: (data: any) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: any) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),

  getTopLeaderboard: (n = 10) =>
    request<LeaderboardEntry[]>(`/leaderboard/top/${n}`),

  getLeaderboard: (
    page = 1,
    limit = 50,
    filters?: { batch?: string; branch?: string; platform?: string }
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (filters?.batch && filters.batch !== "All")
      params.append("batch", filters.batch);
    if (filters?.branch && filters.branch !== "All")
      params.append("branch", filters.branch);
    if (filters?.platform && filters.platform !== "All")
      params.append("platform", filters.platform);

    return request<{ data: LeaderboardEntry[]; page: number; limit: number }>(
      `/leaderboard?${params.toString()}`
    );
  },

  getLeetCodeLeaderboard: (
    page = 1,
    limit = 50,
    filters?: { batch?: string; branch?: string }
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (filters?.batch && filters.batch !== "All")
      params.append("batch", filters.batch);
    if (filters?.branch && filters.branch !== "All")
      params.append("branch", filters.branch);

    return request<{ data: LeaderboardEntry[]; page: number; limit: number }>(
      `/leaderboard/leetcode?${params.toString()}`
    );
  },

  getDailyActivityLeaderboard: (
    page = 1,
    limit = 50,
    filters?: { batch?: string; branch?: string; platform?: string }
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (filters?.batch && filters.batch !== "All")
      params.append("batch", filters.batch);
    if (filters?.branch && filters.branch !== "All")
      params.append("branch", filters.branch);
    if (filters?.platform && filters.platform !== "All")
      params.append("platform", filters.platform);

    return request<{ data: LeaderboardEntry[]; page: number; limit: number }>(
      `/leaderboard/daily-activity?${params.toString()}`
    );
  },

  getUserRank: (userId: number) =>
    request<LeaderboardEntry>(`/leaderboard/user/${userId}`),

  getProfile: () => request<UserProfile>("/users/me"),

  updateProfile: (data: Partial<UserProfile>) =>
    request<UserProfile>("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateLeaderboardVisibility: (visibility: "GLOBAL_AND_GROUPS" | "GROUPS_ONLY") =>
    request<UserProfile>("/users/leaderboard-visibility", {
      method: "PATCH",
      body: JSON.stringify({ visibility }),
    }),

  connectAccount: (platform: string, username: string) =>
    request<LinkedAccount>("/users/accounts/connect", {
      method: "POST",
      body: JSON.stringify({ platform, username }),
    }),

  disconnectAccount: (accountId: number) =>
    request<{ message: string }>(`/users/accounts/${accountId}`, {
      method: "DELETE",
    }),

  getUserActivity: () =>
    request<Activity[]>("/users/activity"),

  getUserGroups: () => request<Group[]>("/groups/me"),

  createGroup: (name: string, description?: string) =>
    request<Group>("/groups", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),

  joinGroup: (code: string) =>
    request<Group>("/groups/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  leaveGroup: (groupId: number) =>
    request<{ message: string }>(`/groups/${groupId}/leave`, {
      method: "POST",
    }),

  getGroupMembers: (groupId: number) =>
    request<GroupMember[]>(`/groups/${groupId}/members`),

  getGroupLeaderboard: (
    groupId: number,
    page = 1,
    limit = 50,
    metric: "score" | "activity_7d" | "activity_today" | "leetcode_streak" | "total_solved" | "contest_rating" = "score"
  ) =>
    request<{ data: LeaderboardEntry[]; page: number; limit: number }>(
      `/groups/${groupId}/leaderboard?page=${page}&limit=${limit}&metric=${metric}`
    ),
};
