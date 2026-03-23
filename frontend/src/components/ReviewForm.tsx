import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import StarRating from "@/components/StarRating";
import { postReview } from "@/lib/api";
import { signInAnonymously, getCurrentUser } from "@/lib/auth";
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
      // If user is not logged in, create anonymous account
      let currentUser = user;
      if (!currentUser) {
        currentUser = await signInAnonymously();
        onUserChange(currentUser);
      }

      // Submit the review
      await postReview(movieId, rating, reviewText || undefined);
      setSuccess(true);
      setRating(0);
      setReviewText("");
      onReviewSubmitted(); // Refresh the reviews list
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit review";
      // Handle duplicate review error
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
      <Card className="p-5 bg-green-500/10 border-green-500/20">
        <p className="text-sm font-medium text-green-600">
          Review submitted! Thanks for sharing your thoughts.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setSuccess(false)}
        >
          Write another review? Just kidding — one per movie!
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-semibold">Share your thoughts</h3>

      {/* Show anonymous username message */}
      {!user ? (
        <p className="text-sm text-muted-foreground">
          No account needed — we'll give you a fun anonymous name!
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Reviewing as{" "}
          <span className="font-medium text-purple-500">
            {user.is_anonymous ? "🎭" : "👤"} {user.display_name}
          </span>
        </p>
      )}

      {/* Star rating picker */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Your rating</p>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      {/* Optional review text */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Review <span className="text-xs">(optional)</span>
        </p>
        <Textarea
          placeholder="What did you think of this movie?"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={3}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full"
      >
        {submitting
          ? "Submitting..."
          : !user
            ? "Submit as anonymous"
            : "Submit review"
        }
      </Button>
    </Card>
  );
}