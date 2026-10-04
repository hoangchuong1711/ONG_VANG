"use client";

import { useCallback, useEffect, useState } from "react";

type HealthResult = {
  status: "ok" | "error";
  service?: string;
  database?: "connected" | "disconnected";
  databaseName?: string;
  checkedAt?: string;
  message?: string;
};

type CheckState = "checking" | "online" | "offline";

export default function Home() {
  const [backendState, setBackendState] = useState<CheckState>("checking");
  const [databaseState, setDatabaseState] = useState<CheckState>("checking");
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/health`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as HealthResult;

      setHealth(result);
      setBackendState("online");
      setDatabaseState(result.database === "connected" ? "online" : "offline");
    } catch {
      setHealth(null);
      setBackendState("offline");
      setDatabaseState("offline");
    } finally {
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), 10000);
    return () => window.clearInterval(interval);
  }, [checkHealth]);

  const overallOnline = backendState === "online" && databaseState === "online";

  return (
    <main className="status-page">
      <div className="status-shell">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Mini Ong Vang home">
            <span className="brand-mark">M</span>
            <span>Mini Ong Vang</span>
          </a>
          <span className="environment"><span className="environment-dot" /> LOCAL DOCKER</span>
        </header>

        <section className="hero">
          <p className="eyebrow">SYSTEM STATUS</p>
          <h1>{overallOnline ? "Everything is connected." : "Checking your services."}</h1>
          <p className="hero-copy">
            A live check of the frontend, Java backend, and PostgreSQL database.
          </p>
        </section>

        <section className="status-grid" aria-label="Service status">
          <StatusCard
            number="01"
            title="Frontend"
            detail="Next.js application"
            state="online"
            endpoint="localhost:3001"
          />
          <StatusCard
            number="02"
            title="Backend API"
            detail={health?.service ?? "Java · Apache Tomcat"}
            state={backendState}
            endpoint="localhost:8081"
          />
          <StatusCard
            number="03"
            title="Database"
            detail={health?.databaseName ?? "PostgreSQL"}
            state={databaseState}
            endpoint="Docker service · db:5432"
          />
        </section>

        <section className="connection-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CONNECTION CHECK</p>
              <h2>{overallOnline ? "Your stack is ready" : "Waiting for a healthy response"}</h2>
            </div>
            <span className={`overall-badge ${overallOnline ? "is-online" : "is-pending"}`}>
              <span className="state-dot" />
              {overallOnline ? "ALL SYSTEMS GO" : backendState === "checking" ? "CHECKING" : "NEEDS ATTENTION"}
            </span>
          </div>

          <p className="panel-copy">
            {health?.message ??
              (overallOnline
                ? "The backend answered and PostgreSQL passed a test query."
                : "The page is up. The backend and database check will update automatically.")}
          </p>

          <div className="panel-footer">
            <span>
              {lastChecked
                ? `Last checked ${lastChecked.toLocaleTimeString()}`
                : "Waiting for first check…"}
            </span>
            <button className="refresh-button" onClick={() => void checkHealth()}>
              <span aria-hidden="true">↻</span> Check again
            </button>
          </div>
        </section>

        <footer className="page-footer">
          <span>MINI ONG VANG <span className="footer-separator">/</span> DEVELOPMENT</span>
          <span>Checks every 10 seconds</span>
        </footer>
      </div>
    </main>
  );
}

function StatusCard({
  number,
  title,
  detail,
  state,
  endpoint,
}: {
  number: string;
  title: string;
  detail: string;
  state: CheckState;
  endpoint: string;
}) {
  const label = state === "online" ? "Online" : state === "offline" ? "Offline" : "Checking";

  return (
    <article className="service-card">
      <div className="card-topline">
        <span className="card-number">SERVICE {number}</span>
        <span className={`service-state state-${state}`}>
          <span className="state-dot" /> {label}
        </span>
      </div>
      <div className="card-main">
        <span className={`service-icon icon-${number}`} aria-hidden="true">
          {number === "01" ? "↗" : number === "02" ? "⌘" : "◉"}
        </span>
        <div>
          <h2>{title}</h2>
          <p>{detail}</p>
        </div>
      </div>
      <div className="card-endpoint"><span>ENDPOINT</span><code>{endpoint}</code></div>
    </article>
  );
}
