"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { getNasUsers } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { NasUser } from "@/types/api";

export default function UsersPage() {
  const [users, setUsers] = useState<NasUser[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ProtectedPage
      title="Utenti NAS"
      description="Vista reale degli utenti NAS attualmente esposti dal backend."
    >
      {error ? <p className="status-note error-text">{error}</p> : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Nome completo</th>
            <th>Email</th>
            <th>UID</th>
            <th>Attivo</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.full_name ?? "-"}</td>
              <td>{user.email ?? "-"}</td>
              <td>{user.source_uid ?? "-"}</td>
              <td>{user.is_active ? "Si" : "No"}</td>
            </tr>
          ))}
          {users.length === 0 ? (
            <tr>
              <td colSpan={5}>Nessun utente NAS disponibile nel backend.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </ProtectedPage>
  );
}
