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
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">

        {/* Logo */}
        <Link
          to="/"
          className="shrink-0 text-2xl font-bold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent"
        >
          Cinoppy
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex flex-1 max-w-md gap-2">
          <Input
            type="text"
            placeholder="Search movies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>

        {/* Right side: nav links + user */}
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm">Home</Button>
          </Link>

          {user && (
            <Link to="/watchlist">
              <Button variant="ghost" size="sm">Watchlist</Button>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {user.is_anonymous ? "🎭" : "👤"} {user.display_name}
              </span>
              {!user.is_anonymous && (
                <Button variant="outline" size="sm" onClick={onLogout}>
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