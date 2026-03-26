export interface Env {
  ENVIRONMENT: string;
  DATA_WORKER: Fetcher;
  AI_WORKER: Fetcher;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response: Response;

      if (path === "/" || path === "/health") {
        response = Response.json({
          status: "ok",
          service: "cinoppy-gateway",
          timestamp: new Date().toISOString(),
        });

      } else if (
        (path.startsWith("/api/") && path.includes("/pitch")) ||
        (path.startsWith("/api/") && path.includes("/similar")) ||
        path.startsWith("/api/ai")
      ) {
        // AI features → AI worker
        response = await forwardToWorker(env.AI_WORKER, request, path, url.search);

      } else if (
        path.startsWith("/api/movies") ||
        path.startsWith("/api/watchlist") ||
        path.startsWith("/api/tv") ||
        path.startsWith("/api/providers") ||
        path === "/api/home"
      ) {
        // Data features → Data worker
        response = await forwardToWorker(env.DATA_WORKER, request, path, url.search);

      } else {
        response = Response.json({ error: "Not found", path }, { status: 404 });
      }

      return addCorsHeaders(response);

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return addCorsHeaders(
        Response.json({ error: "Gateway error", message }, { status: 500 })
      );
    }
  },
};

// Paths that should be cached (list endpoints that don't change often)
const CACHEABLE_PATHS = [
  "/api/home",
  "/api/movies/trending",
  "/api/movies/now-playing",
  "/api/movies/popular",
  "/api/movies/top-rated",
  "/api/movies/upcoming",
  "/api/tv/popular",
  "/api/tv/top-rated",
  "/api/providers/movie",
  "/api/providers/tv",
];

const CACHE_TTL = 600; // 10 minutes

async function forwardToWorker(
  worker: Fetcher,
  originalRequest: Request,
  path: string,
  search: string
): Promise<Response> {
  // Check if this path is cacheable
  const isCacheable = CACHEABLE_PATHS.includes(path) && originalRequest.method === "GET";

  if (isCacheable) {
    const cache = caches.default;
    const cacheKey = new Request(`https://cinoppy-cache${path}${search}`, { method: "GET" });

    // Try to get from cache
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Not cached — fetch from worker
    const internalUrl = `https://internal${path}${search}`;
    const response = await worker.fetch(internalUrl, {
      method: originalRequest.method,
      headers: originalRequest.headers,
    });

	// NEW: If the response is a Server-Sent Event stream, do NOT cache it.
    // Return it immediately so it pipes directly to the user in real-time.
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("text/event-stream")) {
      return response;
    }

    // Cache the response for 10 minutes
    const responseToCache = new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
      },
    });

    // Store in cache (non-blocking)
    const responseForClient = responseToCache.clone();
    cache.put(cacheKey, responseToCache);

    return responseForClient;
  }

  // Non-cacheable — forward directly
  const internalUrl = `https://internal${path}${search}`;
  return await worker.fetch(internalUrl, {
    method: originalRequest.method,
    headers: originalRequest.headers,
    body: originalRequest.method !== "GET" ? originalRequest.body : undefined,
  });
}

function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}