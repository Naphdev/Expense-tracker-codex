import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>;
}

interface VercelResponse extends ServerResponse {
  send(body: string): void;
}

export const config = { api: { bodyParser: false } };

const forwardedRequestHeaders = ["accept", "content-type", "cookie", "origin", "referer", "user-agent", "x-csrf-token"];
const forwardedResponseHeaders = ["content-type", "content-disposition", "content-range", "accept-ranges", "retry-after", "location"];

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function proxy(request: VercelRequest, response: VercelResponse) {
  const configuredOrigin = process.env.API_ORIGIN;
  if (!configuredOrigin) {
    response.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "private, no-store" });
    response.end(JSON.stringify({ error: "API_ORIGIN is not configured" }));
    return;
  }

  let origin: URL;
  try {
    origin = new URL(configuredOrigin);
    if (origin.protocol !== "https:" && origin.hostname !== "localhost") throw new Error("HTTPS is required");
    if (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) throw new Error("API_ORIGIN must contain only an origin");
  } catch {
    response.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "private, no-store" });
    response.end(JSON.stringify({ error: "API_ORIGIN must be a valid HTTPS origin" }));
    return;
  }

  const pathValue = request.query.path;
  const pathSegments = Array.isArray(pathValue) ? pathValue : pathValue ? [pathValue] : [];
  const incomingUrl = new URL(request.url ?? "/", "https://pfa-proxy.invalid");
  const target = new URL(`/api/${pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`, origin);
  target.search = incomingUrl.search;

  const headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }

  try {
    const method = request.method ?? "GET";
    const body = method === "GET" || method === "HEAD" ? undefined : new Uint8Array(await readBody(request));
    const upstream = await fetch(target, { method, headers, body, redirect: "manual", cache: "no-store" });
    const responseHeaders: Record<string, string | string[]> = { "Cache-Control": "private, no-store" };
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders[name] = value;
    }
    const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const cookies = getSetCookie?.call(upstream.headers);
    const setCookie = cookies?.length ? cookies : upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie") as string] : [];
    if (setCookie.length) responseHeaders["Set-Cookie"] = setCookie;
    response.writeHead(upstream.status, responseHeaders);
    if (method === "HEAD" || upstream.status === 204 || upstream.status === 304) response.end();
    else if (upstream.body) {
      const bodyStream = Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream<Uint8Array>);
      bodyStream.on("error", () => response.destroy());
      bodyStream.pipe(response);
    } else response.end();
  } catch {
    response.writeHead(502, { "Content-Type": "application/json", "Cache-Control": "private, no-store" });
    response.end(JSON.stringify({ error: "The API service could not be reached" }));
  }
}
