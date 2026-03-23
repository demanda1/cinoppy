import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchMovies } from "@/lib/api";
import type { Movie } from "@/lib/api";
import MovieCard from "@/components/MovieCard";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    async function doSearch() {
      try {
        setLoading(true);
        setError(null);
        const movies = await searchMovies(query);
        setResults(movies);
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
      <h2 className="text-xl font-semibold mb-6">
        {query ? (
          <>Results for "<span className="text-purple-500">{query}</span>"</>
        ) : (
          "Search for a movie"
        )}
      </h2>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && query && (
        <p className="text-muted-foreground">No movies found. Try a different search.</p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
