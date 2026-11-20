export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const raw = body instanceof Blob;
  const response = await fetch(`/api/${path}`, { method,
    headers: { "Content-Type": raw ? "text/csv" : "application/json" },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body), cache: "no-store" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(response.status === 401 ? "Phiên không hợp lệ hoặc tên đăng nhập/mật khẩu chưa đúng." :
      typeof error.detail === "string" ? error.detail : "Dữ liệu chưa hợp lệ. Hãy kiểm tra lại.");
  }
  return response.status === 204 ? undefined as T : response.json();
}
