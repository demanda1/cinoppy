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
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero section */}
      <div className="mb-14 text-center space-y-4">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gradient">
          Cinoppy
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Discover movies with AI-powered spoiler-free pitches
          that actually make you want to hit play.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <span className="px-3 py-1 rounded-full text-xs bg-cinoppy-purple/10 text-cinoppy-purple border border-cinoppy-purple/20">
            AI Pitches
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-cinoppy-pink/10 text-cinoppy-pink border border-cinoppy-pink/20">
            No Spoilers
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-cinoppy-blue/10 text-cinoppy-blue border border-cinoppy-blue/20">
            Community Reviews
          </span>
        </div>
      </div>

      {/* Trending section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-cinoppy-pink" />
          <h2 className="text-xl font-semibold">Trending this week</h2>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
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