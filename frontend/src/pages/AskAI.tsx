import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchMulti, searchAI, searchMovies, searchTvs } from "@/lib/api";
import type { Movie, Multi, TVShow } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import TVCard from "@/components/TVCard";

// Extend the Multi type locally to include our unique key
type MultiWithKey = Multi & { uniqueKey: string };

export default function AskAI() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResultMulti] = useState<MultiWithKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResultMulti([]);
      return;
    }

    async function doSearch() {
      try {
        setLoading(true);
        setError(null);
        setResultMulti([]);

        // 1. Get AI intents (e.g., the 5 movie objects)
        const aiContent = await searchAI(query);

        // 2. Map each AI suggestion to a promise that fetches its specific data
        const allRequests = aiContent.map(async (item) => {
          try {
            const searchTitle = item.title;
            let specificData: Multi[] = [];

            if (item.type === "tv") {
              const tvshow = await searchTvs(searchTitle);
              specificData = tvshow.map(tv => ({ ...tv, type: 'tv' as const }));
            } else {
              const movie = await searchMovies(searchTitle);
              specificData = movie.map(m => ({ ...m, type: 'movie' as const }));
            }

            const multi = await searchMulti(searchTitle);
            
            // 3. Combine and inject uniqueKey to prevent React "duplicate key" errors
            return [...specificData, ...multi].map(res => ({
              ...res,
              uniqueKey: `${searchTitle.replace(/\s+/g, '')}-${res.id}`
            }));
          } catch (err) {
            console.error(`Failed to fetch details for ${item.title}`, err);
            return [];
          }
        });

        // 4. Run all searches in parallel
        const resultsArray = await Promise.all(allRequests);
        
        // 5. Flatten results and update state once
        setResultMulti(resultsArray.flat() as MultiWithKey[]);
        
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
          {/* Render TV Shows using uniqueKey */}
          {results
            .filter((item) => item.type === "tv")
            .map((show) => (
              <TVCard key={show.uniqueKey} show={show as TVShow} />
            ))}
          {/* Render Movies using uniqueKey */}
          {results
            .filter((item) => item.type === "movie")
            .map((movie) => (
              <MovieCard key={movie.uniqueKey} movie={movie as Movie} />
            ))}
        </div>
      )}
    </div>
  );
}
