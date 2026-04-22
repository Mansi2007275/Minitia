"use client";

import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transactionExplorerUrl } from "@/lib/explorer";
import type { MarketplaceTask, Submission } from "@/lib/types";

type EvaluateResponse = {
  success: boolean;
  message?: string;
  result?: {
    mode?: string;
    score: number;
    verdict: string;
    reason: string;
    proof?: Record<string, unknown>;
  };
  payment?: {
    txHash: string | null;
    payoutDeferred?: boolean;
    taskStatus?: string;
  };
};

function statusBadgeClass(status: string) {
  return `status-badge status-${status.toLowerCase().replace(/-/g, "_")}`;
}

export default function EvaluateTask({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: taskId } = use(params);

  const [task, setTask] = useState<MarketplaceTask | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, subRes] = await Promise.all([
        fetch(`${baseUrl}/tasks/${taskId}`),
        fetch(`${baseUrl}/tasks/${taskId}/submissions`),
      ]);
      const taskJson = await taskRes.json();
      const subJson = await subRes.json();
      if (taskJson.success) setTask(taskJson.task);
      if (subJson.success) setSubmissions(subJson.submissions);
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, taskId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const canRunEvaluation =
    task && (task.status === "submitted" || task.status === "under_review");

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`${baseUrl}/evaluate-submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = (await res.json()) as EvaluateResponse;
      if (data.success) {
        setResult(data);
        void fetchData();
      } else {
        alert((data as { message?: string }).message || "Evaluation failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setEvaluating(false);
    }
  };

  const handleRaiseDispute = async () => {
    const latest = submissions[submissions.length - 1];
    if (!latest || !task) return;
    const reason = window.prompt("Dispute reason (required):")?.trim();
    if (!reason) return;
    const wallet = window.prompt("Your wallet (creator or contributor):")?.trim();
    if (!wallet) return;
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/raise-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          submissionId: latest.id,
          reason,
          wallet,
        }),
      });
      const data = await res.json();
      if (data.success) {
        void fetchData();
        setResult(null);
      } else {
        alert(data.message || "Failed to raise dispute");
      }
    } catch {
      alert("Network error");
    } finally {
      setBusy(false);
    }
  };

  const handleFinalizePayout = async () => {
    if (!task) return;
    const wallet = window.prompt("Creator wallet (must match task creator):")?.trim();
    if (!wallet) return;
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/finalize-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, wallet }),
      });
      const data = await res.json();
      if (data.success) {
        void fetchData();
      } else {
        alert(data.message || "Finalize failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setBusy(false);
    }
  };

  const latest = submissions[submissions.length - 1];
  const txUrl = result?.payment?.txHash
    ? transactionExplorerUrl(result.payment.txHash)
    : null;

  const raiseable =
    task &&
    latest &&
    task.disputeStatus !== "raised" &&
    (task.status === "submitted" || task.status === "failed" || task.status === "passed_pending");

  const finalizable =
    task && task.status === "passed_pending" && task.disputeStatus !== "raised";

  return (
    <div>
      <header className="page-header">
        <p className="page-eyebrow">Review</p>
        <h1 className="page-title">Evaluation</h1>
        <p className="page-lead">
          Passing evaluation sets the task to passed_pending; funds release only after finalize
          payout (no open dispute) or after an admin resolves a dispute.
        </p>
      </header>

      {loading ? (
        <p className="loading-line">Loading…</p>
      ) : !task ? (
        <div className="panel">
          <p className="page-lead" style={{ margin: 0 }}>
            Task not found.
          </p>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
            Back
          </Link>
        </div>
      ) : (
        <div className="panel">
          <h2 className="task-card-title">{task.title}</h2>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Type: <span className="type-pill">{task.taskType || "generic"}</span>
            <span style={{ margin: "0 0.5rem" }} aria-hidden>
              |
            </span>
            Status: <span className={statusBadgeClass(task.status)}>{task.status}</span>
          </p>
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Dispute:{" "}
            <span className="type-pill">{task.disputeStatus || "none"}</span>
            {task.disputeReason ? (
              <span style={{ marginLeft: "0.5rem" }}>Reason: {task.disputeReason}</span>
            ) : null}
          </p>

          <div style={{ marginBottom: "1.25rem" }}>
            <h3 className="form-label" style={{ marginBottom: "0.35rem" }}>
              Criteria
            </h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
              {task.criteria}
            </p>
          </div>

          {latest ? (
            <div style={{ marginBottom: "1.25rem" }}>
              <h3 className="form-label" style={{ marginBottom: "0.35rem" }}>
                Latest submission
              </h3>
              <p style={{ margin: "0 0 0.35rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                Id {latest.id} · From{" "}
                <span style={{ color: "var(--text)" }}>{latest.contributorWallet}</span>
              </p>
              <p style={{ margin: "0 0 0.35rem", fontSize: "0.8rem", color: "var(--text-faint)" }}>
                Submission dispute: {latest.disputeStatus || "none"}
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                {latest.submissionText}
              </p>
              {latest.submissionLink ? (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
                  <a href={latest.submissionLink} className="mono-link" target="_blank" rel="noreferrer">
                    {latest.submissionLink}
                  </a>
                </p>
              ) : null}
              {(latest.powTestResults || latest.powLogs || latest.powOutputFiles) ? (
                <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--text)" }}>PoW:</strong>
                  {latest.powTestResults ? (
                    <pre style={{ margin: "0.35rem 0", whiteSpace: "pre-wrap" }}>{latest.powTestResults}</pre>
                  ) : null}
                  {latest.powLogs ? (
                    <pre style={{ margin: "0.35rem 0", whiteSpace: "pre-wrap" }}>{latest.powLogs}</pre>
                  ) : null}
                  {latest.powOutputFiles ? (
                    <pre style={{ margin: "0.35rem 0", whiteSpace: "pre-wrap" }}>{latest.powOutputFiles}</pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="page-lead">No submission on record for this task.</p>
          )}

          {raiseable ? (
            <div style={{ marginBottom: "1rem" }}>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void handleRaiseDispute()}>
                Raise dispute
              </button>
            </div>
          ) : null}

          {finalizable ? (
            <div style={{ marginBottom: "1rem" }}>
              <button type="button" className="btn" disabled={busy} onClick={() => void handleFinalizePayout()}>
                Finalize payout (creator)
              </button>
            </div>
          ) : null}

          {!result ? (
            <div>
              <button
                type="button"
                onClick={() => void handleEvaluate()}
                className="btn"
                disabled={evaluating || !canRunEvaluation}
              >
                {evaluating ? "Running checks…" : "Run evaluation"}
              </button>
              {!canRunEvaluation ? (
                <p className="page-lead" style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                  Evaluation runs only in submitted or under_review (e.g. after a dispute before
                  first evaluation).
                </p>
              ) : null}
            </div>
          ) : (
            <div className="eval-result">
              <h3>Result</h3>
              {result.result?.mode ? (
                <p className="eval-row">
                  <strong>Mode:</strong> {result.result.mode}
                </p>
              ) : null}
              <p className="eval-row">
                <strong>Verdict:</strong> {result.result?.verdict}
              </p>
              <p className="eval-row">
                <strong>Score:</strong> {result.result?.score}/100
              </p>
              <p className="eval-row">
                <strong>Summary:</strong> {result.result?.reason}
              </p>
              {result.payment?.payoutDeferred && result.result?.verdict === "PASS" ? (
                <p className="eval-row">
                  <strong>Payout:</strong> deferred (no automatic release). Use finalize payout or
                  dispute flow.
                </p>
              ) : null}
              {result.payment?.taskStatus ? (
                <p className="eval-row">
                  <strong>Task status:</strong> {result.payment.taskStatus}
                </p>
              ) : null}
              {result.result?.proof ? (
                <div style={{ marginTop: "1rem" }}>
                  <p className="form-label" style={{ marginBottom: "0.35rem" }}>
                    Proof (structured)
                  </p>
                  <pre className="proof-pre">
                    {JSON.stringify(result.result.proof, null, 2)}
                  </pre>
                </div>
              ) : null}
              {result.payment?.txHash ? (
                <p className="eval-row mono-link">
                  <strong>Transaction:</strong>{" "}
                  {txUrl ? (
                    <a href={txUrl} target="_blank" rel="noreferrer">
                      {result.payment.txHash}
                    </a>
                  ) : (
                    result.payment.txHash
                  )}
                </p>
              ) : null}
              <p className="page-lead" style={{ marginTop: "1rem", fontSize: "0.8rem" }}>
                Admin override: POST /resolve-dispute with header x-admin-secret (see backend
                .env.example).
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn btn-secondary"
                style={{ marginTop: "1rem" }}
              >
                Back to tasks
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
