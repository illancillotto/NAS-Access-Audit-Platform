"use client";

import { FormEvent, useEffect, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { calculatePermissionPreview, getEffectivePermissions } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { EffectivePermission, EffectivePermissionPreview } from "@/types/api";

export default function EffectivePermissionsPage() {
  const [permissions, setPermissions] = useState<EffectivePermission[]>([]);
  const [previewResults, setPreviewResults] = useState<EffectivePermissionPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [username, setUsername] = useState("mrossi");
  const [groups, setGroups] = useState("amministrazione");
  const [shareName, setShareName] = useState("contabilita");
  const [subjectType, setSubjectType] = useState("group");
  const [subjectName, setSubjectName] = useState("amministrazione");
  const [permissionLevel, setPermissionLevel] = useState("write");
  const [isDeny, setIsDeny] = useState(false);

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

  return (
    <ProtectedPage
      title="Permessi Effettivi"
      description="Vista reale dei permessi effettivi già persistiti nel backend."
    >
      <section className="stack">
        <article className="panel">
          <h3>Preview permission engine</h3>
          <p className="status-note">
            Esegue una preview contro `POST /permissions/calculate-preview` con input inserito nella UI.
          </p>
          <form className="stack" onSubmit={(event) => void handlePreview(event)}>
            <label htmlFor="preview-username">
              Username
              <input
                id="preview-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label htmlFor="preview-groups">
              Gruppi separati da virgola
              <input
                id="preview-groups"
                value={groups}
                onChange={(event) => setGroups(event.target.value)}
              />
            </label>
            <label htmlFor="preview-share">
              Share
              <input
                id="preview-share"
                value={shareName}
                onChange={(event) => setShareName(event.target.value)}
              />
            </label>
            <label htmlFor="preview-subject-type">
              Subject type
              <input
                id="preview-subject-type"
                value={subjectType}
                onChange={(event) => setSubjectType(event.target.value)}
              />
            </label>
            <label htmlFor="preview-subject-name">
              Subject name
              <input
                id="preview-subject-name"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
              />
            </label>
            <label htmlFor="preview-level">
              Permission level
              <input
                id="preview-level"
                value={permissionLevel}
                onChange={(event) => setPermissionLevel(event.target.value)}
              />
            </label>
            <label htmlFor="preview-deny">
              Regola deny
              <input
                id="preview-deny"
                type="checkbox"
                checked={isDeny}
                onChange={(event) => setIsDeny(event.target.checked)}
              />
            </label>
            {previewError ? <p className="status-note error-text">{previewError}</p> : null}
            <button className="button" type="submit">
              Esegui preview
            </button>
          </form>
        </article>

        <article className="panel">
          <h3>Risultato preview</h3>
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

      {error ? <p className="status-note error-text">{error}</p> : null}
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
          {permissions.map((permission) => (
            <tr key={permission.id}>
              <td>{permission.nas_user_id}</td>
              <td>{permission.share_id}</td>
              <td>{permission.can_read ? "Si" : "No"}</td>
              <td>{permission.can_write ? "Si" : "No"}</td>
              <td>{permission.is_denied ? "Si" : "No"}</td>
              <td>{permission.source_summary}</td>
            </tr>
          ))}
          {permissions.length === 0 ? (
            <tr>
              <td colSpan={6}>Nessun permesso effettivo persistito nel backend.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </ProtectedPage>
  );
}
