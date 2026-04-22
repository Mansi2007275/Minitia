import Link from "next/link";
import { getApiBaseUrl } from "@/lib/api";
import type { MarketplaceTask } from "@/lib/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getTaskById(id: string): Promise<MarketplaceTask | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/tasks/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { success?: boolean; task?: MarketplaceTask };
    if (!payload.success || !payload.task) return null;
    return payload.task;
  } catch {
    return null;
  }
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    return (
      <div>
        <header className="page-header">
          <p className="page-eyebrow">Task</p>
          <h1 className="page-title">Not found</h1>
          <p className="page-lead">This task id is not in the local store.</p>
        </header>
        <Link href="/" className="btn btn-secondary">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <p className="page-eyebrow">Task detail</p>
        <h1 className="page-title">{task.title}</h1>
        <p className="page-lead">
          <span className="type-pill">{task.taskType || "generic"}</span>
          <span style={{ marginLeft: "0.5rem" }} className={`status-badge status-${task.status.toLowerCase()}`}>
            {task.status}
          </span>
          <span style={{ marginLeft: "0.75rem", color: "var(--text-muted)" }}>
            {task.reward} INIT · on-chain id {task.onChainTaskId}
          </span>
        </p>
        <p className="page-lead" style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Dispute: {task.disputeStatus || "none"}
          {task.disputeReason ? ` — ${task.disputeReason}` : ""}
        </p>
      </header>

      <div className="panel" style={{ marginBottom: "1.25rem" }}>
        <h2 className="form-label">Proof contract</h2>
        <p style={{ margin: "0.35rem 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
          {task.isVerifiable ? (
            <span className="verifiable-badge">Verifiable task</span>
          ) : (
            <span className="type-pill">LLM fallback</span>
          )}{" "}
          <span className="type-pill" style={{ marginLeft: "0.5rem" }}>
            {task.validationMethod || task.taskType}
          </span>
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
          <strong style={{ color: "var(--text)" }}>Expected output:</strong>{" "}
          {task.expectedOutputFormat || "—"}
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
          <strong style={{ color: "var(--text)" }}>Success conditions:</strong>{" "}
          {task.successConditions || "—"}
        </p>
      </div>

      {task.verificationSpec && Object.keys(task.verificationSpec).length > 0 ? (
        <div className="panel" style={{ marginBottom: "1.25rem" }}>
          <h2 className="form-label">Verification spec</h2>
          <pre
            style={{
              margin: 0,
              fontSize: "0.78rem",
              overflow: "auto",
              maxHeight: "14rem",
              lineHeight: 1.45,
            }}
          >
            {JSON.stringify(task.verificationSpec, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="panel">
        <h2 className="form-label">Description</h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
          {task.description}
        </p>
        <h2 className="form-label">Acceptance criteria</h2>
        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
          {task.criteria}
        </p>
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {(task.status === "open" || task.status === "failed") && (
          <Link href={`/submit/${task.id}`} className="btn">
            Submit work
          </Link>
        )}
        {(task.status === "submitted" ||
          task.status === "under_review" ||
          task.status === "passed_pending") && (
          <Link href={`/evaluate/${task.id}`} className="btn btn-secondary">
            {task.status === "passed_pending" ? "Payout / dispute" : "Evaluate / dispute"}
          </Link>
        )}
        <Link href="/" className="btn btn-secondary">
          All tasks
        </Link>
      </div>
    </div>
  );
}
