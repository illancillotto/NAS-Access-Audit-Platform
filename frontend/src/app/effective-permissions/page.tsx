"use client";

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { useDomainData } from "@/hooks/use-domain-data";
import { calculatePermissionPreview, getEffectivePermissions } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { EffectivePermission, EffectivePermissionPreview } from "@/types/api";

type AccessFilter = "all" | "read" | "write" | "denied";

export default function EffectivePermissionsPage() {
  const [permissions, setPermissions] = useState<EffectivePermission[]>([]);
  const [previewResults, setPreviewResults] = useState<EffectivePermissionPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [username, setUsername] = useState("admin");
  const [groups, setGroups] = useState("administrators");
  const [shareName, setShareName] = useState("EmailSaver");
  const [subjectType, setSubjectType] = useState("group");
  const [subjectName, setSubjectName] = useState("administrators");
  const [permissionLevel, setPermissionLevel] = useState("write");
  const [isDeny, setIsDeny] = useState(false);
  const { users, shares, error: domainError } = useDomainData();

  const deferredSearchTerm = useDeferredValue(searchTerm);

  function getUserLabel(userId: number): string {
    return users.find((user) => user.id === userId)?.username ?? String(userId);
  }

  function getShareLabel(shareId: number): string {
    return shares.find((share) => share.id === shareId)?.name ?? String(shareId);
  }

  useEffect(() => {
    async function loadPermissions() {
      const token = getStoredAccessToken();
      if (!token) return;

      try {
        setPermissions(await getEffectivePermissions(token));
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento permessi");
      }
    }

    void loadPermissions();
  }, []);

  async function handlePreview(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const token = getStoredAccessToken();

    if (!token) {
      setPreviewError("Accedi prima di eseguire una preview.");
      return;
    }

    try {
      const result = await calculatePermissionPreview(
        token,
        [
          {
            username,
            groups: groups
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          },
        ],
        [
          {
            share_name: shareName,
            subject_type: subjectType,
            subject_name: subjectName,
            permission_level: permissionLevel,
            is_deny: isDeny,
          },
        ],
      );

      setPreviewResults(result);
      setPreviewError(null);
    } catch (loadError) {
      setPreviewError(loadError instanceof Error ? loadError.message : "Errore preview permessi");
    }
  }

  const filteredPermissions = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return permissions.filter((permission) => {
      if (accessFilter === "read" && !permission.can_read) return false;
      if (accessFilter === "write" && !permission.can_write) return false;
      if (accessFilter === "denied" && !permission.is_denied) return false;

      if (!normalizedSearch) return true;

      return [
        getUserLabel(permission.nas_user_id),
        getShareLabel(permission.share_id),
        permission.source_summary,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [permissions, deferredSearchTerm, accessFilter, users, shares]);

  const readableCount = permissions.filter((permission) => permission.can_read).length;
  const writableCount = permissions.filter((permission) => permission.can_write).length;
  const deniedCount = permissions.filter((permission) => permission.is_denied).length;

  return (
    <ProtectedPage
      title="Permessi Effettivi"
      description="Analisi dei permessi persistiti e preview puntuale del permission engine."
    >
      <section className="stack">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Panoramica</h3>
              <p className="status-note">Controlla rapidamente accessi in lettura, scrittura e casi negati.</p>
            </div>
            <div className="badge">Record: {filteredPermissions.length}/{permissions.length}</div>
          </div>
          <div className="panel-grid">
            <article className="panel">
              <small>Permessi totali</small>
              <div className="metric">{permissions.length}</div>
            </article>
            <article className="panel">
              <small>Read</small>
              <div className="metric">{readableCount}</div>
            </article>
            <article className="panel">
              <small>Write</small>
              <div className="metric">{writableCount}</div>
            </article>
            <article className="panel">
              <small>Deny</small>
              <div className="metric">{deniedCount}</div>
            </article>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Filtri</h3>
              <p className="status-note">Ricerca su utente, share e fonte della regola.</p>
            </div>
          </div>
          <div className="filter-grid filter-grid-compact">
            <label>
              Cerca
              <input
                className="text-input"
                type="text"
                placeholder="Es. administrators, EmailSaver, deny"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <label>
              Accesso
              <select
                className="select-input"
                value={accessFilter}
                onChange={(event) => setAccessFilter(event.target.value as AccessFilter)}
              >
                <option value="all">Tutti</option>
                <option value="read">Con read</option>
                <option value="write">Con write</option>
                <option value="denied">Solo deny</option>
              </select>
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Preview Permission Engine</h3>
              <p className="status-note">Simula una regola singola contro `POST /permissions/calculate-preview`.</p>
            </div>
          </div>
          <form className="stack" onSubmit={(event) => void handlePreview(event)}>
            <div className="filter-grid">
              <label htmlFor="preview-username">
                Username
                <input
                  className="text-input"
                  id="preview-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
              <label htmlFor="preview-groups">
                Gruppi
                <input
                  className="text-input"
                  id="preview-groups"
                  value={groups}
                  onChange={(event) => setGroups(event.target.value)}
                />
              </label>
              <label htmlFor="preview-share">
                Share
                <input
                  className="text-input"
                  id="preview-share"
                  value={shareName}
                  onChange={(event) => setShareName(event.target.value)}
                />
              </label>
              <label htmlFor="preview-subject-type">
                Subject type
                <input
                  className="text-input"
                  id="preview-subject-type"
                  value={subjectType}
                  onChange={(event) => setSubjectType(event.target.value)}
                />
              </label>
              <label htmlFor="preview-subject-name">
                Subject name
                <input
                  className="text-input"
                  id="preview-subject-name"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                />
              </label>
              <label htmlFor="preview-level">
                Permission level
                <input
                  className="text-input"
                  id="preview-level"
                  value={permissionLevel}
                  onChange={(event) => setPermissionLevel(event.target.value)}
                />
              </label>
            </div>
            <label className="checkbox-row" htmlFor="preview-deny">
              <input
                id="preview-deny"
                type="checkbox"
                checked={isDeny}
                onChange={(event) => setIsDeny(event.target.checked)}
              />
              Regola deny
            </label>
            {previewError ? <p className="status-note error-text">{previewError}</p> : null}
            <div className="action-row">
              <button className="button" type="submit">
                Esegui preview
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <h3>Risultato Preview</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Utente</th>
                <th>Share</th>
                <th>Read</th>
                <th>Write</th>
                <th>Deny</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {previewResults.map((permission) => (
                <tr key={`${permission.username}-${permission.share_name}`}>
                  <td>{permission.username}</td>
                  <td>{permission.share_name}</td>
                  <td>{permission.can_read ? "Si" : "No"}</td>
                  <td>{permission.can_write ? "Si" : "No"}</td>
                  <td>{permission.is_denied ? "Si" : "No"}</td>
                  <td>{permission.source_summary}</td>
                </tr>
              ))}
              {previewResults.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nessuna preview eseguita.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>

      {error || domainError ? <p className="status-note error-text">{error ?? domainError}</p> : null}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Permessi Persistiti</h3>
            <p className="status-note">Tabella filtrabile dei permessi effettivi calcolati e persistiti nel backend.</p>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Utente NAS</th>
              <th>Share</th>
              <th>Read</th>
              <th>Write</th>
              <th>Deny</th>
              <th>Fonte</th>
            </tr>
          </thead>
          <tbody>
            {filteredPermissions.map((permission) => (
              <tr key={permission.id}>
                <td>{getUserLabel(permission.nas_user_id)}</td>
                <td>{getShareLabel(permission.share_id)}</td>
                <td>{permission.can_read ? "Si" : "No"}</td>
                <td>{permission.can_write ? "Si" : "No"}</td>
                <td>{permission.is_denied ? "Si" : "No"}</td>
                <td>{permission.source_summary}</td>
              </tr>
            ))}
            {filteredPermissions.length === 0 ? (
              <tr>
                <td colSpan={6}>Nessun permesso effettivo corrisponde ai filtri attivi.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </ProtectedPage>
  );
}
