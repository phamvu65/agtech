import { NextRequest } from "next/server";

// Same-origin server proxy: session cookies never need to be read by browser JavaScript.
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!/^(auth\/(login|logout|me)|admin\/users(?:\/\d+)?)$/.test(path)) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin !== (process.env.APP_ORIGIN || request.nextUrl.origin)) {
    return Response.json({ detail: "Origin is not allowed" }, { status: 403 });
  }
  const headers = new Headers({ "Content-Type": "application/json" });
  if (origin) headers.set("Origin", origin);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);
  try {
    let body: string | undefined;
    if (request.method !== "GET") {
      body = await request.text();
      if (path === "auth/login") {
        try { body = JSON.stringify({ ...JSON.parse(body), transport: "cookie" }); }
        catch { return Response.json({ detail: "Invalid JSON" }, { status: 400 }); }
      }
    }
    const query = path === "admin/users" ? request.nextUrl.search : "";
    const upstream = await fetch(`${process.env.API_BASE_URL || "http://127.0.0.1:8000"}/${path}${query}`, {
      method: request.method, headers, body: body || undefined, cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const output = new Headers({ "Cache-Control": "no-store" });
    if (upstream.headers.get("content-type")) output.set("Content-Type", upstream.headers.get("content-type")!);
    for (const value of upstream.headers.getSetCookie()) output.append("Set-Cookie", value);
    return new Response(upstream.status === 204 ? null : await upstream.text(), { status: upstream.status, headers: output });
  } catch {
    return Response.json({ detail: "Không kết nối được máy chủ. Hãy thử lại." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH };
