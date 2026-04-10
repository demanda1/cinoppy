export interface Env {
	SUPABASE_URL: string;
	SUPABASE_PUBLISHABLE_KEY: string;
	SUPABASE_SECRET_KEY: string;
	TMDB_API_READ_TOKEN: string;
	YOUTUBE_APIKEY: string;
	YOUTUBE_APIKEY_CNIPPETS: string;
	ENVIRONMENT: string;
  }

  interface TMDBMulti {
	id: number;
	title: string;
	poster_path: string | null;
	release_date: string;
	genre_ids: number[];
	vote_average: number;
	overview: string;
	media_type: string;
  }
  
  interface TMDBMovie {
	id: number;
	title: string;
	poster_path: string | null;
	release_date: string;
	genre_ids: number[];
	vote_average: number;
	overview: string;
  }
  
  interface TMDBTVShow {
	id: number;
	name: string;
	poster_path: string | null;
	first_air_date: string;
	genre_ids: number[];
	vote_average: number;
	overview: string;
  }

  interface TMDBProviders {
	provider_id: number;
	provider_name: string;
	logo_path: string | null;
  }
  
  const MOVIE_GENRE_MAP: Record<number, string> = {
	28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
	80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
	14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
	9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
	53: "Thriller", 10752: "War", 37: "Western",
  };
  
  const TV_GENRE_MAP: Record<number, string> = {
	10759: "Action & Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
	99: "Documentary", 18: "Drama", 10751: "Family", 10762: "Kids",
	9648: "Mystery", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy",
	10766: "Soap", 10767: "Talk", 10768: "War & Politics", 37: "Western",
  };
  
  const TMDB_BASE = "https://api.themoviedb.org/3";
  const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";
  const YOUTUBE_BASE = "https://www.googleapis.com";
  
  export default {
	async fetch(request: Request, env: Env): Promise<Response> {
	  const url = new URL(request.url);
	  const path = url.pathname;
	  const method = request.method;
  
	  try {
		// ============================================
		// HOME PAGE (all sections in one call)
		// ============================================
  
		if (path === "/api/home" && method === "GET") {
		  return await getHomePage(env);
		}
  
		// ============================================
		// MOVIE LIST ENDPOINTS
		// ============================================
  
		if (path === "/api/movies/search" && method === "GET") {
		  const query = url.searchParams.get("q");
		  if (!query) {
			return Response.json({ error: "Missing search query ?q=" }, { status: 400 });
		  }
		  return await fetchMovieList(`/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`, env);
		}

		if (path === "/api/multi/search" && method === "GET") {
			const query = url.searchParams.get("q");
			if (!query) {
			  return Response.json({ error: "Missing search query ?q=" }, { status: 400 });
			}
			return await fetchMultiList(`/search/multi?query=${encodeURIComponent(query)}&language=en-US&page=1`, env);
		  }
  
		if (path === "/api/movies/trending" && method === "GET") {
		  return await fetchMovieList("/trending/movie/week?language=en-US", env);
		}
  
		if (path === "/api/movies/now-playing" && method === "GET") {
		  return await fetchMovieList("/movie/now_playing?language=en-US&page=1", env);
		}
  
		if (path === "/api/movies/popular" && method === "GET") {
		  return await fetchMovieList("/movie/popular?language=en-US&page=1", env);
		}
  
		if (path === "/api/movies/top-rated" && method === "GET") {
		  return await fetchMovieList("/movie/top_rated?language=en-US&page=1", env);
		}
  
		if (path === "/api/movies/upcoming" && method === "GET") {
		  return await fetchMovieList("/movie/upcoming?language=en-US&page=1", env);
		}
  
		// ============================================
		// TV SHOW ENDPOINTS
		// ============================================

		if (path === "/api/tv/search" && method === "GET") {
			const query = url.searchParams.get("q");
			if (!query) {
			  return Response.json({ error: "Missing search query ?q=" }, { status: 400 });
			}
			return await fetchTVList(`/search/tv?query=${encodeURIComponent(query)}&language=en-US&page=1`, env);
		  }
  
		if (path === "/api/tv/popular" && method === "GET") {
		  return await fetchTVList("/tv/popular?language=en-US&page=1", env);
		}
  
		if (path === "/api/tv/top-rated" && method === "GET") {
		  return await fetchTVList("/tv/top_rated?language=en-US&page=1", env);
		}
  
		// ============================================
		// STREAMING PROVIDER ENDPOINTS
		// ============================================
  
		const movieProviderMatch = path.match(/^\/api\/movies\/(\d+)\/providers$/);
		if (movieProviderMatch && method === "GET") {
		  const movieId = parseInt(movieProviderMatch[1]);
		  const providerUrl = `/movie/${movieId}/watch/providers`
		  return await fetchProviders(providerUrl, env);
		}

		const tvProviderMatch = path.match(/^\/api\/tv\/(\d+)\/providers$/);
		if (tvProviderMatch && method === "GET") {
		  const tvId = parseInt(tvProviderMatch[1]);
		  const providerUrl = `/tv/${tvId}/watch/providers`
		  return await fetchProviders(providerUrl, env);
		}
  
		// ============================================
		// MOVIE DETAIL
		// ============================================
  
		const movieDetailMatch = path.match(/^\/api\/movies\/(\d+)$/);
		if (movieDetailMatch && method === "GET") {
		  const movieId = parseInt(movieDetailMatch[1]);
		  return await getMovieDetails(movieId, env);
		}

		// ============================================
		// TV DETAIL
		// ============================================
  
		const tvDetailMatch = path.match(/^\/api\/tv\/(\d+)$/);
		if (tvDetailMatch && method === "GET") {
		  const tvId = parseInt(tvDetailMatch[1]);
		  return await getTvDetails(tvId, env);
		}

		// ============================================
		// FILTER SEARCH
		// ============================================
		if (path === "/api/filter/search" && request.method === "POST") {
			const body = await request.json() as { language: string, type: string, genre: string, rating: string };
			const basicfilter="include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc"
			const genreFilter=body.genre.length>0?`&with_genres=${body.genre}`:''
			const languageFilter=body.language.length>0?`&with_original_language=${body.language}`:''
			const rating=body.rating.length>0? 
			(parseInt(body.rating)>=5)?`&vote_average.gte=${body.rating}`:`&vote_average.lte=${body.rating}` : '';
			const filterEndpoint = `/discover/${body.type}?${basicfilter}${genreFilter}${rating}${languageFilter}`;
			return await fetchFilteredList(filterEndpoint, env);
		  }

		// ============================================
		// YOUTUBE TRAILER
		// ============================================

		if (path === "/api/trailer/search" && method === "GET") {
			const query = url.searchParams.get("q");
			if (!query) {
			  return Response.json({ error: "Missing search query ?q=" }, { status: 400 });
			}
			return await fetchTrailerDetails(`/youtube/v3/search?`, query, env);
		  }

		  // ============================================
		// YOUTUBE SHORTS
		// ============================================

		if (path === "/api/shorts/search" && method === "GET") {
			const query = url.searchParams.get("q");
			if (!query) {
			  return Response.json({ error: "Missing search query ?q=" }, { status: 400 });
			}
			return await fetchShortsDetails(`/youtube/v3/search?`, query, env);
		  }
  
  
		// ============================================
		// REVIEWS
		// ============================================
  
		const reviewsMatch = path.match(/^\/api\/movies\/(\d+)\/reviews$/);
		if (reviewsMatch && method === "GET") {
		  const movieId = parseInt(reviewsMatch[1]);
		  return await getReviews(movieId, env);
		}
  
		if (reviewsMatch && method === "POST") {
		  const movieId = parseInt(reviewsMatch[1]);
		  const authHeader = request.headers.get("Authorization");
		  if (!authHeader) {
			return Response.json({ error: "Login required" }, { status: 401 });
		  }
		  const body = await request.json() as { rating: number; review_text?: string };
		  return await postReview(movieId, body, authHeader, env);
		}
  
		// ============================================
		// WATCHLIST
		// ============================================
  
		if (path === "/api/watchlist" && method === "GET") {
		  const authHeader = request.headers.get("Authorization");
		  if (!authHeader) {
			return Response.json({ error: "Login required" }, { status: 401 });
		  }
		  return await getWatchlist(authHeader, env);
		}
  
		const watchlistMatch = path.match(/^\/api\/watchlist\/(\d+)$/);
		if (watchlistMatch && method === "POST") {
		  const movieId = parseInt(watchlistMatch[1]);
		  const authHeader = request.headers.get("Authorization");
		  if (!authHeader) {
			return Response.json({ error: "Login required" }, { status: 401 });
		  }
		  return await addToWatchlist(movieId, authHeader, env);
		}
  
		if (watchlistMatch && method === "DELETE") {
		  const movieId = parseInt(watchlistMatch[1]);
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
  // YOUTUBE HELPERS
  // ============================================
  
  async function youtubeFetch(endpoint: string, title:string, env: Env): Promise<any> {
	const params = new URLSearchParams({
		part: "snippet",
		q:title+" official trailer",
		type:"video",
		videoEmbeddable: "true",
		maxResults:"1",
		key:env.YOUTUBE_APIKEY
  });
	const res = await fetch(`${YOUTUBE_BASE}${endpoint}${params.toString()}`, {
	  headers: {
		"Accept": "application/json",
		"Content-Type": "application/json",
	  },
	});
	if (!res.ok) {
	  throw new Error(`YOUTUBE API error: ${res.status} ${res.statusText}`);
	}
	return res.json();
  }

  async function youtubeShortsFetch(endpoint: string, title:string, env: Env): Promise<any> {
	const params = new URLSearchParams({
		part: "snippet",
		q:title+" movie or series shorts",
		type:"video",
		videoEmbeddable: "true",
		maxResults:"50",
		key:env.YOUTUBE_APIKEY_CNIPPETS,
		videoDuration: "short"
  });
	const res = await fetch(`${YOUTUBE_BASE}${endpoint}${params.toString()}`, {
	  headers: {
		"Accept": "application/json",
		"Content-Type": "application/json",
	  },
	});
	if (!res.ok) {
	  throw new Error(`YOUTUBE API error: ${res.status} ${res.statusText}`);
	}
	return res.json();
  }
  
  
  // ============================================
  // TMDB HELPERS
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

  function formatTrailer(data: any): any[] {
	if (data.items.length==0){
		return [];
	} else {
		return data.items.map((t:any)=>{
			const videoId = t.id.videoId;
			const title = t.snippet.title;
			const thumbnail = t.snippet.thumbnails.high.url;
			const date = t.snippet.publishedAt ? t.snippet.publishedAt.substring(0, 10) : null

			return {id: videoId,
				title: title,
				poster_url: thumbnail,
				release_year: date}

		})
	}
  }

  function formatMulti(data: any): any[] {
	return data.results.slice(0, 20).filter((m: any)=> m.media_type === "movie" || m.media_type === "tv")
	.map((m: any) => {
		// 2. Handle the Title difference (Movie = title, TV = name)
      const title = m.title || m.name || "Unknown Title";

      // 3. Handle the Date difference (Movie = release_date, TV = first_air_date)
      const dateStr = m.release_date || m.first_air_date;
      const release_year = (dateStr && dateStr.length >= 4) 
        ? parseInt(dateStr.substring(0, 4)) 
        : null;

	  return {id: m.id,
	  title: m.title,
	  poster_url: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
	  release_year: release_year,
	  genres: (m.genre_ids || []).map((id: number) => MOVIE_GENRE_MAP[id] || "Unknown"),
	  tmdb_rating: m.vote_average,
	  type: m.media_type }
	});
  }
  
  function formatMovies(data: any): any[] {
	return data.results.slice(0, 20).map((m: TMDBMovie) => ({
	  id: m.id,
	  title: m.title,
	  poster_url: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
	  release_year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
	  genres: m.genre_ids.map((id: number) => MOVIE_GENRE_MAP[id] || "Unknown"),
	  tmdb_rating: m.vote_average,
	}));
  }
  
  function formatTV(data: any): any[] {
	return data.results.slice(0, 20).map((s: TMDBTVShow) => ({
	  id: s.id,
	  title: s.name,
	  poster_url: s.poster_path ? `${TMDB_IMG_BASE}${s.poster_path}` : null,
	  release_year: s.first_air_date ? parseInt(s.first_air_date.substring(0, 4)) : null,
	  genres: s.genre_ids.map((id: number) => TV_GENRE_MAP[id] || "Unknown"),
	  tmdb_rating: s.vote_average,
	}));
  }

  function formatFilterData(data: any): any[] {
	return data.results.map((s: any) => ({
	  id: s.id,
	}));
  }

  function formatProviders(data: any): any[] {
	// 1. Get the India (IN) results object
	const indiaResults = data?.results?.IN;

	if (!indiaResults) return [];
	// 2. Define the categories you want to check
	const categories = ['rent', 'buy', 'flatrate', 'free'];

	// 3. Extract and Merge all provider arrays into one
	const allProviders = categories
	.flatMap(type => indiaResults[type] || []); // Combines arrays and handles missing keys

	// 4. Use a Map to keep only unique providers by ID
	const uniqueProviders = Array.from(
		new Map(allProviders.map(p => [p.provider_id, p])).values()
  	);

	return uniqueProviders.map((p: TMDBProviders) => ({
	  id: p.provider_id,
	  name: p.provider_name,
	  logo_path: p.logo_path ? `${TMDB_IMG_BASE}${p.logo_path}` : null,
	}));
  }

  async function fetchTrailerDetails(youtubeEndpoint: string, title: string, env: Env): Promise<Response> {
	const data = await youtubeFetch(youtubeEndpoint, title, env);
	return Response.json({ results: formatTrailer(data) });
  }

  async function fetchShortsDetails(youtubeEndpoint: string, title: string, env: Env): Promise<Response> {
	const data = await youtubeShortsFetch(youtubeEndpoint, title, env);
	return Response.json({ results: formatTrailer(data) });
  }

  async function fetchMultiList(tmdbEndpoint: string, env: Env): Promise<Response> {
	const data = await tmdbFetch(tmdbEndpoint, env);
	return Response.json({ results: formatMulti(data) });
  }
  
  async function fetchMovieList(tmdbEndpoint: string, env: Env): Promise<Response> {
	const data = await tmdbFetch(tmdbEndpoint, env);
	return Response.json({ results: formatMovies(data) });
  }
  
  async function fetchTVList(tmdbEndpoint: string, env: Env): Promise<Response> {
	const data = await tmdbFetch(tmdbEndpoint, env);
	return Response.json({ results: formatTV(data) });
  }
  
  async function fetchProviders(tmdbEndpoint: string, env: Env): Promise<Response> {
	const data = await tmdbFetch(tmdbEndpoint, env);
	return Response.json({ results: formatProviders(data)});
  }

  async function fetchFilteredList(tmdbEndpoint: string, env: Env): Promise<Response> {
	const data = await tmdbFetch(tmdbEndpoint, env);
	return Response.json({ results: formatFilterData(data)});
  }
  
  
  // ============================================
  // HOME PAGE (all sections in parallel)
  // ============================================
  
  async function getHomePage(env: Env): Promise<Response> {
	const [trending, nowPlaying, popular, upcoming, topRated, popularTV, topRatedTV] =
	  await Promise.all([
		tmdbFetch("/trending/movie/week?language=en-US", env),
		tmdbFetch("/movie/now_playing?language=en-US&page=1", env),
		tmdbFetch("/movie/popular?language=en-US&page=1", env),
		tmdbFetch("/movie/upcoming?language=en-US&page=1", env),
		tmdbFetch("/movie/top_rated?language=en-US&page=1", env),
		tmdbFetch("/tv/popular?language=en-US&page=1", env),
		tmdbFetch("/tv/top_rated?language=en-US&page=1", env),
	  ]);
  
	return Response.json({
	  trending: formatMovies(trending),
	  now_playing: formatMovies(nowPlaying),
	  popular: formatMovies(popular),
	  upcoming: formatMovies(upcoming),
	  top_rated: formatMovies(topRated),
	  popular_tv: formatTV(popularTV),
	  top_rated_tv: formatTV(topRatedTV),
	});
  }
  
  
  // ============================================
  // MOVIE DETAIL
  // ============================================
  
  async function getMovieDetails(movieId: number, env: Env): Promise<Response> {
	const cached = await supabaseQuery(env, `/rest/v1/movies?id=eq.${movieId}&select=*`, "GET");
  
	if (cached.length > 0) {
	  return Response.json({ movie: cached[0], source: "cache" });
	}
  
	const data = await tmdbFetch(`/movie/${movieId}?language=en-US&append_to_response=credits`, env);
  
	const director = data.credits.crew
	  .filter((c: any) => c.job === "Director")
	  .map((c: any) => c.name)
	  .join(", ") || "Unknown";
  
	const leadActors = data.credits.cast.slice(0, 3).map((c: any) => c.name);
	const genres = data.genres.map((g: any) => g.name);
  
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
  
	await supabaseQuery(env, "/rest/v1/movies", "POST", movie);
	return Response.json({ movie, source: "tmdb" });
  }

  // ============================================
  // TV DETAIL
  // ============================================
  
  async function getTvDetails(tvId: number, env: Env): Promise<Response> {
	const cached = await supabaseQuery(env, `/rest/v1/tv?id=eq.${tvId}&select=*`, "GET");
  
	if (cached.length > 0) {
	  return Response.json({ tv: cached[0], source: "cache" });
	}
  
	const data = await tmdbFetch(`/tv/${tvId}?language=en-US&append_to_response=credits`, env);
  
	const director = data.created_by.length>0?data.created_by[0].name : "Unknown";

	const leadActors = data.credits.length>0? data.credits.cast.filter((c: any) => c.known_for_department === "Acting").map((c: any) => c.name): ["unknown"];
	const genres = data.genres.length>0?data.genres.map((g: any) => g.name): ["Unknown"];
  
	const tv = {
	  id: data.id,
	  title: data.name,
	  poster_url: data.poster_path ? `${TMDB_IMG_BASE}${data.poster_path}` : null,
	  release_year: data.first_air_date ? parseInt(data.first_air_date.substring(0, 4))  : null,
	  genres: JSON.stringify(genres),
	  director,
	  lead_actors: JSON.stringify(leadActors),
	  tmdb_rating: data.vote_average,
	  overview: data.overview,
	  cached_at: new Date().toISOString(),
	};
  
	await supabaseQuery(env, "/rest/v1/tv", "POST", tv);
	return Response.json({ tv, source: "tmdb" });
  }
  
  
  // ============================================
  // REVIEWS
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
	if (!body.rating || body.rating < 0.5 || body.rating > 5.0) {
	  return Response.json({ error: "Rating must be between 0.5 and 5.0" }, { status: 400 });
	}
	if (body.rating % 0.5 !== 0) {
	  return Response.json({ error: "Rating must be in 0.5 increments" }, { status: 400 });
	}
  
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
  // WATCHLIST
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
  
  async function addToWatchlist(movieId: number, authHeader: string, env: Env): Promise<Response> {
	const user = await supabaseAuth(authHeader, env);
	if (!user) {
	  return Response.json({ error: "Invalid auth token" }, { status: 401 });
	}
  
	const entry = { user_id: user.id, movie_id: movieId };
	const result = await supabaseQuery(env, "/rest/v1/watchlist", "POST", entry, authHeader);
	return Response.json({ watchlist: result }, { status: 201 });
  }
  
  async function removeFromWatchlist(movieId: number, authHeader: string, env: Env): Promise<Response> {
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
	const isUserRequest = !!authHeader;
	const apiKey = isUserRequest ? env.SUPABASE_PUBLISHABLE_KEY : env.SUPABASE_SECRET_KEY;
  
	const headers: Record<string, string> = {
	  "apikey": apiKey,
	  "Content-Type": "application/json",
	  "Prefer": method === "POST" ? "return=representation" : "",
	};
  
	if (isUserRequest) {
	  headers["Authorization"] = authHeader;
	} else {
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
	  return await res.json() as { id: string };
	} catch {
	  return null;
	}
  }