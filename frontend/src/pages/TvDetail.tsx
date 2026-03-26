import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getTvDetails, getTvPitchStream, getReviews, getSimilarTv } from "@/lib/api";
import type { Review, SimilarMovie, TVShow } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/StarRating";
import ReviewForm from "@/components/ReviewForm";
import CompareModal from "@/components/CompareModal";

export default function TvDetail() {
  const { id } = useParams<{ id: string }>();
  const tvId = parseInt(id || "0");

  const [tv, setTv] = useState<TVShow | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [similar, setSimilar] = useState<SimilarMovie[]>([]);
  const [tvLoading, setTvLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [tvError, setTvError] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [streamingPitch, setStreamingPitch] = useState("");
  const [streamPitchError, setStreamPitchError] = useState("");

  function parseJsonField(field: string | string[] | undefined): string[] {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try { return JSON.parse(field); } catch { return []; }
  }

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (!tvId) return;
    // Reset states when movie changes
    setSimilar([]);
    setSimilarLoading(false);
    const abortController = new AbortController();

    async function fetchAll() {
      try {
        setTvLoading(true);
        const data = await getTvDetails(tvId);
        setTv(data);
      } catch (err) {
        setTvError(err instanceof Error ? err.message : "Failed to load movie");
        setTvLoading(false);
        return;
      } finally {
        setTvLoading(false);
      }

      // Fetch pitch and similar in parallel (both need movie to be cached first)
      setSimilarLoading(true);
      setStreamingPitch("");
      setStreamPitchError("");

      const streamPitchTask = async () => {
        try {
          // 2. Pass the signal to your stream function
          await getTvPitchStream(tvId, (newChunk) => {
            console.log("new chunk", newChunk);
            setStreamingPitch((prevText) => prevText + newChunk);
          }, abortController.signal);
        } catch (error: any) {
          // 3. Ignore the error if it was us intentionally aborting the stream
          if (error.name === "AbortError") {
            console.log("Previous stream cancelled.");
            return; 
          }
          throw error; // Otherwise, throw it so Promise.allSettled catches it
        }
      };

      const [streamPitchResult, similarResult] = await Promise.allSettled([
        streamPitchTask(),
        getSimilarTv(tvId),
      ]);

      // 4. Handle errors and loading state
      if (streamPitchResult.status === "rejected" && streamPitchResult.reason?.name !== "AbortError") {
        console.error("Stream failed:", streamPitchResult.reason);
        console.error("StreamingError: ", streamPitchError);
        setStreamPitchError("Failed to load pitch");
      }

      if (similarResult.status === "fulfilled") {
        setSimilar(similarResult.value);
      }
      setSimilarLoading(false);
    }
    fetchAll();
    // 4. THIS IS THE MAGIC FIX. 
  // When React unmounts the component (or Strict Mode double-fires), it calls this.
  return () => {
    abortController.abort();
  };
  }, [tvId]);

  useEffect(() => {
    if (!tvId) return;
    fetchReviews();
  }, [tvId]);

  async function fetchReviews() {
    try {
      const data = await getReviews(tvId);
      setReviews(data);
    } catch {}
  }

  if (tvLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-64 aspect-[2/3] rounded-xl bg-secondary animate-pulse shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-3/4 bg-secondary animate-pulse rounded-lg" />
            <div className="h-4 w-1/2 bg-secondary animate-pulse rounded-lg" />
            <div className="h-32 bg-secondary animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (tvError || !tv) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
          {tvError || "Movie not found"}
        </div>
      </div>
    );
  }

  const genres = parseJsonField(tv.genres);
  const actors = parseJsonField(tv.lead_actors);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Movie header */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-64 shrink-0 mx-auto md:mx-0">
          {tv.poster_url ? (
            <img src={tv.poster_url} alt={tv.title} className="w-full rounded-xl shadow-2xl shadow-cinoppy-purple/10" />
          ) : (
            <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1 space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{tv.title}</h1>
            <p className="text-muted-foreground mt-1">
              {tv.release_year}
              {tv.director && (
                <span> · Directed by <span className="text-cinoppy-cyan">{tv.director}</span></span>
              )}
            </p>
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <Badge key={genre} variant="secondary" className="bg-cinoppy-purple/10 text-cinoppy-purple border border-cinoppy-purple/20">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {actors.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Starring </span>
              <span className="text-sm font-medium text-cinoppy-pink">{actors.join(", ")}</span>
            </div>
          )}

          {tv.tmdb_rating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-cinoppy-amber">★ {tv.tmdb_rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">TMDB rating</span>
            </div>
          )}

          {/* AI Pitch */}
          <div className="pitch-card rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-gradient">Cinoppy pitch</p>
            {streamingPitch?<p className="text-sm leading-relaxed text-foreground/90">{streamingPitch}</p> : 
            <p className="text-xs text-muted-foreground mt-3">AI is crafting a spoiler-free pitch...</p>}
          </div>

          {/* AI Action Button — only compare remains */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompare(true)}
              className="border-cinoppy-pink/30 text-cinoppy-pink hover:bg-cinoppy-pink/10"
            >
              Compare with another
            </Button>
          </div>
        </div>
      </div>

      {/* You may also like — loads automatically */}
      <div className="mt-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-cinoppy-blue" />
          <h2 className="text-lg font-semibold">You may also like</h2>
        </div>

        {similarLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : similar.length > 0 ? (
          <div className="grid gap-3">
            {similar.map((s, i) => (
              <div key={i} className="rounded-xl bg-card border border-border/30 p-4 flex items-start gap-4">
                <span className="text-2xl font-bold text-cinoppy-blue/30">{i + 1}</span>
                <div>
                  <p className="font-medium text-foreground">
                    {s.title} <span className="text-muted-foreground font-normal">({s.year})</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Couldn't find similar movies right now.</p>
        )}
      </div>

      {/* Compare Modal */}
      {showCompare && (
        <CompareModal
          movieId={tvId}
          movieTitle={tv.title}
          onClose={() => setShowCompare(false)}
        />
      )}

      {/* Reviews section */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-cinoppy-green" />
          <h2 className="text-lg font-semibold">
            Reviews {reviews.length > 0 && <span className="text-muted-foreground font-normal text-base">({reviews.length})</span>}
          </h2>
        </div>

        <ReviewForm
          movieId={tvId}
          user={user}
          onUserChange={setUser}
          onReviewSubmitted={fetchReviews}
        />

        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl bg-card border border-border/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-cinoppy-cyan">🎭 {review.profiles?.display_name || "anonymous"}</span>
                  <StarRating value={review.rating} size="sm" />
                </div>
                {review.review_text && <p className="text-sm text-muted-foreground leading-relaxed">{review.review_text}</p>}
                <p className="text-xs text-muted-foreground/50 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-14 pt-4 border-t border-border/30 text-xs text-muted-foreground/40">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </div>
    </div>
  );
}