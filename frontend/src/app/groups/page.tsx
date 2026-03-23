"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { getNasGroups } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { NasGroup } from "@/types/api";

type SnapshotFilter = "all" | "with-snapshot" | "without-snapshot";

export default function GroupsPage() {
  const [groups, setGroups] = useState<NasGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [snapshotFilter, setSnapshotFilter] = useState<SnapshotFilter>("all");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    async function loadGroups() {
      const token = getStoredAccessToken();
      if (!token) return;

      try {
        setGroups(await getNasGroups(token));
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento gruppi");
      }
    }

    void loadGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return groups
      .filter((group) => {
        if (snapshotFilter === "with-snapshot" && group.last_seen_snapshot_id == null) return false;
        if (snapshotFilter === "without-snapshot" && group.last_seen_snapshot_id != null) return false;

        if (!normalizedSearch) return true;

        return [group.name, group.description ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      })
      .sort((left, right) => left.name.localeCompare(right.name, "it"));
  }, [groups, deferredSearchTerm, snapshotFilter]);

  const groupsWithDescription = groups.filter((group) => Boolean(group.description)).length;
  const groupsWithSnapshot = groups.filter((group) => group.last_seen_snapshot_id != null).length;

  return (
    <ProtectedPage
      title="Gruppi NAS"
      description="Elenco gruppi sincronizzati dal NAS con filtri rapidi per descrizione e ultimo snapshot."
    >
      {error ? <p className="status-note error-text">{error}</p> : null}

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Panoramica</h3>
            <p className="status-note">Controlla rapidamente consistenza descrittiva e presenza nei cicli di sync.</p>
          </div>
          <div className="badge">Record: {filteredGroups.length}/{groups.length}</div>
        </div>
        <div className="panel-grid">
          <article className="panel">
            <small>Gruppi totali</small>
            <div className="metric">{groups.length}</div>
          </article>
          <article className="panel">
            <small>Con descrizione</small>
            <div className="metric">{groupsWithDescription}</div>
          </article>
          <article className="panel">
            <small>Con snapshot</small>
            <div className="metric">{groupsWithSnapshot}</div>
          </article>
          <article className="panel">
            <small>Filtrati</small>
            <div className="metric">{groups.length - filteredGroups.length}</div>
          </article>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Filtri</h3>
            <p className="status-note">Ricerca su nome e descrizione del gruppo.</p>
          </div>
        </div>
        <div className="filter-grid filter-grid-compact">
          <label>
            Cerca
            <input
              className="text-input"
              type="text"
              placeholder="Es. administrators, protocollo"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label>
            Snapshot
            <select
              className="select-input"
              value={snapshotFilter}
              onChange={(event) => setSnapshotFilter(event.target.value as SnapshotFilter)}
            >
              <option value="all">Tutti</option>
              <option value="with-snapshot">Con snapshot</option>
              <option value="without-snapshot">Senza snapshot</option>
            </select>
          </label>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Elenco Gruppi</h3>
            <p className="status-note">Vista ordinata alfabeticamente con focus operativo su descrizione e presenza nel dominio corrente.</p>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Gruppo</th>
              <th>Descrizione</th>
              <th>Ultimo snapshot</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((group) => (
              <tr key={group.id}>
                <td>
                  <div className="entity-cell">
                    <strong>{group.name}</strong>
                    <span>ID #{group.id}</span>
                  </div>
                </td>
                <td>{group.description ?? "-"}</td>
                <td className="mono">{group.last_seen_snapshot_id ?? "-"}</td>
              </tr>
            ))}
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={3}>Nessun gruppo NAS corrisponde ai filtri attivi.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </ProtectedPage>
  );
}
