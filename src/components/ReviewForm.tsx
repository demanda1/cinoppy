import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "@/components/StarRating";
import { postReview } from "@/lib/api";
import { signInAnonymously } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

interface ReviewFormProps {
  movieId: number;
  user: UserProfile | null;
  onUserChange: (user: UserProfile) => void;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({
  movieId,
  user,
  onUserChange,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let currentUser = user;
      if (!currentUser) {
        currentUser = await signInAnonymously();
        onUserChange(currentUser);
      }

      await postReview(movieId, rating, reviewText || undefined);
      setSuccess(true);
      setRating(0);
      setReviewText("");
      onReviewSubmitted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit review";
      if (message.includes("duplicate") || message.includes("unique")) {
        setError("You've already reviewed this movie");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl bg-cinoppy-green/10 border border-cinoppy-green/20 p-5">
        <p className="text-sm font-medium text-cinoppy-green">
          Review submitted! Thanks for sharing your thoughts.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border/30 p-5 space-y-4">
      <h3 className="font-semibold text-foreground">Share your thoughts</h3>

      {user ? (
        <p className="text-sm text-muted-foreground">
          Posting as{" "}
          <span className="font-medium text-cinoppy-purple">
            {user.is_anonymous ? "🎭" : "👤"} {user.display_name}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No account needed — you'll get a fun anonymous name when you submit!
        </p>
      )}

      <div>
        <p className="text-sm text-muted-foreground mb-2">Your rating</p>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Review <span className="text-xs text-muted-foreground/50">(optional)</span>
        </p>
        <Textarea
          placeholder="What did you think of this movie?"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={3}
          className="bg-secondary/50 border-border/50 placeholder:text-muted-foreground/30 focus-visible:ring-cinoppy-purple/50"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full bg-cinoppy-purple hover:bg-cinoppy-purple/80 text-white"
      >
        {submitting ? "Submitting..." : "Submit review"}
      </Button>
    </div>
  );
}