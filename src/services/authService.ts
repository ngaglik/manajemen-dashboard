import { Config } from "@/constant/config";

export const getAuthData = () => {
  const token = localStorage.getItem(Config.TokenName);
  try {
    return JSON.parse(token ?? "null");
  } catch (error) {
    logout();
    return null;
  }
};

export const saveAuthData = (data: any) => {
  localStorage.setItem(Config.TokenName, JSON.stringify(data));
  localStorage.setItem(Config.SessionName, JSON.stringify(data.session));
};

export const logout = () => {
  localStorage.removeItem(Config.TokenName);
  localStorage.removeItem(Config.SessionName);
  window.$message?.info("Anda berhasil logout.");
  window.location.href = import.meta.env.BASE_URL;
};
