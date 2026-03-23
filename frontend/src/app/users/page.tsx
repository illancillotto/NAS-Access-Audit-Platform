"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { getNasUsers } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { NasUser } from "@/types/api";

type ActivityFilter = "all" | "active" | "inactive";

export default function UsersPage() {
  const [users, setUsers] = useState<NasUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    async function loadUsers() {
      const token = getStoredAccessToken();
      if (!token) return;

      try {
        setUsers(await getNasUsers(token));
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento utenti");
      }
    }

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return users
      .filter((user) => {
        if (activityFilter === "active" && !user.is_active) return false;
        if (activityFilter === "inactive" && user.is_active) return false;

        if (!normalizedSearch) return true;

        const searchableValues = [
          user.username,
          user.full_name ?? "",
          user.source_uid ?? "",
        ];

        return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((left, right) => left.username.localeCompare(right.username, "it"));
  }, [users, deferredSearchTerm, activityFilter]);

  const activeUsers = users.filter((user) => user.is_active).length;
  const filteredOutUsers = users.length - filteredUsers.length;

  return (
    <ProtectedPage
      title="Utenti NAS"
      description="Elenco utenti sincronizzati dal NAS con strumenti rapidi di ricerca e filtro operativo."
    >
      {error ? <p className="status-note error-text">{error}</p> : null}

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Panoramica</h3>
            <p className="status-note">Usa i filtri per isolare rapidamente utenti attivi, incompleti o da verificare.</p>
          </div>
          <div className="badge">Record: {filteredUsers.length}/{users.length}</div>
        </div>
        <div className="panel-grid">
          <article className="panel">
            <small>Utenti totali</small>
            <div className="metric">{users.length}</div>
          </article>
          <article className="panel">
            <small>Utenti attivi</small>
            <div className="metric">{activeUsers}</div>
          </article>
          <article className="panel">
            <small>Con snapshot</small>
            <div className="metric">{users.filter((user) => user.last_seen_snapshot_id != null).length}</div>
          </article>
          <article className="panel">
            <small>Filtrati fuori</small>
            <div className="metric">{filteredOutUsers}</div>
          </article>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Filtri</h3>
            <p className="status-note">Ricerca su username, nome completo e UID.</p>
          </div>
        </div>
        <div className="filter-grid filter-grid-compact">
          <label>
            Cerca
            <input
              className="text-input"
              type="text"
              placeholder="Es. svc_naap, Mario, 1090"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label>
            Stato
            <select
              className="select-input"
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)}
            >
              <option value="all">Tutti</option>
              <option value="active">Solo attivi</option>
              <option value="inactive">Solo inattivi</option>
            </select>
          </label>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Elenco Utenti</h3>
            <p className="status-note">
              Vista ordinata alfabeticamente. Le colonne principali sono pensate per controlli rapidi su identità e stato.
            </p>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Utente</th>
              <th>UID</th>
              <th>Snapshot</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="entity-cell">
                    <strong>{user.username}</strong>
                    <span>{user.full_name ?? "Nome non disponibile"}</span>
                  </div>
                </td>
                <td className="mono">{user.source_uid ?? "-"}</td>
                <td className="mono">{user.last_seen_snapshot_id ?? "-"}</td>
                <td>
                  <span className={`status-pill ${user.is_active ? "status-ok" : "status-warn"}`}>
                    {user.is_active ? "Attivo" : "Inattivo"}
                  </span>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4}>Nessun utente NAS corrisponde ai filtri attivi.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </ProtectedPage>
  );
}
