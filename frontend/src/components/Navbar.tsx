import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Search, X } from "lucide-react";
import {searchShorts} from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface NavbarProps {
  user: { display_name: string; is_anonymous: boolean } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [query, setQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cnippetsQuery, setCnippetsQuery] = useState(""); // Captures the input
  const navigate = useNavigate();
  // Check if we are currently on the cnippets page
  const isCnippetsPage = location.pathname === "/shorts";

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []); // Keep the dependency array empty

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

  async function handleCnippetsSearchSubmit() {
    console.log("searching cnippets:", cnippetsQuery);
    try {
      const shortsData = await searchShorts(cnippetsQuery); 
      console.log(shortsData);
      if (shortsData) {
        // 1. Store data globally so the next page can grab it on mount
        (window as any).pendingShortsData = shortsData;
    
        // 2. Navigate to the page
        navigate('/shorts');
    
        // 3. Also broadcast for if we are ALREADY on the page
        window.dispatchEvent(new CustomEvent('cnippets-search', { detail: shortsData }));
    
        setIsSearchOpen(false);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  }


  if (isCnippetsPage) {
    // RETURN THE SHORTS NAVBAR
    return (
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/10 backdrop-blur-3xl">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-y-4 gap-x-4 px-4 py-3 md:py-0">
        <Link to="/" className="shrink-0 text-2xl font-bold tracking-tight text-gradient">
          Cinoppy
        </Link>
        <Link to="/shorts" className="shrink-0 text-2xl font-bold tracking-tight cnippets-link">
          Cnippets
        </Link>
        {/* <Button size="lg" onClick={() => setIsSearchOpen(true)} className="shrink-0 text-2xl font-bold tracking-tight text-gradient" >
        <Search className="h-5 w-5"  />
        </Button> */}
        <Link to="/" className="text-muted-foreground hover:text-foreground">
        Home
        </Link>
      </div>
      {/* 2. Lightweight Search Overlay (Slides in from top) */}
      <div className={`absolute inset-0 z-10 bg-background flex items-center px-6 transition-all duration-300 ease-out ${isSearchOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <Search className="h-5 w-5 text-purple-500 mr-3 shrink-0" />
        <input 
          autoFocus={isSearchOpen}
          value={cnippetsQuery}
          onChange={(e) => setCnippetsQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCnippetsSearchSubmit()}
          placeholder="Search Cnippets..."
          className="flex-1 bg-transparent text-lg outline-none text-white border-none focus:ring-0 placeholder:text-muted-foreground/50"
        />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsSearchOpen(false)}
          className="ml-4 text-muted-foreground hover:text-white"
        >
          <X className="h-5 w-5 mr-1" />
          <span className="hidden sm:inline">Close</span>
        </Button>
      </div>
    </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-y-4 gap-x-4 px-4 py-3 md:py-0">
        <Link to="/" className="shrink-0 text-2xl font-bold tracking-tight text-gradient">
          Cinoppy
        </Link>
        <Link to="/shorts" className="shrink-0 text-2xl font-bold tracking-tight cnippets-link">
          Cnippets
        </Link>
        <Link to="/">
            <Button variant="ghost" size="lg" className="text-muted-foreground hover:text-foreground">
              Home
            </Button>
          </Link>

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
          <Button type="submit" size="lg" className="bg-cinoppy-purple hover:bg-cinoppy-purple/80 text-white">
            Search
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => setAiOpen(true)}
            className="bg-gradient-to-r from-cinoppy-purple to-cinoppy-pink hover:from-cinoppy-purple/80 hover:to-cinoppy-pink/80 text-white gap-1"
          >
            Ask Cinoppy AI
            <Sparkles className="size-3.5" />
          </Button>
        </form>
        
        <div className="flex items-center gap-3 order-2 md:order-none">

          {/* (
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
          ) */}
          {user ? null : null}

        </div>
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
    </nav>
  );
}