import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as any)?.error ?? fallback;
  }
  return fallback;
}
