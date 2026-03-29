import React, { useState } from 'react';
import { PlayCircle } from 'lucide-react'; // Using Lucide for a clean icon

interface VideoMaskProps {
  videoId: string;
  posterUrl: string; 
  title: string;
}

const VideoMaskPlayer: React.FC<VideoMaskProps> = ({ videoId, posterUrl, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Construct the embed URL

  const origin = window.location.origin; // Gets "http://localhost:5173" or "https://cinoppy.com"
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&iv_load_policy=3&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}`;
  
  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl group border border-border/50 bg-secondary/30">
      {!isPlaying ? (
        // --- THE MASK (POSTER) ---
        <div 
          className="relative w-full h-full cursor-pointer overflow-hidden"
          onClick={() => setIsPlaying(true)}
        >
          {/* Movie Backdrop */}
          <img 
            src={posterUrl} 
            alt="dhurandhar" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />

          {/* Custom Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-cinoppy-purple/10 p-4 rounded-full shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
              <PlayCircle className="size-3 text-white fill-white/20" />
            </div>
          </div>

          {/* Title Overlay */}
          <div className="absolute bottom-4 left-6">
            <h3 className="text-white font-medium text-lg drop-shadow-md">{title}</h3>
            <p className="text-white/70 text-sm">Official Trailer</p>
          </div>
        </div>
      ) : (
        // --- THE ACTUAL PLAYER ---
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
};

export default VideoMaskPlayer;