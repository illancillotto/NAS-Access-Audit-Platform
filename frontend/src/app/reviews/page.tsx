"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { getReviews } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import { useDomainData } from "@/hooks/use-domain-data";
import type { Review } from "@/types/api";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { users, shares, error: domainError } = useDomainData();

  function getUserLabel(userId: number): string {
    return users.find((user) => user.id === userId)?.username ?? String(userId);
  }

  function getShareLabel(shareId: number): string {
    return shares.find((share) => share.id === shareId)?.name ?? String(shareId);
  }

  useEffect(() => {
    async function loadReviews() {
      const token = getStoredAccessToken();
      if (!token) return;

      try {
        setReviews(await getReviews(token));
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento review");
      }
    }

    void loadReviews();
  }, []);

  return (
    <ProtectedPage
      title="Review Accessi"
      description="Vista reale delle review applicative attualmente persistite nel backend."
    >
      {error || domainError ? <p className="status-note error-text">{error ?? domainError}</p> : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Utente NAS</th>
            <th>Share</th>
            <th>Decisione</th>
            <th>Nota</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id}>
              <td>{review.id}</td>
              <td>{getUserLabel(review.nas_user_id)}</td>
              <td>{getShareLabel(review.share_id)}</td>
              <td>{review.decision}</td>
              <td>{review.note ?? "-"}</td>
            </tr>
          ))}
          {reviews.length === 0 ? (
            <tr>
              <td colSpan={5}>Nessuna review disponibile nel backend.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </ProtectedPage>
  );
}
