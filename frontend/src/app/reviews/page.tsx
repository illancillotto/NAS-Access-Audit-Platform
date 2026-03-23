"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { useDomainData } from "@/hooks/use-domain-data";
import { getReviews } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { Review } from "@/types/api";

type DecisionFilter = "all" | "approved" | "revoked" | "pending";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const { users, shares, error: domainError } = useDomainData();

  const deferredSearchTerm = useDeferredValue(searchTerm);

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

  const filteredReviews = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return reviews.filter((review) => {
      if (decisionFilter !== "all" && review.decision !== decisionFilter) return false;

      if (!normalizedSearch) return true;

      return [
        getUserLabel(review.nas_user_id),
        getShareLabel(review.share_id),
        review.decision,
        review.note ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [reviews, deferredSearchTerm, decisionFilter, users, shares]);

  const approvedCount = reviews.filter((review) => review.decision === "approved").length;
  const revokedCount = reviews.filter((review) => review.decision === "revoked").length;
  const withNoteCount = reviews.filter((review) => Boolean(review.note)).length;

  return (
    <ProtectedPage
      title="Review Accessi"
      description="Monitoraggio review applicative con filtri rapidi su decisione, utente e share."
    >
      {error || domainError ? <p className="status-note error-text">{error ?? domainError}</p> : null}

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Panoramica</h3>
            <p className="status-note">Vista sintetica delle review approvate, revocate e annotate.</p>
          </div>
          <div className="badge">Record: {filteredReviews.length}/{reviews.length}</div>
        </div>
        <div className="panel-grid">
          <article className="panel">
            <small>Review totali</small>
            <div className="metric">{reviews.length}</div>
          </article>
          <article className="panel">
            <small>Approvate</small>
            <div className="metric">{approvedCount}</div>
          </article>
          <article className="panel">
            <small>Revocate</small>
            <div className="metric">{revokedCount}</div>
          </article>
          <article className="panel">
            <small>Con nota</small>
            <div className="metric">{withNoteCount}</div>
          </article>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Filtri</h3>
            <p className="status-note">Ricerca su utente, share, decisione e nota.</p>
          </div>
        </div>
        <div className="filter-grid filter-grid-compact">
          <label>
            Cerca
            <input
              className="text-input"
              type="text"
              placeholder="Es. AlessandroPorcu, EmailSaver, approved"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label>
            Decisione
            <select
              className="select-input"
              value={decisionFilter}
              onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}
            >
              <option value="all">Tutte</option>
              <option value="approved">Approved</option>
              <option value="revoked">Revoked</option>
              <option value="pending">Pending</option>
            </select>
          </label>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Elenco Review</h3>
            <p className="status-note">La decisione è evidenziata per facilitare il triage operativo.</p>
          </div>
        </div>
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
            {filteredReviews.map((review) => (
              <tr key={review.id}>
                <td className="mono">{review.id}</td>
                <td>{getUserLabel(review.nas_user_id)}</td>
                <td>{getShareLabel(review.share_id)}</td>
                <td>
                  <span className={`status-pill ${review.decision === "approved" ? "status-ok" : "status-warn"}`}>
                    {review.decision}
                  </span>
                </td>
                <td>{review.note ?? "-"}</td>
              </tr>
            ))}
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan={5}>Nessuna review corrisponde ai filtri attivi.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </ProtectedPage>
  );
}
