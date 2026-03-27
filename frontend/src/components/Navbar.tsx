import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NavbarProps {
  user: { display_name: string; is_anonymous: boolean } | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setQuery("");
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0 text-2xl font-bold tracking-tight text-gradient">
          Cinoppy
        </Link>

        <form onSubmit={handleSearch} className="flex flex-1 max-w-md gap-2">
          <Input
            type="text"
            placeholder="Search movies or tv series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 bg-secondary/50 border-border/50 placeholder:text-muted-foreground/50 focus-visible:ring-cinoppy-purple/50"
          />
          <Button type="submit" size="sm" className="bg-cinoppy-purple hover:bg-cinoppy-purple/80 text-white">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Home
            </Button>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm px-3 py-1 rounded-full bg-cinoppy-purple/10 text-cinoppy-purple border border-cinoppy-purple/20">
                {user.is_anonymous ? "🎭" : "👤"} {user.display_name}
              </span>
              {!user.is_anonymous && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onLogout}>
                  Logout
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}