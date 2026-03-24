import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import SearchResults from "@/pages/SearchResults";
import MovieDetail from "./pages/MovieDetail";
import { getCurrentUser, logOut, onAuthChange } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    getCurrentUser().then(setUser);

    // Listen for auth changes (login, logout, token refresh)
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
          {/* We'll add these in the next steps: */}
          {/* <Route path="/watchlist" element={<Watchlist />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}