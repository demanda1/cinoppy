import { useState, useEffect } from "react";
import { getHomePage } from "@/lib/api";
import type { HomePageData, Movie, TVShow } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import TVCard from "@/components/TVCard";
import Filters from "@/components/Filters";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ListFilterPlus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

  const [query, setQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();

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

  function handleAskAI() {
    let trimmed = aiQuery.trim();
    if (trimmed) {
      setAiOpen(false);
      trimmed = "Suggest something like: "+trimmed;
      navigate(`/ask-ai?q=${encodeURIComponent(trimmed)}`);
      setAiQuery("");
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setQuery("");
    }
  }

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
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-y-4 gap-x-4 md:py-0">
        <form 
        onSubmit={handleSearch} 
        className="flex flex-1 w-full md:w-auto md:max-w-md gap-2 order-3 md:order-none">
          <Input
            type="text"
            placeholder="Search movies or tv series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 bg-secondary/50 border-border/50 placeholder:text-muted-foreground/50 focus-visible:ring-cinoppy-purple/50"
          />
           
          <Button type="submit" size="lg" className="hover:text-foreground">
          <Search className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => setFilterOpen(true)}
            className="bg-gradient-to-r from-cinoppy-purple to-cinoppy-pink hover:from-cinoppy-purple/80 hover:to-cinoppy-pink/80 text-white gap-1"
          >
            <ListFilterPlus className="size-3.5" />
      </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => setAiOpen(true)}
            className="bg-gradient-to-r from-cinoppy-purple to-cinoppy-pink hover:from-cinoppy-purple/80 hover:to-cinoppy-pink/80 text-white gap-1"
          >
            <Sparkles className="size-3.5" />
          </Button>
          <div className="mb-14 text-center space-y-4">
      </div>
        </form>
      </div>
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gradient">
              <Sparkles className="size-5 text-cinoppy-purple" />
              Ask Cinoppy AI
            </DialogTitle>
            <DialogDescription>
              Ask anything about movies or TV shows and let Cinoppy AI find the answer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Suggest me a thriller movie like Inception..."
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className="min-h-24 bg-secondary/50 border-border/50 placeholder:text-muted-foreground/50 focus-visible:ring-cinoppy-purple/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAskAI();
              }
            }}
          />
          <Button
            onClick={handleAskAI}
            className="w-full bg-gradient-to-r from-cinoppy-purple to-cinoppy-pink hover:from-cinoppy-purple/80 hover:to-cinoppy-pink/80 text-white"
          >
            <Sparkles className="size-4 mr-1" />
            Ask Cinoppy AI
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
         <Filters/>
        </DialogContent>
      </Dialog>
      {/* Hero */}

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

      </div>
    </div>
  );
}