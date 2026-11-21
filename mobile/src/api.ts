import { Platform } from "react-native";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (__DEV__
    ? Platform.OS === "android"
      ? "http://10.0.2.2:8000"
      : "http://127.0.0.1:8000"
    : "")
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  token?: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (!API_BASE || (!__DEV__ && !API_BASE.startsWith("https://"))) {
    throw new Error("Cần cấu hình địa chỉ API HTTPS cho bản phát hành.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      credentials: "omit",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(
        typeof data?.detail === "string"
          ? data.detail
          : `Yêu cầu thất bại (${response.status}).`,
        response.status,
      );
    }
    return response.status === 204 ? (undefined as T) : await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(
      error instanceof Error && error.message.startsWith("Cần cấu hình")
        ? error.message
        : "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.",
    );
  } finally {
    clearTimeout(timer);
  }
}
