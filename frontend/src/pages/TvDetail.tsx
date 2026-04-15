import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { getTvDetails, getTvPitchStream, getReviews, getSimilarTv, searchTvs, getTVProviders, searchTrailer, fetchTvPoster } from "@/lib/api";
import type { Review, TVShow, Provider, Trailer } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import StarRating from "@/components/StarRating";
import ReviewForm from "@/components/ReviewForm";
import CompareModal from "@/components/CompareModal";
import TVCard from "@/components/TVCard";
import YoutubePlayer from "@/components/YoutubePlayer";
import {Share2 } from "lucide-react";

export default function TvDetail() {
  const { id } = useParams<{ id: string }>();
  const tvId = parseInt(id || "0");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [tv, setTv] = useState<TVShow | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tvLoading, setTvLoading] = useState(true);
  const [tvError, setTvError] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [streamingPitch, setStreamingPitch] = useState("");
  const [streamPitchError, setStreamPitchError] = useState("");
  const [searchResults, setSearchResults] = useState<TVShow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [trailer, setTrailer] = useState<Trailer | null>(null);
  const [copied, setCopied] = useState(false);
  

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
      const results = await searchTvs(title);
      const sameTypeMovie = results.filter((m) => m.id !== tvId).slice(0, 1) as TVShow[];
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
    if (!tvId) return;
    // Reset states when movie changes
    setSearchResults([]);
    setTrailer(null);
    const abortController = new AbortController();

    async function fetchAll() {
      try {
        setTvLoading(true);
        const data = await getTvDetails(tvId);
        setTv(data);
        getTVProviders(tvId)
          .then((p) => setProviders(p.slice(0, 6)))
          .catch(() => {});
        const trailerData= await searchTrailer(data.title);
        setTrailer(trailerData);
      } catch (err) {
        setTvError(err instanceof Error ? err.message : "Failed to load movie");
        setTvLoading(false);
        return;
      } finally {
        setTvLoading(false);
      }

      // Fetch pitch and similar in parallel (both need movie to be cached first)
      setStreamingPitch("");
      setStreamPitchError("");

      const streamPitchTask = async () => {
        try {
          // 2. Pass the signal to your stream function
          await getTvPitchStream(tvId, (newChunk) => {
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


  const handleShare = async () => {
    setCopied(false);
      const shareData = {
        title: tv.title,
        text: `hey check this out im watching this series: ${tv.title}`,
        url: window.location.href, // Captures current movie page URL
        poster: tv.poster_url
      };
      // 1. Safety check: stop if the URL is missing
  if (!tv.poster_url) {
    console.error("No poster URL available to share");
    return;
  }
  
      // 1. Try to open Native Share Modal (Mobile/Supported Browsers)
      if (navigator.share) {
        try {
            const blob = await fetchTvPoster(tv.id.toString());
            const file = new File([blob], 'poster.jpg', { type: 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({...shareData, files: [file]});
              console.log('Successfully shared');
            }
        } catch (error) {
          // Log error only if it's not a user cancellation
          console.error('Error sharing:', error);
        }
      } 
      // 2. Fallback: Copy to Clipboard (Desktop/Unsupported)
      else {
        try {
          const fullMessage = `${shareData.text} ${shareData.url}`;
          await navigator.clipboard.writeText(fullMessage).then(()=>{
            const toast = document.getElementById("copy-toast");
            if (toast) {
              toast.innerText = "Copied! ✅";
              toast.style.display = "block";
              
              setTimeout(() => {
                toast.style.display = "none";
              }, 2000);
            } else {
              console.error("Could not find the element with ID 'copy-toast'");
            }
          });
          console.log('Successfully copied link');
          
        } catch (error) {
          console.error('Failed to copy link:', error);
        }
      }
      setCopied(true);
  };


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
            <h1 className="text-3xl font-bold text-foreground">{tv.title}
            <button className="relative z-10 p-2 hover:bg-muted rounded-full transition-colors" onClick={handleShare} > 
            {copied ? <Share2 className="h-7 w-7 text-muted-foreground mr-3 shrink-0" /> : <Share2 className="h-7 w-7 text-purple-500 mr-3 shrink-0" />} </button>
            </h1>
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
          {/* <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompare(true)}
              className="bg-cinoppy-purple hover:bg-cinoppy-purple/80 text-white"
            >
              Compare with another
            </Button>
          </div> */}
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
          {searchResults.map((tv) => (
            <div key={tv.id} className="w-40 shrink-0">
              <TVCard show={tv as TVShow} />
            </div>
          ))}
        </div>

      </div>

      {/* Compare Modal */}
      {showCompare && (
        <CompareModal
          contentId={tvId}
          contentTitle={tv.title}
          type="tv"
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