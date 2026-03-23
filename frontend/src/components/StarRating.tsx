import { useState } from "react";

interface StarRatingProps {
  value: number;              // Current rating (0.5 to 5)
  onChange?: (val: number) => void;  // If provided, stars are clickable
  size?: "sm" | "md" | "lg";
}

export default function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  const interactive = !!onChange;

  const sizeClass = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];

  // Build 5 stars, each split into left half and right half
  // Left half = x.0 rating, right half = x.5 rating... wait
  // Actually: left half of star N = (N - 0.5), right half = N
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const leftValue = i - 0.5;
    const rightValue = i;

    // Determine fill state for this star
    let fill: "full" | "half" | "empty" = "empty";
    if (displayValue >= rightValue) {
      fill = "full";
    } else if (displayValue >= leftValue) {
      fill = "half";
    }

    stars.push(
      <span
        key={i}
        className={`relative inline-block ${sizeClass} ${interactive ? "cursor-pointer" : ""} select-none`}
        onMouseLeave={interactive ? () => setHoverValue(null) : undefined}
      >
        {/* Left half — hovering/clicking gives x.5 rating */}
        <span
          className="absolute inset-0 w-1/2 overflow-hidden z-10"
          onMouseEnter={interactive ? () => setHoverValue(leftValue) : undefined}
          onClick={interactive ? () => onChange(leftValue) : undefined}
        >
          &nbsp;
        </span>

        {/* Right half — hovering/clicking gives x.0 rating */}
        <span
          className="absolute inset-0 left-1/2 w-1/2 z-10"
          onMouseEnter={interactive ? () => setHoverValue(rightValue) : undefined}
          onClick={interactive ? () => onChange(rightValue) : undefined}
        >
          &nbsp;
        </span>

        {/* Star visual */}
        <span className={fill === "empty" ? "text-gray-300" : "text-amber-400"}>
          {fill === "full" ? "★" : fill === "half" ? "★" : "☆"}
        </span>

        {/* Half-star overlay for half-filled state */}
        {fill === "half" && (
          <span
            className="absolute inset-0 overflow-hidden text-amber-400"
            style={{ width: "50%" }}
          >
            ★
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHoverValue(null)}>
      {stars}
      {value > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
      )}
    </div>
  );
}
