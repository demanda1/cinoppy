import { Badge } from "@/components/ui/badge";
import type { TVShow } from "@/lib/api";

interface TVCardProps {
  show: TVShow;
}

export default function TVCard({ show }: TVCardProps) {
  const genres: string[] = typeof show.genres === "string"
    ? (() => { try { return JSON.parse(show.genres); } catch { return []; } })()
    : show.genres || [];

  return (
    <div className="group cursor-pointer glow-hover rounded-xl overflow-hidden bg-card border border-border/30">
      <div className="aspect-[2/3] overflow-hidden bg-secondary">
        {show.poster_url ? (
          <img
            src={show.poster_url}
            alt={show.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No poster
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-cinoppy-cyan transition-colors">
          {show.title}
        </h3>

        <div className="flex items-center justify-between">
          {show.first_air_year && (
            <span className="text-xs text-muted-foreground">{show.first_air_year}</span>
          )}
          {show.tmdb_rating > 0 && (
            <span className="text-xs font-medium text-cinoppy-amber">
              ★ {show.tmdb_rating.toFixed(1)}
            </span>
          )}
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 2).map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-cinoppy-cyan/10 text-cinoppy-cyan border-cinoppy-cyan/20"
              >
                {genre}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}