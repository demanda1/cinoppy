const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:8787";

// --- Types ---

export interface Multi {
  id: number;
  title: string;
  poster_url: string | null;
  release_year: number | null;
  genres: string | string[];
  director?: string;
  lead_actors?: string | string[];
  tmdb_rating: number;
  overview?: string;
  type: string;
}

export interface Movie {
  id: number;
  title: string;
  poster_url: string | null;
  release_year: number | null;
  genres: string | string[];
  director?: string;
  lead_actors?: string | string[];
  tmdb_rating: number;
  overview?: string;
}

export interface TVShow {
  id: number;
  title: string;
  poster_url: string | null;
  release_year: number | null;
  genres: string | string[];
  director?: string;
  lead_actors?: string | string[];
  tmdb_rating: number;
  overview?: string;
}

export interface Content {
  tv: TVShow,
  movie: Movie
}

export interface Provider {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface Pitch {
  id?: string;
  movie_id: number;
  pitch_text: string;
  model_used: string;
  created_at?: string;
}

export interface Review {
  id: string;
  user_id: string;
  movie_id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
  profiles?: { display_name: string };
}

export interface WatchlistItem {
  id: string;
  movie_id: number;
  added_at: string;
  movies?: Movie;
}

export interface SimilarMovie {
  title: string;
  year: number;
  reason: string;
}

export interface ComparisonPoint {
  aspect: string;
  movie1: string;
  movie2: string;
}

export interface MovieComparison {
  points: ComparisonPoint[];
  watch_movie1_if: string;
  watch_movie2_if: string;
  verdict: string;
}

export interface TvComparison {
  points: ComparisonPoint[];
  watch_tv1_if: string;
  watch_tv2_if: string;
  verdict: string;
}

// --- Helper ---

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("cinoppy_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

export async function apiFetchStream(
  endpoint: string, 
  options: RequestInit = {}, 
  onChunk: (text: string) => void
): Promise<void> {
  const token = localStorage.getItem("cinoppy_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream", // Crucial: Tells the gateway not to buffer
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  if (!res.body) {
    throw new Error("No readable stream available");
  }

  // Set up the stream reader
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    // Decode the raw bytes into a string
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    
    // Keep the last incomplete line in the buffer in case it was cut off
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim() === "") continue;

      if (line.startsWith("data: ")) {
        const dataStr = line.replace("data: ", "").trim();
        
        // Stop if the backend signals the end
        if (dataStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.text) {
            onChunk(parsed.text);
          }
        } catch (e) {
          // If the string isn't JSON, just pass it through directly
          if (dataStr && !dataStr.startsWith("{")) {
            onChunk(dataStr);
          }
        }
      }
    }
  }
}

// --- Home page (all sections in one call) ---

export interface HomePageData {
  trending: Movie[];
  now_playing: Movie[];
  popular: Movie[];
  upcoming: Movie[];
  top_rated: Movie[];
  popular_tv: TVShow[];
  top_rated_tv: TVShow[];
}

export async function getHomePage(): Promise<HomePageData> {
  return await apiFetch("/api/home");
}

// --- Movie List APIs ---

export async function searchMulti(query: string): Promise<Multi[]> {
  const data = await apiFetch(`/api/multi/search?q=${encodeURIComponent(query)}`);
  return data.results;
}

export async function searchMovies(query: string): Promise<Movie[]> {
  const data = await apiFetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
  return data.results;
}

export async function getTrending(): Promise<Movie[]> {
  const data = await apiFetch("/api/movies/trending");
  return data.results;
}

export async function getNowPlaying(): Promise<Movie[]> {
  const data = await apiFetch("/api/movies/now-playing");
  return data.results;
}

export async function getPopularMovies(): Promise<Movie[]> {
  const data = await apiFetch("/api/movies/popular");
  return data.results;
}

export async function getTopRatedMovies(): Promise<Movie[]> {
  const data = await apiFetch("/api/movies/top-rated");
  return data.results;
}

export async function getUpcoming(): Promise<Movie[]> {
  const data = await apiFetch("/api/movies/upcoming");
  return data.results;
}

export async function getMovieDetails(movieId: number): Promise<Movie> {
  const data = await apiFetch(`/api/movies/${movieId}`);
  return data.movie;
}

// --- TV Show APIs ---

export async function searchTvs(query: string): Promise<Movie[]> {
  const data = await apiFetch(`/api/tv/search?q=${encodeURIComponent(query)}`);
  return data.results;
}

export async function getTvDetails(tvId: number): Promise<TVShow> {
  const data = await apiFetch(`/api/tv/${tvId}`);
  return data.tv;
}

export async function getPopularTV(): Promise<TVShow[]> {
  const data = await apiFetch("/api/tv/popular");
  return data.results;
}

export async function getTopRatedTV(): Promise<TVShow[]> {
  const data = await apiFetch("/api/tv/top-rated");
  return data.results;
}

// --- Provider APIs ---

export async function getMovieProviders(movieId: number): Promise<Provider[]> {
  const data = await apiFetch(`/api/movies/${movieId}/providers`);
  return data.results;
}

export async function getTVProviders(tvId: number): Promise<Provider[]> {
  const data = await apiFetch(`/api/tv/${tvId}/providers`);
  return data.results;
}

// --- AI Pitch ---

export async function getMoviePitch(movieId: number): Promise<Pitch> {
  const data = await apiFetch(`/api/movies/${movieId}/pitch`);
  return data.pitch;
}

export async function getMoviePitchStream(movieId: number, onChunk: (text: string) => void, signal?: AbortSignal): Promise<void> {
  console.log("reached getMoviePitchStream");
  await apiFetchStream(`/api/movies/${movieId}/pitch`,  { method: "GET", signal },  onChunk)
}

// --- AI Similar Movies ---

export async function getSimilarMovies(movieId: number): Promise<SimilarMovie[]> {
  const data = await apiFetch(`/api/movies/${movieId}/similar`);
  return data.similar;
}

// --- AI Pitch TV---

export async function getTvPitch(movieId: number): Promise<Pitch> {
  const data = await apiFetch(`/api/tv/${movieId}/pitch`);
  return data.pitch;
}

export async function getTvPitchStream(movieId: number, onChunk: (text: string) => void, signal?: AbortSignal): Promise<void> {
  console.log("reached getTvPitchStream");
  await apiFetchStream(`/api/tv/${movieId}/pitch`,  { method: "GET", signal },  onChunk)
}

// --- AI Similar Tvs ---

export async function getSimilarTv(movieId: number): Promise<SimilarMovie[]> {
  const data = await apiFetch(`/api/tv/${movieId}/similar`);
  return data.similar;
}

// --- AI Movie Comparison ---

export async function compareMovies(
  movieId1: number,
  movieId2: number
): Promise<{ movie1: string; movie2: string; comparison: MovieComparison }> {
  const data = await apiFetch("/api/ai/compare", {
    method: "POST",
    body: JSON.stringify({ movie_id_1: movieId1, movie_id_2: movieId2 }),
  });
  return data;
}

// --- AI Tv Comparison ---

export async function compareTvs(
  tvId1: number,
  tvId2: number
): Promise<{ tv1: string; tv2: string; comparison: TvComparison }> {
  const data = await apiFetch("/api/ai/compare/tv", {
    method: "POST",
    body: JSON.stringify({ tv_id_1: tvId1, tv_id_2: tvId2 }),
  });
  return data;
}

// --- Review APIs ---

export async function getReviews(movieId: number): Promise<Review[]> {
  const data = await apiFetch(`/api/movies/${movieId}/reviews`);
  return data.reviews;
}

export async function postReview(
  movieId: number,
  rating: number,
  reviewText?: string
): Promise<Review> {
  const data = await apiFetch(`/api/movies/${movieId}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, review_text: reviewText }),
  });
  return data.review;
}

// --- Watchlist APIs ---

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const data = await apiFetch("/api/watchlist");
  return data.watchlist;
}

export async function addToWatchlist(movieId: number): Promise<void> {
  await apiFetch(`/api/watchlist/${movieId}`, { method: "POST" });
}

export async function removeFromWatchlist(movieId: number): Promise<void> {
  await apiFetch(`/api/watchlist/${movieId}`, { method: "DELETE" });
}