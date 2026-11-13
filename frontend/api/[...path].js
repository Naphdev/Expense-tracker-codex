const forwardedRequestHeaders = ["accept", "content-type", "cookie", "origin", "referer", "user-agent", "x-csrf-token"];
const forwardedResponseHeaders = ["content-type", "content-disposition", "content-range", "accept-ranges", "retry-after", "location"];

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

export default {
  async fetch(request) {
    const configuredOrigin = process.env.API_ORIGIN;
    if (!configuredOrigin) return jsonError(500, "API_ORIGIN is not configured");

    let origin;
    try {
      origin = new URL(configuredOrigin);
      if (origin.protocol !== "https:" && origin.hostname !== "localhost") throw new Error("HTTPS is required");
      if (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) {
        throw new Error("API_ORIGIN must contain only an origin");
      }
    } catch {
      return jsonError(500, "API_ORIGIN must be a valid HTTPS origin");
    }

    const incoming = new URL(request.url);
    const apiPath = incoming.pathname.replace(/^\/api(?=\/|$)/, "");
    const target = new URL(`/api${apiPath}`, origin);
    target.search = incoming.search;

    const headers = new Headers();
    for (const name of forwardedRequestHeaders) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    try {
      const method = request.method.toUpperCase();
      const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
      const upstream = await fetch(target, { method, headers, body, redirect: "manual", cache: "no-store" });
      const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
      for (const name of forwardedResponseHeaders) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
      }

      const getSetCookie = upstream.headers.getSetCookie?.bind(upstream.headers);
      for (const cookie of getSetCookie?.() ?? []) responseHeaders.append("Set-Cookie", cookie);

      const responseBody = method === "HEAD" || upstream.status === 204 || upstream.status === 304
        ? null
        : upstream.body;
      return new Response(responseBody, { status: upstream.status, headers: responseHeaders });
    } catch {
      return jsonError(502, "The API service could not be reached");
    }
  },
};
