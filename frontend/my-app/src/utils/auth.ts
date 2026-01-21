export const setAuthToken = (token: string) => {
  document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Strict; Secure`;
};

export const getAuthToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  return match ? match[2] : null;
};

export const removeAuthToken = () => {
  document.cookie = "token=; path=/; max-age=0; SameSite=Strict; Secure";
};
