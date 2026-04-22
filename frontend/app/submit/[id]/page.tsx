"use client";

import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { connectKeplrEvm } from "@/lib/keplr";
import type { MarketplaceTask } from "@/lib/types";

export default function SubmitWork({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: taskId } = use(params);
  const [task, setTask] = useState<MarketplaceTask | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionCodeSnippet, setSubmissionCodeSnippet] = useState("");
  const [submissionRepoUrl, setSubmissionRepoUrl] = useState("");
  const [powTestResults, setPowTestResults] = useState("");
  const [powLogs, setPowLogs] = useState("");
  const [powOutputFiles, setPowOutputFiles] = useState("");
  const [contributorWallet, setContributorWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const loadTask = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`${baseUrl}/tasks/${taskId}`);
      const data = await res.json();
      if (data.success) {
        setTask(data.task);
        if (data.task.status !== "open" && data.task.status !== "failed") {
          setLoadError("This task is not accepting submissions right now.");
        }
      } else {
        setLoadError(data.message || "Task not found.");
      }
    } catch {
      setLoadError("Cannot reach the API.");
    }
  }, [baseUrl, taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const handleUseWallet = async () => {
    try {
      const addr = await connectKeplrEvm();
      setContributorWallet(addr);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not connect Keplr");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/submit-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          submissionText,
          submissionLink,
          contributorWallet,
          submissionCodeSnippet: submissionCodeSnippet.trim() || undefined,
          submissionRepoUrl: submissionRepoUrl.trim() || undefined,
          powTestResults: powTestResults.trim() || undefined,
          powLogs: powLogs.trim() || undefined,
          powOutputFiles: powOutputFiles.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
      } else {
        alert(data.message || "Submit failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <p className="page-eyebrow">Contributors</p>
        <h1 className="page-title">Submit work</h1>
        <p className="page-lead">
          Ship the artifact the task contract describes, attach proof-of-work (tests, logs, file
          references), and use the payout wallet you control.
        </p>
      </header>

      {loadError ? (
        <div className="panel">
          <p className="page-lead" style={{ margin: 0 }}>
            {loadError}
          </p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href="/" className="btn btn-secondary">
              Back to tasks
            </Link>
          </div>
        </div>
      ) : !task ? (
        <p className="loading-line">Loading task…</p>
      ) : (
        <div className="panel">
          <h2 className="task-card-title" style={{ marginBottom: "0.35rem" }}>
            {task.title}
          </h2>
          <p className="task-card-body" style={{ marginBottom: "1rem" }}>
            {task.description}
          </p>
          <div style={{ marginBottom: "1.25rem", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
            <p style={{ margin: "0 0 0.35rem" }}>
              <strong style={{ color: "var(--text)" }}>Expected output:</strong>{" "}
              {task.expectedOutputFormat || "—"}
            </p>
            <p style={{ margin: "0 0 0.35rem" }}>
              <strong style={{ color: "var(--text)" }}>Validation:</strong>{" "}
              {task.validationMethod || task.taskType}
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--text)" }}>Success conditions:</strong>{" "}
              {task.successConditions || "—"}
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Submission notes</label>
              <textarea
                className="form-input"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                required
                placeholder="What you delivered, how to run it, and anything the reviewer should check."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Link (optional)</label>
              <input
                type="url"
                className="form-input"
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Code snippet (optional, for code tasks)</label>
              <textarea
                className="form-input"
                value={submissionCodeSnippet}
                onChange={(e) => setSubmissionCodeSnippet(e.target.value)}
                placeholder="Paste the main file or excerpt here if it is not fully in notes above."
              />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub repo URL (optional)</label>
              <input
                type="url"
                className="form-input"
                value={submissionRepoUrl}
                onChange={(e) => setSubmissionRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
              />
            </div>
            <h3 className="form-label" style={{ marginTop: "1.25rem" }}>
              Proof of work (required for audit)
            </h3>
            <div className="form-group">
              <label className="form-label">Test results / command transcript</label>
              <textarea
                className="form-input"
                value={powTestResults}
                onChange={(e) => setPowTestResults(e.target.value)}
                placeholder="Paste pytest/jest/cargo test output or equivalent."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Logs</label>
              <textarea
                className="form-input"
                value={powLogs}
                onChange={(e) => setPowLogs(e.target.value)}
                placeholder="Build logs, runtime logs, or stderr/stdout you want reviewers to trust."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Output files (paths or URLs)</label>
              <textarea
                className="form-input"
                value={powOutputFiles}
                onChange={(e) => setPowOutputFiles(e.target.value)}
                placeholder="One per line: artifact paths, CI URLs, or object storage links."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contributor wallet (EVM)</label>
              <input
                type="text"
                className="form-input"
                value={contributorWallet}
                onChange={(e) => setContributorWallet(e.target.value)}
                required
                placeholder="0x…"
              />
              <div style={{ marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => void handleUseWallet()}>
                  Fill from Keplr
                </button>
              </div>
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Submitting…" : "Submit"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
