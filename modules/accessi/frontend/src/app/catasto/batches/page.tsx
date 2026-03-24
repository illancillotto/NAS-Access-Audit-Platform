"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/app/protected-page";
import { CatastoStatusBadge } from "@/components/catasto/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIcon } from "@/components/ui/icons";
import { getCatastoBatches } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import { formatDateTime } from "@/lib/presentation";
import type { CatastoBatch } from "@/types/api";

export default function CatastoBatchesPage() {
  const [batches, setBatches] = useState<CatastoBatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBatches() {
      const token = getStoredAccessToken();
      if (!token) return;

      try {
        const result = await getCatastoBatches(token);
        setBatches(result);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento batch");
      }
    }

    void loadBatches();
  }, []);

  return (
    <ProtectedPage
      title="Storico batch Catasto"
      description="Lista dei lotti visure con stato corrente, progresso e ultimo messaggio operativo."
      breadcrumb="Catasto / Batch"
    >
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <article className="panel-card overflow-hidden p-0">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="section-title">Batch utente</p>
          <p className="section-copy">Monitoraggio dei lotti creati nel modulo Catasto.</p>
        </div>
        {batches.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={SearchIcon} title="Nessun batch presente" description="Crea il primo lotto da /catasto/new-batch." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Stato</th>
                  <th>Totale</th>
                  <th>Operazione</th>
                  <th>Creato</th>
                  <th>Dettaglio</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>{batch.name ?? batch.id}</td>
                    <td><CatastoStatusBadge status={batch.status} /></td>
                    <td>{batch.total_items}</td>
                    <td>{batch.current_operation ?? "—"}</td>
                    <td>{formatDateTime(batch.created_at)}</td>
                    <td>
                      <Link className="font-medium text-[#1D4E35]" href={`/catasto/batches/${batch.id}`}>
                        Apri
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </ProtectedPage>
  );
}
