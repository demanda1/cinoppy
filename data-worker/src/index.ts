// ============================================
// CINOPPY — Data Worker
// ============================================
// Handles all movie data operations:
//   - Search movies (TMDB API)
//   - Get movie details (TMDB → cache in Supabase)
//   - Get/post reviews (Supabase)
//   - Get/add/remove watchlist (Supabase)
//   - Get trending movies (TMDB API)

export interface Env {
	SUPABASE_URL: string;
	SUPABASE_PUBLISHABLE_KEY: string;  // For user-authenticated requests (RLS enforced)
	SUPABASE_SECRET_KEY: string;        // For server-side operations (bypasses RLS)
	TMDB_API_READ_TOKEN: string;
	ENVIRONMENT: string;
  }
  
  // --- Type definitions ---
  interface TMDBMovie {
	id: number;
	title: string;
	poster_path: string | null;
	release_date: string;
	genre_ids: number[];
	vote_average: number;
	overview: string;
  }
  
  interface TMDBCredits {
	cast: { name: string; order: number }[];
	crew: { name: string; job: string }[];
  }
  
  // TMDB genre ID → name mapping (avoids an extra API call)
  const GENRE_MAP: Record<number, string> = {
	28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
	80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
	14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
	9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
	53: "Thriller", 10752: "War", 37: "Western",
  };
  
  const TMDB_BASE = "https://api.themoviedb.org/3";
  const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";
  
  export default {
	async fetch(request: Request, env: Env): Promise<Response> {
	  const url = new URL(request.url);
	  const path = url.pathname;
	  const method = request.method;
  
	  try {
		// --- Movie search ---
		if (path === "/api/movies/search" && method === "GET") {
		  const query = url.searchParams.get("q");
		  if (!query) {
			return Response.json({ error: "Missing search query ?q=" }, { status: 400 });
		  }
		  return await searchMovies(query, env);
		}
  
		// --- Trending movies ---
		if (path === "/api/movies/trending" && method === "GET") {
		  return await getTrending(env);
		}
  
		// --- Movie details ---
		const movieDetailMatch = path.match(/^\/api\/movies\/(\d+)$/);
		if (movieDetailMatch && method === "GET") {
		  const movieId = parseInt(movieDetailMatch[1]);
		  return await getMovieDetails(movieId, env);
		}
  
		// --- Reviews: read ---
		const reviewsReadMatch = path.match(/^\/api\/movies\/(\d+)\/reviews$/);
		if (reviewsReadMatch && method === "GET") {
		  const movieId = parseInt(reviewsReadMatch[1]);
		  return await getReviews(movieId, env);
		}
  
		// --- Reviews: write (needs auth token) ---
		if (reviewsReadMatch && method === "POST") {
		  const movieId = parseInt(reviewsReadMatch[1]);
		  const authHeader = request.headers.get("Authorization");
		  if (!authHeader) {
			return Response.json({ error: "Login required" }, { status: 401 });
		  }
		  const body = await request.json() as { rating: number; review_text?: string };
		  return await postReview(movieId, body, authHeader, env);
		}
  
		// --- Watchlist: read ---
		if (path === "/api/watchlist" && method === "GET") {
		  const authHeader = request.headers.get("Authorization");
		  if (!authHeader) {
			return Response.json({ error: "Login required" }, { status: 401 });
		  }
		  return await getWatchlist(authHeader, env);
		}
  
		// --- Watchlist: add ---
		const watchlistAddMatch = path.match(/^\/api\/watchlist\/(\d+)$/);
		if (watchlistAddMatch && method === "POST") {
		  const movieId = parseInt(watchlistAddMatch[1]);
		  const authHeader = request.headers.get("Authorization");
		  if (!authHeader) {
			return Response.json({ error: "Login required" }, { status: 401 });
		  }
		  return await addToWatchlist(movieId, authHeader, env);
		}
  
		// --- Watchlist: remove ---
		if (watchlistAddMatch && method === "DELETE") {
		  const movieId = parseInt(watchlistAddMatch[1]);
		  const authHeader = request.headers.get("Authorization");
		  if (!authHeader) {
			return Response.json({ error: "Login required" }, { status: 401 });
		  }
		  return await removeFromWatchlist(movieId, authHeader, env);
		}
  
		return Response.json({ error: "Not found" }, { status: 404 });
  
	  } catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return Response.json({ error: "Data worker error", message }, { status: 500 });
	  }
	},
  };
  
  
  // ============================================
  // TMDB FUNCTIONS
  // ============================================
  
  async function tmdbFetch(endpoint: string, env: Env): Promise<any> {
	const res = await fetch(`${TMDB_BASE}${endpoint}`, {
	  headers: {
		"Authorization": `Bearer ${env.TMDB_API_READ_TOKEN}`,
		"Content-Type": "application/json",
	  },
	});
	if (!res.ok) {
	  throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
	}
	return res.json();
  }
  
  async function searchMovies(query: string, env: Env): Promise<Response> {
	const data = await tmdbFetch(
	  `/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`,
	  env
	);
  
	// Transform TMDB results into our clean format
	const movies = data.results.slice(0, 10).map((m: TMDBMovie) => ({
	  id: m.id,
	  title: m.title,
	  poster_url: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
	  release_year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
	  genres: m.genre_ids.map((id: number) => GENRE_MAP[id] || "Unknown"),
	  tmdb_rating: m.vote_average,
	}));
  
	return Response.json({ results: movies });
  }
  
  async function getTrending(env: Env): Promise<Response> {
	const data = await tmdbFetch("/trending/movie/week?language=en-US", env);
  
	const movies = data.results.slice(0, 10).map((m: TMDBMovie) => ({
	  id: m.id,
	  title: m.title,
	  poster_url: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
	  release_year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
	  genres: m.genre_ids.map((id: number) => GENRE_MAP[id] || "Unknown"),
	  tmdb_rating: m.vote_average,
	}));
  
	return Response.json({ results: movies });
  }
  
  async function getMovieDetails(movieId: number, env: Env): Promise<Response> {
	// Step 1: Check Supabase cache first
	const cached = await supabaseQuery(
	  env,
	  `/rest/v1/movies?id=eq.${movieId}&select=*`,
	  "GET"
	);
  
	if (cached.length > 0) {
	  return Response.json({ movie: cached[0], source: "cache" });
	}
  
	// Step 2: Not cached — fetch from TMDB (movie details + credits in one call)
	const data = await tmdbFetch(
	  `/movie/${movieId}?language=en-US&append_to_response=credits`,
	  env
	);
  
	// Extract director from crew
	const director = data.credits.crew
	  .filter((c: any) => c.job === "Director")
	  .map((c: any) => c.name)
	  .join(", ") || "Unknown";
  
	// Extract top 3 lead actors from cast (already sorted by billing order)
	const leadActors = data.credits.cast
	  .slice(0, 3)
	  .map((c: any) => c.name);
  
	// Extract genre names
	const genres = data.genres.map((g: any) => g.name);
  
	// Build our movie object
	const movie = {
	  id: data.id,
	  title: data.title,
	  poster_url: data.poster_path ? `${TMDB_IMG_BASE}${data.poster_path}` : null,
	  release_year: data.release_date ? parseInt(data.release_date.substring(0, 4)) : null,
	  genres: JSON.stringify(genres),
	  director,
	  lead_actors: JSON.stringify(leadActors),
	  tmdb_rating: data.vote_average,
	  overview: data.overview,
	  cached_at: new Date().toISOString(),
	};
  
	// Step 3: Cache in Supabase for next time
	await supabaseQuery(env, "/rest/v1/movies", "POST", movie);
  
	return Response.json({ movie, source: "tmdb" });
  }
  
  
  // ============================================
  // REVIEW FUNCTIONS
  // ============================================
  
  async function getReviews(movieId: number, env: Env): Promise<Response> {
	const reviews = await supabaseQuery(
	  env,
	  `/rest/v1/reviews?movie_id=eq.${movieId}&select=*,profiles(display_name)&order=created_at.desc`,
	  "GET"
	);
	return Response.json({ reviews });
  }
  
  async function postReview(
	movieId: number,
	body: { rating: number; review_text?: string },
	authHeader: string,
	env: Env
  ): Promise<Response> {
	// Validate rating
	if (!body.rating || body.rating < 0.5 || body.rating > 5.0) {
	  return Response.json({ error: "Rating must be between 0.5 and 5.0" }, { status: 400 });
	}
	if (body.rating % 0.5 !== 0) {
	  return Response.json({ error: "Rating must be in 0.5 increments" }, { status: 400 });
	}
  
	// Get user ID from auth token
	const user = await supabaseAuth(authHeader, env);
	if (!user) {
	  return Response.json({ error: "Invalid auth token" }, { status: 401 });
	}
  
	const review = {
	  user_id: user.id,
	  movie_id: movieId,
	  rating: body.rating,
	  review_text: body.review_text || null,
	};
  
	const result = await supabaseQuery(env, "/rest/v1/reviews", "POST", review, authHeader);
	return Response.json({ review: result }, { status: 201 });
  }
  
  
  // ============================================
  // WATCHLIST FUNCTIONS
  // ============================================
  
  async function getWatchlist(authHeader: string, env: Env): Promise<Response> {
	const user = await supabaseAuth(authHeader, env);
	if (!user) {
	  return Response.json({ error: "Invalid auth token" }, { status: 401 });
	}
  
	const watchlist = await supabaseQuery(
	  env,
	  `/rest/v1/watchlist?user_id=eq.${user.id}&select=*,movies(id,title,poster_url,release_year,tmdb_rating)&order=added_at.desc`,
	  "GET",
	  null,
	  authHeader
	);
	return Response.json({ watchlist });
  }
  
  async function addToWatchlist(
	movieId: number, authHeader: string, env: Env
  ): Promise<Response> {
	const user = await supabaseAuth(authHeader, env);
	if (!user) {
	  return Response.json({ error: "Invalid auth token" }, { status: 401 });
	}
  
	const entry = { user_id: user.id, movie_id: movieId };
	const result = await supabaseQuery(env, "/rest/v1/watchlist", "POST", entry, authHeader);
	return Response.json({ watchlist: result }, { status: 201 });
  }
  
  async function removeFromWatchlist(
	movieId: number, authHeader: string, env: Env
  ): Promise<Response> {
	const user = await supabaseAuth(authHeader, env);
	if (!user) {
	  return Response.json({ error: "Invalid auth token" }, { status: 401 });
	}
  
	await supabaseQuery(
	  env,
	  `/rest/v1/watchlist?user_id=eq.${user.id}&movie_id=eq.${movieId}`,
	  "DELETE",
	  null,
	  authHeader
	);
	return Response.json({ message: "Removed from watchlist" });
  }
  
  
  // ============================================
  // SUPABASE HELPERS
  // ============================================
  
  async function supabaseQuery(
	env: Env,
	endpoint: string,
	method: string,
	body?: any,
	authHeader?: string
  ): Promise<any> {
	// Choose the right key based on context:
	// - User requests (reviews, watchlist) → publishable key + user's JWT
	// - Server operations (caching movies) → secret key (bypasses RLS)
	const isUserRequest = !!authHeader;
	const apiKey = isUserRequest ? env.SUPABASE_PUBLISHABLE_KEY : env.SUPABASE_SECRET_KEY;
  
	const headers: Record<string, string> = {
	  "apikey": apiKey,
	  "Content-Type": "application/json",
	  "Prefer": method === "POST" ? "return=representation" : "",
	};
  
	if (isUserRequest) {
	  // Forward user's JWT — RLS verifies their identity
	  headers["Authorization"] = authHeader;
	} else {
	  // Server-level access — bypasses RLS for caching
	  headers["Authorization"] = `Bearer ${env.SUPABASE_SECRET_KEY}`;
	}
  
	const res = await fetch(`${env.SUPABASE_URL}${endpoint}`, {
	  method,
	  headers,
	  body: body ? JSON.stringify(body) : undefined,
	});
  
	if (!res.ok) {
	  const errorBody = await res.text();
	  throw new Error(`Supabase error (${res.status}): ${errorBody}`);
	}
  
	// DELETE returns no body
	if (method === "DELETE") return null;
  
	return res.json();
  }
  
  async function supabaseAuth(
	authHeader: string, env: Env
  ): Promise<{ id: string } | null> {
	try {
	  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
		headers: {
		  "apikey": env.SUPABASE_PUBLISHABLE_KEY,
		  "Authorization": authHeader,
		},
	  });
	  if (!res.ok) return null;
	  const user = await res.json() as { id: string };
	  return user;
	} catch {
	  return null;
	}
  }