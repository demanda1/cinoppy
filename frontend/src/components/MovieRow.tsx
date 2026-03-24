import { useState, useEffect, useRef } from "react";
import type { Movie, TVShow } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import TVCard from "@/components/TVCard";

interface MovieRowProps {
  title: string;
  accentColor: string;
  fetchFn: () => Promise<Movie[] | TVShow[]>;
  type?: "movie" | "tv";
}

export default function MovieRow({ title, accentColor, fetchFn, type = "movie" }: MovieRowProps) {
  const [items, setItems] = useState<(Movie | TVShow)[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFn()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function scrollLeft() {
    scrollRef.current?.scrollBy({ left: -600, behavior: "smooth" });
  }

  function scrollRight() {
    scrollRef.current?.scrollBy({ left: 600, behavior: "smooth" });
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-6 w-1 rounded-full`} style={{ backgroundColor: accentColor }} />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={scrollLeft}
            className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            ‹
          </button>
          <button
            onClick={scrollRight}
            className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-40 shrink-0 aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <div key={item.id} className="w-40 shrink-0">
              {type === "tv" ? (
                <TVCard show={item as TVShow} />
              ) : (
                <MovieCard movie={item as Movie} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}