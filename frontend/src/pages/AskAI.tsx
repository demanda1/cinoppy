import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchMulti, searchAI, searchMovies, searchTvs } from "@/lib/api";
import type { Movie, Multi, TVShow } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import TVCard from "@/components/TVCard";

export default function AskAI() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [resultMovie, setResultMovie] = useState<Movie[]>([]);
  const [resultTv, setResultTv] = useState<TVShow[]>([]);
  const [results, setResultMulti] = useState<Multi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
        // Clear everything if query is gone
        setResultMulti([]);
        setResultMovie([]);
        setResultTv([]);
        return;
      }
    async function doSearch() {
      try {
        setLoading(true);
        setError(null);
        setResultMulti([]);
        setResultMovie([]);
        setResultTv([]);
        // 1. Get AI intent
        const content = await searchAI(query);
        const firstMatch = content[0];
        const searchTitle = firstMatch.title;

        let finalResults: Multi[] = [];

        // 2. Fetch specific data and Multi data
      if (firstMatch.type === "tv") {
        const tvshow = await searchTvs(searchTitle);
        setResultTv(tvshow); // Update state for UI
        // Format for the "Multi" list immediately using the local 'tvshow' variable
        finalResults = tvshow.map(tv => ({ ...tv, type: 'tv' as const }));
      } else {
        const movie = await searchMovies(searchTitle);
        setResultMovie(movie); // Update state for UI
        // Format for the "Multi" list immediately using the local 'movie' variable
        finalResults = movie.map(m => ({ ...m, type: 'movie' as const }));
      }
      // 3. Get the general multi results
      const multi = await searchMulti(searchTitle);
      
      // 4. COMBINE AND SET (Replace, don't append)
      // This ensures the list is fresh every time
      setResultMulti([...finalResults, ...multi]);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 rounded-full bg-cinoppy-blue" />
        <h2 className="text-xl font-semibold">
          {query ? (
            <>Results for "<span className="text-cinoppy-purple">AI recommends ...</span>"</>
          ) : (
            "Search for a movie"
          )}
        </h2>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && query && (
        <p className="text-muted-foreground">No movies found. Try a different search.</p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* 1. Render all TV Shows first */}
          {results
            .filter((item) => item.type === "tv")
            .map((show) => (
            <TVCard key={show.id} show={show as TVShow} />
            ))}
            {/* 2. Render all Movies second */}
            {results
            .filter((item) => item.type === "movie")
            .map((movie) => (
              <MovieCard key={movie.id} movie={movie as Movie} />
            ))}
        </div>
      )}
    </div>
  );
}