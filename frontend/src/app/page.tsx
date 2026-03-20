import { AppShell } from "@/components/layout/app-shell";

const dashboardCards = [
  { title: "Utenti NAS", value: "0", note: "Dati in attesa di prima sincronizzazione" },
  { title: "Gruppi", value: "0", note: "Modello pronto per acquisizione membership" },
  { title: "Share", value: "0", note: "Snapshot iniziale non ancora eseguito" },
  { title: "Review", value: "0", note: "Workflow predisposto per milestone successive" },
];

export default function HomePage() {
  return (
    <AppShell>
      <div className="topbar">
        <div>
          <p className="badge">Ambiente bootstrap</p>
        </div>
        <div className="badge">API target: /api</div>
      </div>

      <section className="hero">
        <h2>Controllo centralizzato degli accessi NAS</h2>
        <p>
          Questa schermata iniziale fornisce una base ordinata per le future
          viste di audit, review e reporting. Il layout e gia predisposto per
          integrare dati reali provenienti dal backend FastAPI.
        </p>
      </section>

      <section className="panel-grid">
        {dashboardCards.map((card) => (
          <article className="panel" key={card.title}>
            <small>{card.title}</small>
            <div className="metric">{card.value}</div>
            <p>{card.note}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
