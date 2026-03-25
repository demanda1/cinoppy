const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:8787";

// --- Types ---

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
  first_air_year: number | null;
  genres: string | string[];
  tmdb_rating: number;
}

export interface Provider {
  id: number;
  name: string;
  logo_url: string | null;
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

// --- Movie List APIs ---

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

export async function getPopularTV(): Promise<TVShow[]> {
  const data = await apiFetch("/api/tv/popular");
  return data.results;
}

export async function getTopRatedTV(): Promise<TVShow[]> {
  const data = await apiFetch("/api/tv/top-rated");
  return data.results;
}

// --- Provider APIs ---

export async function getMovieProviders(): Promise<Provider[]> {
  const data = await apiFetch("/api/providers/movie");
  return data.results;
}

export async function getTVProviders(): Promise<Provider[]> {
  const data = await apiFetch("/api/providers/tv");
  return data.results;
}

// --- AI Pitch ---

export async function getMoviePitch(movieId: number): Promise<Pitch> {
  const data = await apiFetch(`/api/movies/${movieId}/pitch`);
  return data.pitch;
}

// --- AI Similar Movies ---

export async function getSimilarMovies(movieId: number): Promise<SimilarMovie[]> {
  const data = await apiFetch(`/api/movies/${movieId}/similar`);
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