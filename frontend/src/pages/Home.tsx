import { useState, useEffect } from "react";
import { getTrending } from "@/lib/api";
import type { Movie } from "@/lib/api";
import MovieCard from "@/components/MovieCard";

export default function Home() {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrending() {
      try {
        setLoading(true);
        const movies = await getTrending();
        setTrending(movies);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trending movies");
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero section */}
      <div className="mb-10 text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
          Cinoppy
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Discover movies with AI-powered spoiler-free pitches that actually make you want to hit play.
        </p>
      </div>

      {/* Trending section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Trending this week</h2>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trending.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}