interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  size?: "sm" | "md" | "lg";
}

export default function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const interactive = !!onChange;

  const sizeClass = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];

  // Build 10 clickable half-star slots (0.5, 1.0, 1.5, ... 5.0)
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = value >= i;
    const halfFilled = !filled && value >= i - 0.5;

    stars.push(
      <span key={i} className={`relative inline-block ${sizeClass} select-none`}>
        {/* Empty star base */}
        <span className="text-gray-300">☆</span>

        {/* Filled overlay */}
        {(filled || halfFilled) && (
          <span
            className="absolute inset-0 overflow-hidden text-amber-400"
            style={{ width: filled ? "100%" : "50%" }}
          >
            ★
          </span>
        )}

        {/* Click targets (only when interactive) */}
        {interactive && (
          <>
            <span
              className="absolute inset-0 w-1/2 z-10 cursor-pointer"
              onClick={() => onChange(i - 0.5)}
            />
            <span
              className="absolute inset-0 left-1/2 w-1/2 z-10 cursor-pointer"
              onClick={() => onChange(i)}
            />
          </>
        )}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      {value > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
      )}
    </div>
  );
}