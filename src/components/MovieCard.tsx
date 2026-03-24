import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Movie } from "@/lib/api";

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate();

  // Parse genres if it's a string
  const genres: string[] = typeof movie.genres === "string"
    ? (() => { try { return JSON.parse(movie.genres); } catch { return []; } })()
    : movie.genres || [];

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={() => navigate(`/movie/${movie.id}`)}
    >
      {/* Poster */}
      <div className="aspect-[2/3] overflow-hidden bg-muted">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No poster
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
          {movie.title}
        </h3>

        <div className="flex items-center justify-between">
          {movie.release_year && (
            <span className="text-xs text-muted-foreground">
              {movie.release_year}
            </span>
          )}
          {movie.tmdb_rating > 0 && (
            <span className="text-xs font-medium text-amber-600">
              ★ {movie.tmdb_rating.toFixed(1)}
            </span>
          )}
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-[10px] px-1.5 py-0">
                {genre}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
