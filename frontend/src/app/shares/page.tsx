"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { getShares } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { Share } from "@/types/api";

type SectorFilter = "all" | "with-sector" | "without-sector";

export default function SharesPage() {
  const [shares, setShares] = useState<Share[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("all");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    async function loadShares() {
      const token = getStoredAccessToken();
      if (!token) return;

      try {
        setShares(await getShares(token));
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento share");
      }
    }

    void loadShares();
  }, []);

  const filteredShares = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return shares
      .filter((share) => {
        if (sectorFilter === "with-sector" && !share.sector) return false;
        if (sectorFilter === "without-sector" && share.sector) return false;

        if (!normalizedSearch) return true;

        return [share.name, share.path, share.sector ?? "", share.description ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      })
      .sort((left, right) => left.name.localeCompare(right.name, "it"));
  }, [shares, deferredSearchTerm, sectorFilter]);

  const sharesWithSector = shares.filter((share) => Boolean(share.sector)).length;
  const sharesWithDescription = shares.filter((share) => Boolean(share.description)).length;

  return (
    <ProtectedPage
      title="Share NAS"
      description="Vista operativa delle cartelle condivise con filtri su settore, path e descrizione."
    >
      {error ? <p className="status-note error-text">{error}</p> : null}

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Panoramica</h3>
            <p className="status-note">Individua rapidamente share senza classificazione o con naming da verificare.</p>
          </div>
          <div className="badge">Record: {filteredShares.length}/{shares.length}</div>
        </div>
        <div className="panel-grid">
          <article className="panel">
            <small>Share totali</small>
            <div className="metric">{shares.length}</div>
          </article>
          <article className="panel">
            <small>Con settore</small>
            <div className="metric">{sharesWithSector}</div>
          </article>
          <article className="panel">
            <small>Con descrizione</small>
            <div className="metric">{sharesWithDescription}</div>
          </article>
          <article className="panel">
            <small>Filtrate</small>
            <div className="metric">{shares.length - filteredShares.length}</div>
          </article>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Filtri</h3>
            <p className="status-note">Ricerca su nome, path, settore e descrizione.</p>
          </div>
        </div>
        <div className="filter-grid filter-grid-compact">
          <label>
            Cerca
            <input
              className="text-input"
              type="text"
              placeholder="Es. EmailSaver, /volume1, legali"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label>
            Settore
            <select
              className="select-input"
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value as SectorFilter)}
            >
              <option value="all">Tutte</option>
              <option value="with-sector">Con settore</option>
              <option value="without-sector">Senza settore</option>
            </select>
          </label>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Elenco Share</h3>
            <p className="status-note">Layout pensato per verifiche rapide su naming, destinazione e classificazione funzionale.</p>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Share</th>
              <th>Path</th>
              <th>Settore</th>
              <th>Descrizione</th>
              <th>Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {filteredShares.map((share) => (
              <tr key={share.id}>
                <td>
                  <div className="entity-cell">
                    <strong>{share.name}</strong>
                    <span>ID #{share.id}</span>
                  </div>
                </td>
                <td className="mono">{share.path}</td>
                <td>{share.sector ?? "-"}</td>
                <td>{share.description ?? "-"}</td>
                <td className="mono">{share.last_seen_snapshot_id ?? "-"}</td>
              </tr>
            ))}
            {filteredShares.length === 0 ? (
              <tr>
                <td colSpan={5}>Nessuna share corrisponde ai filtri attivi.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </ProtectedPage>
  );
}
