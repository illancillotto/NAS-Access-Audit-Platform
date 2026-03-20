"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { getNasGroups } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { NasGroup } from "@/types/api";

export default function GroupsPage() {
  const [groups, setGroups] = useState<NasGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ProtectedPage
      title="Gruppi NAS"
      description="Vista reale dei gruppi NAS attualmente esposti dal backend."
    >
      {error ? <p className="status-note error-text">{error}</p> : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrizione</th>
            <th>Ultimo snapshot</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <td>{group.name}</td>
              <td>{group.description ?? "-"}</td>
              <td>{group.last_seen_snapshot_id ?? "-"}</td>
            </tr>
          ))}
          {groups.length === 0 ? (
            <tr>
              <td colSpan={3}>Nessun gruppo NAS disponibile nel backend.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </ProtectedPage>
  );
}
