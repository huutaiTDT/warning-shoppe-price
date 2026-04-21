/** @format */

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  token: string;
  type: "ADMIN" | "STAFF";
  mustChangePassword: boolean;
  created_at?: string;
  is_active?: boolean;
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

export const setStoredAuthSession = (user: AuthUser, token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  const userToStore = { ...user, token };
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userToStore));
};

export const clearStoredAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

export const isAdmin = (user: AuthUser | null): boolean => {
  return user?.type === "ADMIN";
};

export const isStaff = (user: AuthUser | null): boolean => {
  return user?.type === "STAFF";
};
