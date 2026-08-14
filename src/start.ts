import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { hashIdentifier, safeErrorMessage } from "./lib/security";
import { renderErrorPage } from "./lib/error-page";

const MAX_REQUEST_BODY_BYTES = 12_000_000;

const trustedOrigins = new Set(
  (process.env.SHWAI_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return true;
  const requestOrigin = new URL(request.url).origin;
  return origin === requestOrigin || trustedOrigins.has(origin);
}

function securityHeaders(request: Request) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const scriptSources = isDevelopment ? "'self' 'unsafe-eval'" : "'self'";
  const headers = new Headers({
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src ${scriptSources}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  });
  if (new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return headers;
}

const securityMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next, handlerType }) => {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BODY_BYTES) {
      const headers = securityHeaders(request);
      headers.set("content-type", "application/json; charset=utf-8");
      return new Response(JSON.stringify({ error: "Request body is too large" }), {
        status: 413,
        headers,
      });
    }
    if ((handlerType === "serverFn" || request.method !== "GET") && !isTrustedOrigin(request)) {
      const headers = securityHeaders(request);
      headers.set("content-type", "application/json; charset=utf-8");
      return new Response(JSON.stringify({ error: "Cross-origin request blocked" }), {
        status: 403,
        headers,
      });
    }
    const requestId = request.headers.get("x-request-id")?.slice(0, 120) || crypto.randomUUID();
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const remoteAddress = request.headers.get("cf-connecting-ip") ?? forwardedFor ?? "unknown";
    const ipHash = await hashIdentifier(remoteAddress);
    const result = await next({
      context: {
        security: {
          requestId,
          origin: request.headers.get("origin"),
          ipHash,
        },
      },
    });
    const headers = new Headers(result.response.headers);
    for (const [key, value] of securityHeaders(request).entries()) headers.set(key, value);
    headers.set("X-Request-ID", requestId);
    return new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    });
  },
);

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(safeErrorMessage(error, "Unhandled request failure"));
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityMiddleware, errorMiddleware, csrfMiddleware],
}));
