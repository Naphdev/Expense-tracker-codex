import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

function readCookie(name: string) {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : "";
}

api.interceptors.request.use((config) => {
  const csrf = readCookie("pfa_csrf");
  if (csrf) config.headers["X-CSRF-Token"] = csrf;
  return config;
});

export async function unwrap<T>(promise: Promise<{ data: { data: T } }>) {
  const res = await promise;
  return res.data.data;
}
