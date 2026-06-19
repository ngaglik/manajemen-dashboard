import { Config } from "@/constant/config";
import { getAuthData, saveAuthData, logout } from "./authService";

// Wrapper fetch yang support refresh token saat 401
export const apiFetch = async (url: string, options: any = {}) => {
  let auth = getAuthData();
  let token = auth?.token;

  if (!options.headers) options.headers = {};

  options.headers["Authorization"] = `Bearer ${token}`;
  if (auth?.session) options.headers["uSession"] = auth.session;
  if (Config.AppId) options.headers["AppId"] = Config.AppId;

  let response = await fetch(url, options);

  if (response.status === 401 || response.status === 403) {
    console.warn("Access token expired, refreshing...");

    const refreshed = await refreshToken();
    if (!refreshed) {
      console.warn("Refresh token failed. Redirect login.");
      return logout();
    }

    // Retry request dengan token baru
    auth = getAuthData();
    options.headers["Authorization"] = `Bearer ${auth.token}`;
    if (Config.AppId) options.headers["AppId"] = Config.AppId;

    response = await fetch(url, options);
  }

  return response;
};

export const refreshToken = async () => {
  const auth = getAuthData();

  if (!auth?.refreshToken) return false;

  try {
    const res = await fetch(Config.UrlBackend + "/api/auth/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: auth.refreshToken,
        appId: Config.AppId,
      }),
    });

    if (!res.ok) return false;

    const data = await res.json();

    saveAuthData({
      token: data.accessToken,
      refreshToken: data.refreshToken,
      session: auth.session,
    });

    console.log("Token refreshed!");
    return true;
  } catch (error) {
    console.error("Refresh error:", error);
    return false;
  }
};
