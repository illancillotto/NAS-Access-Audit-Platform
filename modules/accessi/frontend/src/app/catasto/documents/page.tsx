"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { ProtectedPage } from "@/components/app/protected-page";
import { DataTable } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
import { downloadCatastoDocumentBlob, getCatastoDocuments } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import { formatDateTime } from "@/lib/presentation";
import type { CatastoDocument } from "@/types/api";

type FilterState = {
  comune: string;
  foglio: string;
  particella: string;
  createdFrom: string;
  createdTo: string;
};

const EMPTY_FILTERS: FilterState = {
  comune: "",
  foglio: "",
  particella: "",
  createdFrom: "",
  createdTo: "",
};

function toStartOfDay(value: string): string | undefined {
  return value ? `${value}T00:00:00` : undefined;
}

function toEndOfDay(value: string): string | undefined {
  return value ? `${value}T23:59:59` : undefined;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CatastoDocumentsPage() {
  const [documents, setDocuments] = useState<CatastoDocument[]>([]);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    void loadDocuments(EMPTY_FILTERS);
  }, []);

  async function loadDocuments(nextFilters: FilterState): Promise<void> {
    const token = getStoredAccessToken();
    if (!token) return;

    setBusy(true);
    try {
      const result = await getCatastoDocuments(token, {
        comune: nextFilters.comune,
        foglio: nextFilters.foglio,
        particella: nextFilters.particella,
        created_from: toStartOfDay(nextFilters.createdFrom),
        created_to: toEndOfDay(nextFilters.createdTo),
      });
      setDocuments(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Errore caricamento archivio documenti");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(documentItem: CatastoDocument): Promise<void> {
    const token = getStoredAccessToken();
    if (!token) return;

    setDownloadingId(documentItem.id);
    try {
      const blob = await downloadCatastoDocumentBlob(token, documentItem.id);
      triggerDownload(blob, documentItem.filename);
      setError(null);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Errore download PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  const columns = useMemo<ColumnDef<CatastoDocument>[]>(
    () => [
      {
        header: "Comune",
        accessorKey: "comune",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-[#1D4E35]">{row.original.comune}</p>
            <p className="text-xs text-gray-400">{row.original.catasto}</p>
          </div>
        ),
      },
      {
        header: "Riferimento",
        accessorKey: "particella",
        cell: ({ row }) => (
          <div className="text-sm text-gray-700">
            Fg.{row.original.foglio} Part.{row.original.particella}
            {row.original.subalterno ? ` Sub.${row.original.subalterno}` : ""}
          </div>
        ),
      },
      {
        header: "Tipo visura",
        accessorKey: "tipo_visura",
        cell: ({ row }) => <span className="text-sm text-gray-700">{row.original.tipo_visura}</span>,
      },
      {
        header: "Creato",
        accessorKey: "created_at",
        cell: ({ row }) => <span className="text-sm text-gray-700">{formatDateTime(row.original.created_at)}</span>,
      },
      {
        header: "Documento",
        accessorKey: "filename",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Link className="text-sm font-medium text-[#1D4E35]" href={`/catasto/documents/${row.original.id}`}>
              Apri viewer
            </Link>
            <button
              className="text-sm text-gray-500 transition hover:text-gray-800"
              disabled={downloadingId === row.original.id}
              onClick={() => void handleDownload(row.original)}
              type="button"
            >
              {downloadingId === row.original.id ? "Download..." : "Scarica"}
            </button>
          </div>
        ),
      },
    ],
    [downloadingId],
  );

  return (
    <ProtectedPage
      title="Archivio documenti"
      description="Ricerca le visure scaricate dal worker e apri il PDF direttamente nel browser."
      breadcrumb="Catasto / Documenti"
    >
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <article className="panel-card">
        <div className="mb-4">
          <p className="section-title">Filtri archivio</p>
          <p className="section-copy">Ricerca per comune, foglio, particella e intervallo data.</p>
        </div>
        <TableFilters>
          <label className="text-sm font-medium text-gray-700">
            Comune
            <input
              className="form-control mt-1"
              onChange={(event) => setFilters((current) => ({ ...current, comune: event.target.value }))}
              placeholder="Es. Oristano"
              value={filters.comune}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Foglio
            <input
              className="form-control mt-1"
              inputMode="numeric"
              onChange={(event) => setFilters((current) => ({ ...current, foglio: event.target.value }))}
              placeholder="Es. 5"
              value={filters.foglio}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Particella
            <input
              className="form-control mt-1"
              inputMode="numeric"
              onChange={(event) => setFilters((current) => ({ ...current, particella: event.target.value }))}
              placeholder="Es. 120"
              value={filters.particella}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Data da
            <input
              className="form-control mt-1"
              onChange={(event) => setFilters((current) => ({ ...current, createdFrom: event.target.value }))}
              type="date"
              value={filters.createdFrom}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Data a
            <input
              className="form-control mt-1"
              onChange={(event) => setFilters((current) => ({ ...current, createdTo: event.target.value }))}
              type="date"
              value={filters.createdTo}
            />
          </label>
        </TableFilters>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={busy} onClick={() => void loadDocuments(filters)} type="button">
            {busy ? "Ricerca..." : "Applica filtri"}
          </button>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              void loadDocuments(EMPTY_FILTERS);
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </article>

      <article className="panel-card overflow-hidden p-0">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="section-title">Visure archiviate</p>
          <p className="section-copy">Tabella documentale con apertura viewer e download inline.</p>
        </div>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={documents}
            emptyTitle="Nessun documento trovato"
            emptyDescription="Non ci sono visure che corrispondono ai filtri correnti."
            initialPageSize={12}
          />
        </div>
      </article>
    </ProtectedPage>
  );
}
