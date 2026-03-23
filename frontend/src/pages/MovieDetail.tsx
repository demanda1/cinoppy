import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMovieDetails, getMoviePitch, getReviews } from "@/lib/api";
import type { Movie, Pitch, Review } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import StarRating from "@/components/StarRating";
import ReviewForm from "@/components/ReviewForm";

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const movieId = parseInt(id || "0");

  const [movie, setMovie] = useState<Movie | null>(null);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [pitchLoading, setPitchLoading] = useState(true);
  const [movieError, setMovieError] = useState<string | null>(null);
  const [pitchError, setPitchError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  // Parse JSON strings from movie data
  function parseJsonField(field: string | string[] | undefined): string[] {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try { return JSON.parse(field); } catch { return []; }
  }

  // Fetch movie details FIRST, then fetch pitch AFTER movie is cached
  useEffect(() => {
    if (!movieId) return;

    async function fetchAll() {
      // Step 1: Load movie details (this caches the movie in Supabase)
      try {
        setMovieLoading(true);
        const data = await getMovieDetails(movieId);
        setMovie(data);
      } catch (err) {
        setMovieError(err instanceof Error ? err.message : "Failed to load movie");
        setMovieLoading(false);
        setPitchLoading(false);
        return; // Don't try pitch if movie failed
      } finally {
        setMovieLoading(false);
      }

      // Step 2: Now that movie is cached, fetch the AI pitch
      try {
        setPitchLoading(true);
        const data = await getMoviePitch(movieId);
        setPitch(data);
      } catch (err) {
        setPitchError(err instanceof Error ? err.message : "Failed to load pitch");
      } finally {
        setPitchLoading(false);
      }
    }
    fetchAll();
  }, [movieId]);

  // Fetch reviews
  useEffect(() => {
    if (!movieId) return;

    async function fetchReviews() {
      try {
        const data = await getReviews(movieId);
        setReviews(data);
      } catch {
        // Reviews failing silently is fine
      }
    }
    fetchReviews();
  }, [movieId]);

  // Loading state
  if (movieLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-64 aspect-[2/3] rounded-lg bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (movieError || !movie) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {movieError || "Movie not found"}
        </div>
      </div>
    );
  }

  const genres = parseJsonField(movie.genres);
  const actors = parseJsonField(movie.lead_actors);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Movie header: poster + info side by side */}
      <div className="flex flex-col md:flex-row gap-8">

        {/* Poster */}
        <div className="w-64 shrink-0 mx-auto md:mx-0">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-full aspect-[2/3] rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              No poster
            </div>
          )}
        </div>

        {/* Movie info */}
        <div className="flex-1 space-y-4">
          {/* Title + year */}
          <div>
            <h1 className="text-3xl font-bold">{movie.title}</h1>
            <p className="text-muted-foreground mt-1">
              {movie.release_year}
              {movie.director && <span> · Directed by {movie.director}</span>}
            </p>
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <Badge key={genre} variant="secondary">{genre}</Badge>
              ))}
            </div>
          )}

          {/* Cast */}
          {actors.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Starring: </span>
              <span className="text-sm font-medium">{actors.join(", ")}</span>
            </div>
          )}

          {/* TMDB Rating */}
          {movie.tmdb_rating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-500">
                ★ {movie.tmdb_rating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">TMDB rating</span>
            </div>
          )}

          {/* AI Pitch — the star of the show */}
          <Card className="p-5 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-indigo-500/10 border-purple-500/20">
            <p className="text-xs font-medium text-purple-500 uppercase tracking-wide mb-2">
              Cinoppy pitch
            </p>
            {pitchLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
                <p className="text-xs text-muted-foreground mt-3">
                  AI is writing a spoiler-free pitch...
                </p>
              </div>
            ) : pitchError ? (
              <p className="text-sm text-muted-foreground italic">
                Couldn't generate a pitch right now. Try again later.
              </p>
            ) : pitch ? (
              <div>
                <p className="text-sm leading-relaxed">{pitch.pitch_text}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Generated by {pitch.model_used === "gemini" ? "Gemini AI" : "Hugging Face"}
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Reviews section */}
      <div className="mt-12 space-y-6">
        <h2 className="text-xl font-semibold">
          Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h2>

        {/* Review form */}
        <ReviewForm
          movieId={movieId}
          user={user}
          onUserChange={setUser}
          onReviewSubmitted={async () => {
            const updated = await getReviews(movieId);
            setReviews(updated);
          }}
        />

        {/* Existing reviews */}
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No reviews yet. Be the first to share your thoughts!
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    🎭 {review.profiles?.display_name || "anonymous"}
                  </span>
                  <StarRating value={review.rating} size="sm" />
                </div>
                {review.review_text && (
                  <p className="text-sm text-muted-foreground">{review.review_text}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* TMDB attribution (required by their terms) */}
      <div className="mt-12 pt-4 border-t text-xs text-muted-foreground">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </div>
    </div>
  );
}