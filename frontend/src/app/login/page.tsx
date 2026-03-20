export default function LoginPage() {
  return (
    <main className="login-wrap">
      <section className="login-card">
        <p className="badge">Placeholder login</p>
        <h1>Accesso piattaforma</h1>
        <p>
          La schermata e predisposta per l'integrazione futura con autenticazione
          JWT e ruoli applicativi.
        </p>

        <form>
          <label htmlFor="username">
            Username o email
            <input id="username" name="username" type="text" placeholder="utente@ente.local" />
          </label>

          <label htmlFor="password">
            Password
            <input id="password" name="password" type="password" placeholder="••••••••" />
          </label>

          <button className="button" type="button">
            Accedi
          </button>
        </form>
      </section>
    </main>
  );
}
