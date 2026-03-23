// ============================================
// CINOPPY — API Client
// ============================================
// All communication with the gateway worker
// goes through this file. The frontend never
// calls TMDB, Gemini, or Supabase directly.

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://gateway-worker.demandappscorp.workers.dev";

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

// --- Helper ---

async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
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

// --- Movie APIs ---

export async function searchMovies(query: string): Promise<Movie[]> {
  const data = await apiFetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
  return data.results;
}

export async function getTrending(): Promise<Movie[]> {
  const data = await apiFetch("/api/movies/trending");
  return data.results;
}

export async function getMovieDetails(movieId: number): Promise<Movie> {
  const data = await apiFetch(`/api/movies/${movieId}`);
  return data.movie;
}

// --- Pitch API ---

export async function getMoviePitch(movieId: number): Promise<Pitch> {
  const data = await apiFetch(`/api/movies/${movieId}/pitch`);
  return data.pitch;
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