"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { ProtectedPage } from "@/components/app/protected-page";
import { BatchProgress } from "@/components/catasto/batch-progress";
import { CaptchaDialog } from "@/components/catasto/captcha-dialog";
import { CatastoStatusBadge } from "@/components/catasto/status-badge";
import {
  createCatastoBatchWebSocket,
  fetchCatastoCaptchaImageBlob,
  getCatastoBatch,
  solveCatastoCaptcha,
  skipCatastoCaptcha,
} from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import { formatDateTime } from "@/lib/presentation";
import type { CatastoBatchDetail } from "@/types/api";

export default function CatastoBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;
  const [batch, setBatch] = useState<CatastoBatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string | null>(null);

  const loadBatch = useCallback(async (): Promise<void> => {
    const token = getStoredAccessToken();
    if (!token || !batchId) return;

    try {
      const result = await getCatastoBatch(token, batchId);
      setBatch(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Errore caricamento batch");
    }
  }, [batchId]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token || !batchId) return;

    const socket = createCatastoBatchWebSocket(batchId, token);
    if (!socket) return;

    socket.onmessage = () => {
      void loadBatch();
    };

    return () => {
      socket.close();
    };
  }, [batchId, loadBatch]);

  const activeCaptchaRequest =
    batch?.requests.find((request) => request.status === "awaiting_captcha") ?? null;

  useEffect(() => {
    const token = getStoredAccessToken();
    const requestId = activeCaptchaRequest?.id ?? null;

    if (!token || !requestId) {
      setCaptchaImageUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const safeToken: string = token;
    const safeRequestId: string = requestId;
    let cancelled = false;

    async function loadCaptchaImage(): Promise<void> {
      try {
        const blob = await fetchCatastoCaptchaImageBlob(safeToken, safeRequestId);
        const nextUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        setCaptchaImageUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return nextUrl;
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Errore caricamento immagine CAPTCHA");
          setCaptchaImageUrl((current) => {
            if (current) {
              URL.revokeObjectURL(current);
            }
            return null;
          });
        }
      }
    }

    void loadCaptchaImage();

    return () => {
      cancelled = true;
    };
  }, [activeCaptchaRequest]);

  useEffect(() => {
    return () => {
      if (captchaImageUrl) {
        URL.revokeObjectURL(captchaImageUrl);
      }
    };
  }, [captchaImageUrl]);

  async function handleSolveCaptcha(value: string): Promise<void> {
    const token = getStoredAccessToken();
    if (!token || !activeCaptchaRequest) return;

    setCaptchaBusy(true);
    try {
      await solveCatastoCaptcha(token, activeCaptchaRequest.id, value);
      await loadBatch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Errore invio CAPTCHA");
    } finally {
      setCaptchaBusy(false);
    }
  }

  async function handleSkipCaptcha(): Promise<void> {
    const token = getStoredAccessToken();
    if (!token || !activeCaptchaRequest) return;

    setCaptchaBusy(true);
    try {
      await skipCatastoCaptcha(token, activeCaptchaRequest.id);
      await loadBatch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Errore skip CAPTCHA");
    } finally {
      setCaptchaBusy(false);
    }
  }

  return (
    <ProtectedPage
      title="Dettaglio batch Catasto"
      description="Progress realtime, stato per riga e gestione manuale dei CAPTCHA richiesti dal worker."
      breadcrumb="Catasto / Batch detail"
    >
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {batch ? (
        <>
          <BatchProgress batch={batch} />

          <article className="panel-card overflow-hidden p-0">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="section-title">{batch.name ?? batch.id}</p>
              <p className="section-copy">
                Creato {formatDateTime(batch.created_at)} · Avvio {formatDateTime(batch.started_at)} · Chiusura {formatDateTime(batch.completed_at)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Riga</th>
                    <th>Comune</th>
                    <th>Riferimento</th>
                    <th>Stato</th>
                    <th>Operazione</th>
                    <th>Errore</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.requests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.row_index}</td>
                      <td>{request.comune}</td>
                      <td>
                        Fg.{request.foglio} Part.{request.particella}
                        {request.subalterno ? ` Sub.${request.subalterno}` : ""}
                        <br />
                        <span className="text-xs text-gray-400">{request.tipo_visura}</span>
                      </td>
                      <td><CatastoStatusBadge status={request.status} /></td>
                      <td>{request.current_operation ?? "—"}</td>
                      <td className="text-xs text-gray-500">{request.error_message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : (
        <article className="panel-card">
          <p className="section-copy">Caricamento batch in corso.</p>
        </article>
      )}

      <CaptchaDialog
        busy={captchaBusy}
        imageUrl={captchaImageUrl}
        open={Boolean(activeCaptchaRequest)}
        onSkip={handleSkipCaptcha}
        onSolve={handleSolveCaptcha}
        requestLabel={
          activeCaptchaRequest
            ? `${activeCaptchaRequest.comune} · Fg.${activeCaptchaRequest.foglio} Part.${activeCaptchaRequest.particella}`
            : null
        }
      />
    </ProtectedPage>
  );
}
