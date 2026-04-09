import type { Shorts } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';

  interface ShortsContainerProps {
    shortsList: Shorts[];
    onLoadMore: () => void; // New prop to trigger fetch
    onVideoSeen: (videoId: string) => void;
  }


  interface YouTubeShortItemProps {
    videoId: string;
    videoName: string;
    isNearEnd: boolean;
    onNearEnd: any;
    onSeen: (videoId: string) => void;
  }

export default function ShortsContainer({ shortsList, onLoadMore, onVideoSeen }: ShortsContainerProps) {

    // If for some reason the list is empty, don't try to render items
  if (!shortsList || shortsList.length === 0) return null;
    
  return (
    <div className="h-dvh w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black">
      { 
      shortsList.map((short, index) => {
        // Ensure the ID exists before rendering to keep hooks stable
        if (!short.id) return null;

        return(
        
            <YouTubeShortItem key={short.id} 
            videoId={short.id} 
            videoName={short.title}
            // Trigger load more when we reach the 2nd to last item
            isNearEnd={index === shortsList.length - 2}
            onNearEnd={onLoadMore}
            onSeen={onVideoSeen}
            />
          )
      } )}
    </div>
  );
}

function YouTubeShortItem({ videoId, videoName, isNearEnd, onNearEnd, onSeen}: YouTubeShortItemProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false); // Change 'isReady' to 'isLoaded'
    const containerRef = useRef<HTMLDivElement>(null);
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&iv_load_policy=3&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}`;
    const focusedUrl = isFocused 
    ? embedUrl
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&mute=1&controls=0&iv_load_policy=3&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}`;
  
  
    useEffect(() => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            // LOG EVERY EVENT: If this doesn't print, the observer isn't attached to the div
            // 1. Update the focus state for UI/Iframe
            setIsFocused(entry.isIntersecting);
      
            // 2. Use 'entry.isIntersecting' directly (NOT the state variable)
            if (entry.isIntersecting) {
              console.log("Viewing video:", videoId);
              
              // This will now trigger correctly!
              onSeen(videoId); 
      
              // 3. Trigger Load More if this is the trigger reel
              if (isNearEnd) {
                console.log("🎯 Near end reached. Triggering API call.");
                onNearEnd();
              }
              
              // Reset loading state for the new video entering view
              setIsLoaded(false);
            }
          },
          { threshold: 0.7, root: null } 
        );
      
        if (containerRef.current) observer.observe(containerRef.current);
        
        return () => observer.disconnect();
        // Add dependencies so the observer logic is aware of prop changes
      }, [videoId, isNearEnd, onNearEnd, onSeen]);
  
    return (
        <div 
        className="relative h-dvh w-full snap-y snap-mandatory bg-black flex items-center justify-center overflow-hidden "
      >
        <div ref={containerRef} className="w-full h-full">
          {isFocused && (
            <iframe
              src={focusedUrl}
              title={videoName}
              className="w-full h-full"
              onLoad={() => setIsLoaded(true)} // This kills the spinner!
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          )}
        </div>
  
        {/* The Spinner Logic */}
        {isFocused && !isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
  
        <div className="absolute bottom-10 left-6 text-white z-10 pointer-events-none">
          <h2 className="text-xl font-bold italic text-gradient-shorts">Cnippets</h2>
        </div>
      </div>
    );
  }