import { useState, useEffect } from "react";
import {
  getTrending,
  getNowPlaying,
  getPopularMovies,
  getTopRatedMovies,
  getUpcoming,
  getPopularTV,
  getTopRatedTV,
  getMovieProviders,
} from "@/lib/api";
import type { Provider } from "@/lib/api";
import MovieRow from "@/components/MovieRow";

export default function Home() {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    getMovieProviders()
      .then((data) => setProviders(data.slice(0, 12)))
      .catch(() => {});
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

      {/* Movie and TV sections */}
      <div className="space-y-10">
        <MovieRow
          title="Trending this week"
          accentColor="#ec4899"
          fetchFn={getTrending}
        />

        <MovieRow
          title="Now playing in theatres"
          accentColor="#a855f7"
          fetchFn={getNowPlaying}
        />

        <MovieRow
          title="Popular movies"
          accentColor="#3b82f6"
          fetchFn={getPopularMovies}
        />

        <MovieRow
          title="Upcoming movies"
          accentColor="#f59e0b"
          fetchFn={getUpcoming}
        />

        <MovieRow
          title="Top rated movies"
          accentColor="#10b981"
          fetchFn={getTopRatedMovies}
        />

        <MovieRow
          title="Popular TV shows"
          accentColor="#06b6d4"
          fetchFn={getPopularTV}
          type="tv"
        />

        <MovieRow
          title="Top rated TV shows"
          accentColor="#ec4899"
          fetchFn={getTopRatedTV}
          type="tv"
        />

        {/* Streaming providers */}
        {providers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-cinoppy-purple" />
              <h2 className="text-lg font-semibold">Where to stream (India)</h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/30 hover:border-cinoppy-purple/30 transition-colors"
                >
                  {p.logo_url && (
                    <img src={p.logo_url} alt={p.name} className="w-6 h-6 rounded" />
                  )}
                  <span className="text-sm text-muted-foreground">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer attribution */}
      <div className="mt-14 pt-4 border-t border-border/30 text-xs text-muted-foreground/40 text-center">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </div>
    </div>
  );
}