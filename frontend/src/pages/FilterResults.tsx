import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getMovieDetails, filterContentSearch, getTvDetails } from "@/lib/api";
import type { TVShow, FilterIds, Movie } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import TVCard from "@/components/TVCard";

export default function FilterResults() {
  const [searchParams] = useSearchParams();
  const language = searchParams.get("language") || "en";
  const genre= searchParams.get("genre") || "";
  const type= searchParams.get("type") || "movie";
  const rating= searchParams.get("rating") || "";

  const [results, setResults] = useState<FilterIds[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tvs, setTvs] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    async function doSearch() {
      try {
        setLoading(true);
        setError(null);
        const results = await await filterContentSearch(language, type, genre, rating);
        setResults(results);
        if(results.length>0){
            if(type==="movie"){
                let movieList = [];
                for (const item of results) {
                    // Execution pauses here until the API response is received
                    let movie = await getMovieDetails(parseInt(item.id));
                    movieList.push(movie);
                  }
                setMovies(movieList);
                console.log("movielist=",movies)
            } else {
                let tvList = [];
                for (const item of results) {
                    // Execution pauses here until the API response is received
                    let tv = await getTvDetails(parseInt(item.id));
                    tvList.push(tv);
                  }
                setTvs(tvList);
                console.log("tvlist=",tvs);
            }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [language, genre, type, rating]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 rounded-full bg-cinoppy-blue" />
        <h2 className="text-xl font-semibold">
          {type ? (
            <> {/* The Spinner Logic */}
            {loading && (
                <div className="absolute inset-0 flex items-start justify-center py-50 bg-black z-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple"></div>
                </div>
              )} Results for <span className="text-cinoppy-purple">{type}s</span></>
          ) : (
            "Please select appropriate filters"
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

      {!loading && !error && results.length === 0 && type && (
        <p className="text-muted-foreground">No {type} found. Try different filters.</p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.length>0? movies.map((movie)=> (<MovieCard key={movie.id} movie={movie}/>))
            : tvs.map((tv)=>(<TVCard show={tv as TVShow}/>))}
        </div>
      )}
    </div>
  );
}