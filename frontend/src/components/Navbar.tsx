import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

import {searchShorts} from "@/lib/api"
import {Search, X } from "lucide-react";


interface NavbarProps {
  user: { display_name: string; is_anonymous: boolean } | null;
}

export default function Navbar({ user }: NavbarProps) {
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
      {/* 1. The Container (Keeps your links together) */}
      <div className="relative flex w-full max-w-md h-14 p-1 bg-white/5 border border-white/10 rounded-full">
        
        {/* 2. The Sliding Pill */}
        <div className={`absolute w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white rounded-full transition-transform duration-300 ease-out shadow-lg border border-white/40 bg-transparent
          ${isCnippetsPage ? "translate-x-full" : "translate-x-0"}`} 
        />

        {/* 3. Your Original Links */}
        <Link 
          to="/" 
          className={`relative z-10 w-1/2 flex justify-center items-center shrink-0 text-2xl font-bold tracking-tight text-gradient transition-colors duration-300  whitespace-nowrap text-center
          ${!isCnippetsPage ? "text-black" : "text-white"}`}
        >
          Cinoppy
        </Link>

        <Link 
          to="/shorts" 
          className={`relative z-10 w-1/2 flex justify-center items-center shrink-0 text-2xl font-bold tracking-tight cnippets-link transition-colors duration-300 whitespace-nowrap text-center
          ${isCnippetsPage ? "text-black" : "text-white"}`}
        >
          Cnippets
        </Link>
        {/* <Button size="lg" onClick={() => setIsSearchOpen(true)} className="shrink-0 text-2xl font-bold tracking-tight text-gradient" >
        <Search className="h-5 w-5"  />
        </Button> */}
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
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-3xl">
      {/* 1. The Container (Keeps your links together) */}
      <div className="relative flex w-full max-w-md h-14 p-1 bg-white/5 border border-white/10 rounded-full">
        
        {/* 2. The Sliding Pill */}
        <div className={`absolute w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white rounded-full transition-transform duration-300 ease-out shadow-lg border border-white/40 bg-transparent
          ${isCnippetsPage ? "translate-x-full" : "translate-x-0"}`} 
        />

        {/* 3. Your Original Links */}
        <Link 
          to="/" 
          className={`relative z-10 w-1/2 flex justify-center items-center shrink-0 text-2xl font-bold tracking-tight text-gradient transition-colors duration-300 whitespace-nowrap text-center
          ${!isCnippetsPage ? "text-black" : "text-white"}`}
        >
          Cinoppy
        </Link>

        <Link 
          to="/shorts" 
          className={`relative z-10 w-1/2 flex justify-center items-center shrink-0 text-2xl font-bold tracking-tight cnippets-link transition-colors duration-300 whitespace-nowrap text-center
          ${isCnippetsPage ? "text-black" : "text-white"}`}
        >
          Cnippets
        </Link>
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
    </nav>
  );
}