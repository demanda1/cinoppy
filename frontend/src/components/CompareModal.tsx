import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchMovies, compareMovies, getMovieDetails } from "@/lib/api";
import type { Movie, MovieComparison } from "@/lib/api";

interface CompareModalProps {
  movieId: number;
  movieTitle: string;
  onClose: () => void;
}

export default function CompareModal({ movieId, movieTitle, onClose }: CompareModalProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<{ movie1: string; movie2: string; comparison: MovieComparison } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const results = await searchMovies(query);
      setSearchResults(results.filter((m) => m.id !== movieId).slice(0, 5));
    } catch {
      setError("Search failed");
    }
    setSearching(false);
  }

  async function handleCompare(otherMovieId: number) {
    setComparing(true);
    setError(null);
    setSearchResults([]);
    try {
      await getMovieDetails(otherMovieId);
      const data = await compareMovies(movieId, otherMovieId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    }
    setComparing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-card border border-border/30 p-6 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Compare <span className="text-cinoppy-pink">{movieTitle}</span>
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>

        {/* Comparison result */}
        {result ? (
          <div className="space-y-5">
            {/* Movie names header */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Aspect</div>
              <div className="text-sm font-semibold text-cinoppy-pink">{result.movie1}</div>
              <div className="text-sm font-semibold text-cinoppy-blue">{result.movie2}</div>
            </div>

            {/* Comparison table */}
            <div className="rounded-xl border border-border/30 overflow-hidden">
              {result.comparison.points.map((point, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-3 gap-2 px-4 py-3 ${
                    i % 2 === 0 ? "bg-secondary/20" : "bg-secondary/40"
                  }`}
                >
                  <div className="text-xs font-medium text-cinoppy-purple uppercase tracking-wider flex items-center">
                    {point.aspect}
                  </div>
                  <div className="text-sm text-muted-foreground">{point.movie1}</div>
                  <div className="text-sm text-muted-foreground">{point.movie2}</div>
                </div>
              ))}
            </div>

            {/* Watch if... cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cinoppy-pink/5 border border-cinoppy-pink/20 p-4">
                <p className="text-xs font-semibold text-cinoppy-pink uppercase tracking-wider mb-2">
                  Watch {result.movie1} if...
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.comparison.watch_movie1_if}
                </p>
              </div>
              <div className="rounded-xl bg-cinoppy-blue/5 border border-cinoppy-blue/20 p-4">
                <p className="text-xs font-semibold text-cinoppy-blue uppercase tracking-wider mb-2">
                  Watch {result.movie2} if...
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.comparison.watch_movie2_if}
                </p>
              </div>
            </div>

            {/* Verdict */}
            <div className="rounded-xl bg-cinoppy-purple/5 border border-cinoppy-purple/20 p-4 text-center">
              <p className="text-xs font-semibold text-cinoppy-purple uppercase tracking-wider mb-2">Verdict</p>
              <p className="text-sm text-foreground/90 leading-relaxed">{result.comparison.verdict}</p>
            </div>

            <Button
              variant="outline"
              className="w-full border-border/30"
              onClick={() => { setResult(null); setQuery(""); }}
            >
              Compare with another movie
            </Button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search for a movie to compare..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-secondary/50 border-border/50 focus-visible:ring-cinoppy-pink/50"
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="bg-cinoppy-pink hover:bg-cinoppy-pink/80 text-white shrink-0"
              >
                {searching ? "..." : "Search"}
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Pick a movie to compare:</p>
                {searchResults.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleCompare(m.id)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 cursor-pointer hover:border-cinoppy-pink/30 transition-colors"
                  >
                    {m.poster_url && (
                      <img src={m.poster_url} alt={m.title} className="w-10 h-14 rounded object-cover" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.release_year} · ★ {m.tmdb_rating?.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading */}
            {comparing && (
              <div className="text-center py-8 space-y-3">
                <div className="space-y-2">
                  <div className="h-4 bg-secondary animate-pulse rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-secondary animate-pulse rounded w-1/2 mx-auto" />
                  <div className="h-4 bg-secondary animate-pulse rounded w-2/3 mx-auto" />
                </div>
                <p className="text-xs text-muted-foreground">AI is comparing both movies point by point...</p>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}