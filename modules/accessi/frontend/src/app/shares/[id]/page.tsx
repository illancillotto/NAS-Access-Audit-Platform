"use client";

import { useParams } from "next/navigation";

import { ProtectedPage } from "@/components/app/protected-page";
import { ShareDetailPanel } from "@/components/app/share-detail-panel";

export default function ShareDetailPage() {
  const params = useParams<{ id: string }>();
  const shareId = Number(params.id);

  return (
    <ProtectedPage
      title="Dettaglio cartella condivisa"
      description="Vista analitica della share con accessi effettivi e origini delle regole applicate."
      breadcrumb="Cartelle condivise"
    >
      <ShareDetailPanel shareId={shareId} />
    </ProtectedPage>
  );
}
