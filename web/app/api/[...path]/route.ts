import { NextRequest } from "next/server";

// Same-origin server proxy: session cookies never need to be read by browser JavaScript.
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!/^(auth\/(login|logout|me)|admin\/users(?:\/\d+)?|price-series(?:\/\d+\/history)?|admin\/price-series(?:\/\d+\/imports)?|admin\/imports\/\d+(?:\/file)?|admin\/collector-sources(?:\/\d+(?:\/runs)?)?|admin\/collector-jobs(?:\/\d+(?:\/raw)?)?)$/.test(path)) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin !== (process.env.APP_ORIGIN || request.nextUrl.origin)) {
    return Response.json({ detail: "Origin is not allowed" }, { status: 403 });
  }
  const csvUpload = /^admin\/price-series\/\d+\/imports$/.test(path);
  const headers = new Headers({ "Content-Type": csvUpload ? "text/csv" : "application/json" });
  if (origin) headers.set("Origin", origin);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);
  try {
    let body: string | Uint8Array<ArrayBuffer> | undefined;
    if (request.method !== "GET") {
      const chunks: Uint8Array[] = []; let length = 0;
      const reader = request.body?.getReader();
      if (reader) {
        while (true) {
          const {done, value} = await reader.read(); if (done) break;
          length += value.length;
          if (length > 2_000_000) {await reader.cancel(); return Response.json({detail: "Tệp tối đa 2 MB."}, {status: 413});}
          chunks.push(value);
        }
      }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
      body = csvUpload ? bytes : new TextDecoder().decode(bytes);
      if (path === "auth/login") {
        try { body = JSON.stringify({ ...JSON.parse(body as string), transport: "cookie" }); }
        catch { return Response.json({ detail: "Invalid JSON" }, { status: 400 }); }
      }
    }
    const query = request.nextUrl.search;
    const upstream = await fetch(`${process.env.API_BASE_URL || "http://127.0.0.1:8000"}/${path}${query}`, {
      method: request.method, headers, body: body || undefined, cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const output = new Headers({ "Cache-Control": "no-store" });
    if (upstream.headers.get("content-type")) output.set("Content-Type", upstream.headers.get("content-type")!);
    if (upstream.headers.get("content-disposition")) output.set("Content-Disposition", upstream.headers.get("content-disposition")!);
    for (const value of upstream.headers.getSetCookie()) output.append("Set-Cookie", value);
    return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: output });
  } catch {
    return Response.json({ detail: "Không kết nối được máy chủ. Hãy thử lại." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH };
