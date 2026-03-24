import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMovieDetails, getMoviePitch, getReviews } from "@/lib/api";
import type { Movie, Pitch, Review } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
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

  function parseJsonField(field: string | string[] | undefined): string[] {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try { return JSON.parse(field); } catch { return []; }
  }

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (!movieId) return;

    async function fetchAll() {
      try {
        setMovieLoading(true);
        const data = await getMovieDetails(movieId);
        setMovie(data);
      } catch (err) {
        setMovieError(err instanceof Error ? err.message : "Failed to load movie");
        setMovieLoading(false);
        setPitchLoading(false);
        return;
      } finally {
        setMovieLoading(false);
      }

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

  useEffect(() => {
    if (!movieId) return;
    fetchReviews();
  }, [movieId]);

  async function fetchReviews() {
    try {
      const data = await getReviews(movieId);
      setReviews(data);
    } catch {}
  }

  if (movieLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-64 aspect-[2/3] rounded-xl bg-secondary animate-pulse shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-3/4 bg-secondary animate-pulse rounded-lg" />
            <div className="h-4 w-1/2 bg-secondary animate-pulse rounded-lg" />
            <div className="h-4 w-1/3 bg-secondary animate-pulse rounded-lg" />
            <div className="h-32 bg-secondary animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
          {movieError || "Movie not found"}
        </div>
      </div>
    );
  }

  const genres = parseJsonField(movie.genres);
  const actors = parseJsonField(movie.lead_actors);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Movie header */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-64 shrink-0 mx-auto md:mx-0">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full rounded-xl shadow-2xl shadow-cinoppy-purple/10"
            />
          ) : (
            <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1 space-y-5">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">{movie.title}</h1>
            <p className="text-muted-foreground mt-1">
              {movie.release_year}
              {movie.director && (
                <span> · Directed by <span className="text-cinoppy-cyan">{movie.director}</span></span>
              )}
            </p>
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="bg-cinoppy-purple/10 text-cinoppy-purple border border-cinoppy-purple/20"
                >
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {/* Cast */}
          {actors.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Starring </span>
              <span className="text-sm font-medium text-cinoppy-pink">{actors.join(", ")}</span>
            </div>
          )}

          {/* Rating */}
          {movie.tmdb_rating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-cinoppy-amber">★ {movie.tmdb_rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">TMDB rating</span>
            </div>
          )}

          {/* AI Pitch */}
          <div className="pitch-card rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-gradient">
              Cinoppy pitch
            </p>
            {pitchLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-secondary animate-pulse rounded w-full" />
                <div className="h-4 bg-secondary animate-pulse rounded w-5/6" />
                <div className="h-4 bg-secondary animate-pulse rounded w-4/6" />
                <p className="text-xs text-muted-foreground mt-3">AI is crafting a spoiler-free pitch...</p>
              </div>
            ) : pitchError ? (
              <p className="text-sm text-muted-foreground italic">Couldn't generate a pitch right now.</p>
            ) : pitch ? (
              <div>
                <p className="text-sm leading-relaxed text-foreground/90">{pitch.pitch_text}</p>
                <p className="text-xs text-muted-foreground/60 mt-3">
                  Crafted by {pitch.model_used === "gemini" ? "Gemini AI" : "Hugging Face"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div className="mt-14 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-cinoppy-green" />
          <h2 className="text-xl font-semibold">
            Reviews {reviews.length > 0 && (
              <span className="text-muted-foreground font-normal text-base">({reviews.length})</span>
            )}
          </h2>
        </div>

        {/* Review form */}
        <ReviewForm
          movieId={movieId}
          user={user}
          onUserChange={setUser}
          onReviewSubmitted={fetchReviews}
        />

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl bg-card border border-border/30 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-cinoppy-cyan">
                    🎭 {review.profiles?.display_name || "anonymous"}
                  </span>
                  <StarRating value={review.rating} size="sm" />
                </div>
                {review.review_text && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.review_text}</p>
                )}
                <p className="text-xs text-muted-foreground/50 mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TMDB attribution */}
      <div className="mt-14 pt-4 border-t border-border/30 text-xs text-muted-foreground/40">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </div>
    </div>
  );
}