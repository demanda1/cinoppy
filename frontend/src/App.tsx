import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import SearchResults from "@/pages/SearchResults";
import MovieDetail from "@/pages/MovieDetail";
import TvDetail from "@/pages/TvDetail";
import AskAI from "@/pages/AskAI";
import { getCurrentUser, logOut, onAuthChange } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check if user already has a session (read-only, never creates accounts)
    getCurrentUser().then(setUser);
    // In your main page (e.g., index.html or app.js)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    }

    // Listen for ONLY explicit sign-in/sign-out events
    const { data: { subscription } } = onAuthChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await logOut();
    setUser(null);
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/tv/:id" element={<TvDetail />} />
          <Route path="/ask-ai" element={<AskAI />} />
          {/* We'll add these in the next steps: */}
          {/* <Route path="/watchlist" element={<Watchlist />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}