import Link from "next/link";
import { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>NAS Access Audit</h1>
        <p>
          Workspace iniziale per audit accessi, snapshot, review e reporting
          operativo.
        </p>
        <nav>
          <Link href="/">Dashboard</Link>
          <Link href="/login">Login</Link>
          <Link href="/">Snapshot</Link>
          <Link href="/">Review</Link>
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
