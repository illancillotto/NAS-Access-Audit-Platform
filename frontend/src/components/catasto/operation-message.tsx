"use client";

const SISTER_LOCKED_URL = "https://sister3.agenziaentrate.gov.it/Servizi/error_locked.jsp";
const SISTER_LOCKED_MESSAGE =
  "Utente SISTER bloccato sul portale Agenzia delle Entrate. Verificare se esiste gia' una sessione attiva su un'altra postazione o browser. indirizzo link:";

type OperationMessageProps = {
  value: string | null;
  className?: string;
};

export function CatastoOperationMessage({ value, className }: OperationMessageProps) {
  if (!value) {
    return <>—</>;
  }

  if (value.includes(SISTER_LOCKED_URL)) {
    return (
      <span className={className}>
        {SISTER_LOCKED_MESSAGE}{" "}
        <a className="text-[#1D4E35] underline" href={SISTER_LOCKED_URL} rel="noreferrer" target="_blank">
          {SISTER_LOCKED_URL}
        </a>
      </span>
    );
  }

  return <span className={className}>{value}</span>;
}
