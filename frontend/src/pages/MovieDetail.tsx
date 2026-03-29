import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { getMovieDetails, getMoviePitchStream, getReviews, getSimilarMovies, searchMovies, getMovieProviders, searchTrailer } from "@/lib/api";
import type { Movie, Review, Provider, Trailer } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/StarRating";
import ReviewForm from "@/components/ReviewForm";
import CompareModal from "@/components/CompareModal";
import MovieCard from "@/components/MovieCard";
import YoutubePlayer from "@/components/YoutubePlayer";

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const movieId = parseInt(id || "0");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [movieError, setMovieError] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [streamingPitch, setStreamingPitch] = useState("");
  const [streamPitchError, setStreamPitchError] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [trailer, setTrailer] = useState<Trailer | null>(null);

  function parseJsonField(field: string | string[] | undefined): string[] {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try { return JSON.parse(field); } catch { return []; }
  }

  async function handleSearch(title: string) {
    if (!title.trim()) return;
    setError(null);
    try {
      console.log("searching:",title);
      const results = await searchMovies(title);
      const sameTypeMovie = results.filter((m) => m.id !== movieId).slice(0, 1) as Movie[];
      setSearchResults((prev) => {
        // Check if the movie we found is already in our 'prev' list
        const isDuplicate = prev.some(existing => existing.id === sameTypeMovie[0]?.id);
  
        if (isDuplicate || sameTypeMovie.length === 0) {
          return prev; // Return existing state unchanged
        }
  
        return [...prev, ...sameTypeMovie];
      });
    } catch {
      console.log(error);
      setError("Search failed");
    }
  }

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (!movieId) return;
    // Reset states when movie changes
    setSearchResults([]);
    setTrailer(null);
    const abortController = new AbortController();

    async function fetchAll() {
      try {
        setMovieLoading(true);
        const data = await getMovieDetails(movieId);
        setMovie(data);
        getMovieProviders(movieId)
          .then((p) => setProviders(p.slice(0, 6)))
          .catch(() => {});
        const trailerData= await searchTrailer(data.title);
        setTrailer(trailerData);
      } catch (err) {
        setMovieError(err instanceof Error ? err.message : "Failed to load movie");
        setMovieLoading(false);
        return;
      } finally {
        setMovieLoading(false);
      }

      // Fetch pitch and similar in parallel (both need movie to be cached first)
      setStreamingPitch("");
      setStreamPitchError("");

      const streamPitchTask = async () => {
        try {
          // 2. Pass the signal to your stream function
          await getMoviePitchStream(movieId, (newChunk) => {
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
        getSimilarMovies(movieId),
      ]);

      // 4. Handle errors and loading state
      if (streamPitchResult.status === "rejected" && streamPitchResult.reason?.name !== "AbortError") {
        console.error("Stream failed:", streamPitchResult.reason);
        console.error("StreamingError: ", streamPitchError);
        setStreamPitchError("Failed to load pitch");
      }

      if (similarResult.status === "fulfilled") {
        console.log("handlingSearch for:", similarResult.value);
        similarResult.value.map((m)=>{
          console.log("searching for:", m.title);
          handleSearch(m.title)
        })
      }
    }
    fetchAll();
    // 4. THIS IS THE MAGIC FIX. 
  // When React unmounts the component (or Strict Mode double-fires), it calls this.
  return () => {
    abortController.abort();
  };
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
            <img src={movie.poster_url} alt={movie.title} className="w-full rounded-xl shadow-2xl shadow-cinoppy-purple/10" />
          ) : (
            <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1 space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{movie.title}</h1>
            <p className="text-muted-foreground mt-1">
              {movie.release_year}
              {movie.director && (
                <span> · Directed by <span className="text-cinoppy-cyan">{movie.director}</span></span>
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

          {movie.tmdb_rating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-cinoppy-amber">★ {movie.tmdb_rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">TMDB rating</span>
            </div>
          )}

          {/* Streaming providers */}
          {providers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-cinoppy-purple" />
                <h2 className="text-lg font-semibold">Where to stream (India)</h2>
              </div>
              <div className="flex flex-wrap gap-4">
                {providers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:border-cinoppy-purple/30 transition-colors">
                    {p.logo_path && <img src={p.logo_path} alt={p.name} className="w-6 h-6 rounded" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Youtube Modal */}

          {trailer && ( 
            <YoutubePlayer videoId={trailer?.id} 
            posterUrl={trailer?.poster_url} 
            title={trailer?.title}  /> )}


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
          <h2 className="text-lg font-semibold">You may also like ...</h2>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {searchResults.map((m) => (
            <div key={m.id} className="w-40 shrink-0">
              <MovieCard movie={m as Movie} />
            </div>
          ))}
        </div>

      </div>

      {/* Compare Modal */}
      {showCompare && (
        <CompareModal
          contentId={movieId}
          contentTitle={movie.title}
          type="movie"
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
          movieId={movieId}
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