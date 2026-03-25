// ============================================
// CINOPPY — API Gateway Worker
// ============================================
// Single entry point for all API calls.
// Uses Service Bindings to call other workers
// directly (no HTTP, no routing issues).

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
		  (path.startsWith("/api/movies") && path.includes("/pitch")) ||
		  (path.startsWith("/api/movies") && path.includes("/similar")) ||
		  path.startsWith("/api/ai")
		) {
		  // AI features → AI worker
		  response = await forwardToWorker(env.AI_WORKER, request, path, url.search);
  
		} else if (
		  path.startsWith("/api/movies") ||
		  path.startsWith("/api/watchlist") ||
		  path.startsWith("/api/tv") ||
		  path.startsWith("/api/providers")
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
  
  async function forwardToWorker(
	worker: Fetcher,
	originalRequest: Request,
	path: string,
	search: string
  ): Promise<Response> {
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