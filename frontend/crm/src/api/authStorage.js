const TOKEN_KEY = "leadflow_token";
const USER_KEY = "leadflow_user";
const AUTH_CHANGE_EVENT = "leadflow:auth-change";

const notifyAuthChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const subscribeAuthChanges = (callback) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const saveAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChange();
};

export const saveAuthUser = (user) => {
  if (user && typeof user === "object") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifyAuthChange();
  }
};

export const getAuthUser = () => {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
};
