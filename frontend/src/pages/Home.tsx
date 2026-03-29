import { useState, useEffect } from "react";
import { getHomePage } from "@/lib/api";
import type { HomePageData, Movie, TVShow } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import TVCard from "@/components/TVCard";

interface ScrollRowProps {
  title: string;
  accentColor: string;
  children: React.ReactNode;
}

function ScrollRow({ title, accentColor, children }: ScrollRowProps) {
  let scrollRef: HTMLDivElement | null = null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scrollRef?.scrollBy({ left: -600, behavior: "smooth" })}
            className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => scrollRef?.scrollBy({ left: 600, behavior: "smooth" })}
            className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={(el) => { scrollRef = el; }}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        // One single API call for all movie/TV sections
        const homeData = await getHomePage();
        setData(homeData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  function renderMovieRow(title: string, color: string, movies: Movie[]) {
    if (!movies || movies.length === 0) return null;
    return (
      <ScrollRow title={title} accentColor={color}>
        {movies.map((m) => (
          <div key={m.id} className="w-40 shrink-0">
            <MovieCard movie={m} />
          </div>
        ))}
      </ScrollRow>
    );
  }

  function renderTVRow(title: string, color: string, shows: TVShow[]) {
    if (!shows || shows.length === 0) return null;
    return (
      <ScrollRow title={title} accentColor={color}>
        {shows.map((s) => (
          <div key={s.id} className="w-40 shrink-0">
            <TVCard show={s} />
          </div>
        ))}
      </ScrollRow>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero */}
      <div className="mb-14 text-center space-y-4">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gradient">
          Cinoppy
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Discover movies, tv series and more,
          with AI recommendations and pitches that actually make you want to hit play.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <span className="px-3 py-1 rounded-full text-xs bg-cinoppy-purple/10 text-cinoppy-purple border border-cinoppy-purple/20">AI Pitches & recommendations</span>
          <span className="px-3 py-1 rounded-full text-xs bg-cinoppy-pink/10 text-cinoppy-pink border border-cinoppy-pink/20">No Spoilers</span>
          <span className="px-3 py-1 rounded-full text-xs bg-cinoppy-blue/10 text-cinoppy-blue border border-cinoppy-blue/20">Community Reviews</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-48 bg-secondary animate-pulse rounded" />
              <div className="flex gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="w-40 shrink-0 aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* All sections from single API call */}
      {data && (
        <div className="space-y-10">
          {renderMovieRow("Trending this week", "#ec4899", data.trending)}
          {renderMovieRow("Now playing in theatres", "#a855f7", data.now_playing)}
          {renderMovieRow("Top rated movies", "#10b981", data.top_rated)}
          {renderTVRow("Popular TV shows", "#06b6d4", data.popular_tv)}
          {renderTVRow("Top rated TV shows", "#ec4899", data.top_rated_tv)}
          {renderMovieRow("Popular movies", "#3b82f6", data.popular)}
          {renderMovieRow("Upcoming movies", "#f59e0b", data.upcoming)}
        </div>
      )}

      <div className="mt-14 pt-4 border-t border-border/30 text-xs text-muted-foreground/40 text-center">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </div>
    </div>
  );
}