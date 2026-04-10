import { useState, useEffect, useRef, useCallback } from "react";
import ShortsContainer from "@/components/ShortsContainer";
import { searchShorts } from "@/lib/api";
import type { Shorts } from "@/lib/api";

export default function Cnippets() {
    const [shorts, setShorts] = useState<Shorts[]>([]);
    const [refreshKey, setRefreshKey] = useState(Date.now());
    const isFetchingMore = useRef(false); // Prevents duplicate calls
    const isInitializing = useRef(false); // Gatekeeper for the first load
    const LOCAL_STORAGE_KEY = "cinoppy_shorts_pool";
    // Save the pool to the browser

  const poolManager = {
    save: (data: Shorts[]) => {
      try {
        if (!data || data.length === 0) {
            console.warn("⚠️ Refusing to save an empty pool to localStorage.");
            return;
          }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        console.log("💾 Pool saved to storage. Count:", data.length);
      } catch (e) {
        console.error("Failed to save pool", e);
      }
    },
    get: (): Shorts[] => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        // Ensure it's actually an array
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    clear: () => localStorage.removeItem(LOCAL_STORAGE_KEY)
  };

    const TRENDING_TOPICS = [
        "climax scenes from random hindi",
        "climax scenes from random english",
        "climax scenes from random",
        "scenes from random hindi",
        "scenes from random english",
        "random scenes from random",
        "funny scenes from hindi",
        "funny scenes from english",
        "action scenes from hindi",
        "action scenes from english",
        "best scenes from hindi",
        "best scenes from english",
        "best scenes from underrated hindi",
        "best scenes from underrated english",
        "best scenes from arthouse hindi",
        "best scenes from arthouse western",
        "best scenes from western",
        "oscar winning short scenes from",
        "award winning short scenes from",
        "critics chosen short scenes from",
        "critically acclaimed scenes from hindi",
        "critically acclaimed scenes from english",
        "critically acclaimed scenes from random",
        "random scenes from",
        "trending ott hindi english",
        "latest ott hindi english",
        "popular ott hindi english",
        "netflix hindi or english",
        "prime hindi or english",
        "netflix best scenes from",
        "prime best scenes from",
        "netflix best random clips from",
        "prime best random clips from",
        "jiohotstar scenes from",
        "jiohotstar best clips from",
        "jiohotstar todays best clips from",
        "netflix todays best scenes from",
        "prime todays best scenes from",
        "sony todays best scenes from",
        "zee5 todays best scenes from",
        "zee5 todays best scenes from",
        "chalchiytra talks recommends",
        "abhi ka review recommends",
        "abhi ka review best",
        "abhi ka review todays",
        "best random"
      ];
      
      const getRandomTrendingQuery = () => {
        const randomIndex = Math.floor(Math.random() * TRENDING_TOPICS.length);
        console.log(TRENDING_TOPICS[randomIndex]);
        return TRENDING_TOPICS[randomIndex];
      };
  
    useEffect(() => {
      // A. Check for "Pending" data from a fresh navigation
      const pending = (window as any).pendingShortsData;
      if (pending) {
        console.log("Found pending data on mount:", pending);
        setShorts(pending);
        setRefreshKey(Date.now());
        delete (window as any).pendingShortsData; // Clean up
      } 
      // B. Otherwise, if empty, load defaults
      else if (shorts.length === 0) {
        // searchShorts(getRandomTrendingQuery()).then(data => {
        //    if (data) setShorts(data);
        // });
      }

      const initCnippets = async () => {
        console.log("💓 Heartbeat 1: initCnippets started");
    
        if (isInitializing.current) {
            console.log("💓 Heartbeat 2: Blocked by ref");
            return;
        }
           // 1. Try to get existing pool
           let currentPool = poolManager.get();
           console.log("💓 Heartbeat 3: Current pool length is", currentPool.length);

        // IF POOL IS EMPTY OR LOW: Fetch 50 new ones
        if (currentPool.length < 5) {
            isInitializing.current = true;
            console.log("💓 Heartbeat 4: Entering API fetch block");
            try{

                console.log("searching shorts<5....")
                const freshData = await searchShorts(getRandomTrendingQuery());
                console.log("💓 Heartbeat 5: API returned data:", freshData);
          if (freshData && freshData.length > 0) {
            currentPool = freshData;
            console.log("💓 Heartbeat 6: Saving to storage now...");
          localStorage.setItem("cinoppy_shorts_pool", JSON.stringify(freshData));
            setShorts(freshData);
          } else {
            console.log("💓 Heartbeat 7: API returned empty array");
          }
            } catch (err) {
                console.error("💓 Heartbeat ERROR:", err);
              } finally {
                isInitializing.current = false;
        console.log("💓 Heartbeat 8: initialization finished");
            }
        } else {
          // Shuffle existing pool for variety
        currentPool = currentPool.sort(() => Math.random() - 0.5);
        console.log("💓 Heartbeat 9: Pool is healthy, skipping fetch");
        setShorts(currentPool);
        }

      };
  
      initCnippets();
  
      // C. Listen for "Live" broadcasts (if user searches while already here)
      const handleSearchEvent = (event: any) => {
        console.log("Cnippets received LIVE broadcast:", event.detail);
        setShorts(event.detail);
        setRefreshKey(Date.now());
      };
  
      window.addEventListener('cnippets-search', handleSearchEvent);
      return () => window.removeEventListener('cnippets-search', handleSearchEvent);
    }, []); // Only run once on mount

    const loadMoreCnippets = async () => {
        if (isFetchingMore.current) return; // Don't fetch if already fetching
        
        isFetchingMore.current = true;
        console.log("Loading more trending content...");
    
        try {
        //   const moreData = await searchShorts(getRandomTrendingQuery());
        //   console.log("fetched new shorts", moreData.length);
        //   if (moreData && moreData.length > 0) {
        //     // APPEND the new data to the existing list
        //     setShorts((prev) => [...prev, ...moreData]);
        //   }
        } catch (e) {
          console.error("Infinite scroll fetch failed", e);
        } finally {
          isFetchingMore.current = false;
        }
      };

      const handleVideoWatched = useCallback((videoId: string) => {
        // When a video is "watched" (passed through), remove it from the pool
        const currentPool = poolManager.get();
        console.log("💓 Heartbeat 3: Current pool length is", currentPool.length);
        const filtered = currentPool.filter(item => item.id !== videoId);
        console.log("💓 Heartbeat 11: Updating storage removing -", videoId);
        // Only update if we actually removed something
        if (filtered.length !== currentPool.length) {
            localStorage.setItem("cinoppy_shorts_pool", JSON.stringify(filtered));
            console.log("💓 Heartbeat 3: Current pool length is", poolManager.get().length);
        
            // Optional: If you want the UI to shrink as you watch (like removing from a list)
            // setShorts(filtered); 
        
            // If pool gets too low while watching, fetch more in background
            if (filtered.length < 5) {
                console.log("💓 Heartbeat 12: loading more", poolManager.get().length);
                loadMoreToPool();
            }
        }
      }, []);

      const loadMoreToPool = async () => {
        if (isFetchingMore.current) return;
        isFetchingMore.current = true;
        console.log("searching shorts loadMoreToPool....")
        const moreData = await searchShorts(getRandomTrendingQuery());
        if (moreData) {
            const updated = [...poolManager.get(), ...moreData];
            localStorage.setItem("cinoppy_shorts_pool", JSON.stringify(updated));
            console.log("💓 Heartbeat 12: loading more", poolManager.get().length);
            setShorts(updated);
          }
        isFetchingMore.current = false;
      };
  
    return (
      <div className="fixed inset-0 z-40 bg-black">
        {shorts.length > 0 ? (
          <ShortsContainer key={refreshKey} shortsList={shorts} onLoadMore={loadMoreCnippets} onVideoSeen={handleVideoWatched} />
        ) : (
          <div className="flex h-full items-center justify-center text-white italic">
             Syncing Cnippets...
          </div>
        )}
      </div>
    );
  }