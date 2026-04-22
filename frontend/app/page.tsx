"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MarketplaceTask } from "@/lib/types";

export default function Dashboard() {
  const [tasks, setTasks] = useState<MarketplaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const fetchTasks = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/tasks?includeTrust=1`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      } else {
        setError(data.message || "Could not load tasks.");
      }
    } catch {
      setError("Cannot reach the API. Is the backend running on port 5000?");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const openCount = tasks.filter((t) => t.status === "open").length;
  const actionCount = tasks.filter((t) => t.status === "submitted").length;

  return (
    <div>
      <header className="page-header">
        <p className="page-eyebrow">Marketplace</p>
        <h1 className="page-title">Open tasks</h1>
        <p className="page-lead">
          Objective tasks with machine-verifiable proof. Payout follows checks and dispute rules,
          not generic “AI said so” alone.
        </p>
      </header>

      {!loading && !error ? (
        <div className="steps" aria-hidden>
          <span className={`step-pill ${openCount > 0 ? "step-pill-active" : ""}`}>
            {openCount} open
          </span>
          <span className={`step-pill ${actionCount > 0 ? "step-pill-active" : ""}`}>
            {actionCount} awaiting review
          </span>
        </div>
      ) : null}

      {loading ? (
        <p className="loading-line">Loading tasks…</p>
      ) : error ? (
        <div className="panel">
          <p className="page-lead" style={{ margin: 0 }}>
            {error}
          </p>
          <button type="button" className="btn btn-secondary" style={{ marginTop: "1rem" }} onClick={() => void fetchTasks()}>
            Retry
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <p className="page-title" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            No tasks yet
          </p>
          <p>
            Create a task to see the full flow: structure with AI, escrow on Minitia, submit
            work, evaluate, and payout.
          </p>
          <Link href="/create" className="btn" style={{ marginTop: "1.25rem" }}>
            Create a task
          </Link>
        </div>
      ) : (
        <div className="card-grid">
          {tasks.map((t) => (
            <article className="task-card" key={t.id}>
              <h2 className="task-card-title">{t.title}</h2>
              <p className="task-card-body">
                {t.description.length > 140 ? `${t.description.slice(0, 137)}…` : t.description}
              </p>
              <div className="task-card-meta">
                <span style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                  <span className="reward-pill">{t.reward} INIT</span>
                  {t.isVerifiable ? <span className="verifiable-badge">Verifiable</span> : null}
                  <span className="type-pill">{t.validationMethod || t.taskType || "generic"}</span>
                </span>
                <span className={`status-badge status-${t.status.toLowerCase()}`}>{t.status}</span>
              </div>
              {t.contributorWallet && t.contributorTrust ? (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "var(--text-faint)" }}>
                  Contributor trust: {t.contributorTrust.trustScore} pts · completed{" "}
                  {t.contributorTrust.completedVerifiableTasks}
                </p>
              ) : null}
              {t.disputeStatus && t.disputeStatus !== "none" ? (
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--text-faint)" }}>
                  Dispute: {t.disputeStatus}
                  {t.disputeReason ? ` — ${t.disputeReason.slice(0, 80)}${t.disputeReason.length > 80 ? "…" : ""}` : ""}
                </p>
              ) : null}
              <div className="task-card-actions">
                <Link href={`/task/${t.id}`} className="btn btn-secondary">
                  Details
                </Link>
                {t.status === "open" && (
                  <Link href={`/submit/${t.id}`} className="btn">
                    Submit work
                  </Link>
                )}
                {t.status === "failed" && (
                  <Link href={`/submit/${t.id}`} className="btn">
                    Resubmit
                  </Link>
                )}
                {(t.status === "submitted" ||
                  t.status === "under_review" ||
                  t.status === "passed_pending") && (
                  <Link href={`/evaluate/${t.id}`} className="btn btn-secondary">
                    {t.status === "passed_pending" ? "Payout / dispute" : "Evaluate / dispute"}
                  </Link>
                )}
                {t.status === "paid" && (
                  <span className="form-label" style={{ margin: 0, alignSelf: "center" }}>
                    Paid out
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
