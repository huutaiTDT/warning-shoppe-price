/** @format */

export type AuthUser = {
  id: string;
  username: string;
  token: string;
  email?: string;
  created_at?: string;
  is_aff?: boolean;
};

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export const getStoredAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const getStoredAuthUser = (): AuthUser | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setStoredAuthSession = (user: AuthUser) => {
  localStorage.setItem(AUTH_TOKEN_KEY, user.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearStoredAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};
