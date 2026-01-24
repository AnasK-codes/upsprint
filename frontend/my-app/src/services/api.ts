import { getAuthToken } from "@/utils/auth";
const API_BASE = "http://localhost:4000";

export interface LeaderboardEntry {
  id: number;
  rank: number;
  score?: number;
  currentStreak?: number;
  totalActiveDays?: number;
  lastActivityDate?: string;
  user: {
    id: number;
    name: string;
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

  getGroupLeaderboard: (
    groupId: number,
    page = 1,
    limit = 50
  ) =>
    request<{ data: LeaderboardEntry[]; page: number; limit: number }>(
      `/groups/${groupId}/leaderboard?page=${page}&limit=${limit}`
    ),
};
