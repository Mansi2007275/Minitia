"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProvider, Contract, parseEther } from "ethers";
import { connectKeplrEvm, getKeplrEvmProvider } from "@/lib/keplr";
import type { StructuredTaskDraft, TaskType, ValidationMethod } from "@/lib/types";

function validationMethodToTaskType(vm: ValidationMethod): TaskType {
  if (vm === "llm_fallback") return "generic";
  if (vm === "json_schema" || vm === "api_capture") return "data";
  return "code";
}
import {
  API_CAPTURE_PRESET,
  CODE_VERIFICATION_PRESET,
  DATA_VERIFICATION_PRESET,
} from "@/lib/verificationPresets";

const METHOD_LABELS: Record<ValidationMethod, string> = {
  tests: "Tests (snippet / regex / mock stdout)",
  json_schema: "JSON schema / structure",
  api_capture: "API response capture (JSON in submission)",
  llm_fallback: "LLM-only review (non-verifiable, last resort)",
};

export default function CreateTask() {
  const router = useRouter();
  const [rawDescription, setRawDescription] = useState("");
  const [structuredTask, setStructuredTask] = useState<StructuredTaskDraft | null>(null);
  const [reward, setReward] = useState("0.1");
  const [verificationSpecJson, setVerificationSpecJson] = useState("{}");
  const [loading, setLoading] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
  const skipOnChain =
    process.env.NEXT_PUBLIC_SKIP_CHAIN === "1" || !contractAddress;

  const step = useMemo(() => (structuredTask ? 2 : 1), [structuredTask]);

  useEffect(() => {
    if (!structuredTask) return;
    const vm = structuredTask.validationMethod;
    const preset =
      vm === "tests"
        ? CODE_VERIFICATION_PRESET
        : vm === "json_schema"
          ? DATA_VERIFICATION_PRESET
          : vm === "api_capture"
            ? API_CAPTURE_PRESET
            : {};
    setVerificationSpecJson(JSON.stringify(preset, null, 2));
  }, [structuredTask?.validationMethod]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/tasks/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawDescription }),
      });
      const data = await res.json();
      if (data.success) {
        const s = data.structuredTask as StructuredTaskDraft;
        const vm = (s.validationMethod || "tests") as ValidationMethod;
        setStructuredTask({
          title: s.title,
          description: s.description,
          criteria: s.criteria,
          taskType: validationMethodToTaskType(vm),
          validationMethod: vm,
          expectedOutputFormat: s.expectedOutputFormat || "",
          successConditions: s.successConditions || "",
          suggestedVerificationSpec: s.suggestedVerificationSpec,
        });
      } else {
        alert(data.message || "Generation failed");
      }
    } catch {
      alert("Network error while generating the task.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!structuredTask) return;

    let connectedAccount = "";
    try {
      connectedAccount = await connectKeplrEvm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Keplr connection failed";
      alert(message);
      return;
    }

    let verificationSpec: Record<string, unknown> = {};
    try {
      verificationSpec = verificationSpecJson.trim()
        ? (JSON.parse(verificationSpecJson) as Record<string, unknown>)
        : {};
    } catch {
      alert("Verification spec must be valid JSON.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: structuredTask.title,
          description: structuredTask.description,
          criteria: structuredTask.criteria,
          reward: parseFloat(reward),
          creatorWallet: connectedAccount,
          validationMethod: structuredTask.validationMethod,
          expectedOutputFormat: structuredTask.expectedOutputFormat,
          successConditions: structuredTask.successConditions,
          suggestedVerificationSpec: structuredTask.suggestedVerificationSpec,
          verificationSpec,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Create failed");
        setLoading(false);
        return;
      }

      if (skipOnChain) {
        router.push("/");
        return;
      }

      const evmProvider = getKeplrEvmProvider();
      if (!evmProvider) {
        alert("Keplr EVM provider not found. Enable EVM in Keplr or use demo mode (no contract).");
        setLoading(false);
        return;
      }
      const provider = new BrowserProvider(evmProvider);
      const signer = await provider.getSigner();
      const abi = ["function createTask(uint taskId) payable"];
      const contract = new Contract(contractAddress!, abi, signer);

      const tx = await contract.createTask(data.task.onChainTaskId, {
        value: parseEther(reward),
      });
      await tx.wait();

      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      if (message.includes("Failed to fetch") || message.includes("RPC")) {
        alert(
          "On-chain step failed (RPC or network). Set NEXT_PUBLIC_SKIP_CHAIN=1 for a local demo without a contract."
        );
      } else {
        alert(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <p className="page-eyebrow">Creators</p>
        <h1 className="page-title">Define verifiable work</h1>
        <p className="page-lead">
          Minitia only pays when proof matches an agreed machine check (or a declared LLM fallback).
          You must publish output format, validation method, and measurable success conditions before
          funding.
        </p>
      </header>

      <div className="steps" aria-label="Progress">
        <span className={`step-pill ${step === 1 ? "step-pill-active" : ""}`}>1 Objective brief</span>
        <span className={`step-pill ${step === 2 ? "step-pill-active" : ""}`}>2 PoW contract</span>
      </div>

      {skipOnChain ? (
        <div className="callout">
          <span className="callout-strong">Demo mode:</span> on-chain <code>createTask</code> is skipped.
          Set <code className="mono-link">NEXT_PUBLIC_CONTRACT_ADDRESS</code> for Minitia on-chain funding.
        </div>
      ) : null}

      <div className="panel">
        {!structuredTask ? (
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label className="form-label" htmlFor="brief">
                What is the objectively checkable outcome?
              </label>
              <textarea
                id="brief"
                className="form-input"
                value={rawDescription}
                onChange={(e) => setRawDescription(e.target.value)}
                required
                placeholder="Example: CLI that reads stdin JSON and prints sorted keys; include pytest output format…"
              />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Drafting…" : "Generate PoW task draft"}
            </button>
          </form>
        ) : (
          <div>
            <h2 className="page-title" style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>
              Review proof contract
            </h2>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="form-input"
                value={structuredTask.title}
                onChange={(e) => setStructuredTask({ ...structuredTask, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                value={structuredTask.description}
                onChange={(e) =>
                  setStructuredTask({ ...structuredTask, description: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Human-readable criteria</label>
              <textarea
                className="form-input"
                value={structuredTask.criteria}
                onChange={(e) =>
                  setStructuredTask({ ...structuredTask, criteria: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expected output format (required)</label>
              <textarea
                className="form-input"
                value={structuredTask.expectedOutputFormat}
                onChange={(e) =>
                  setStructuredTask({ ...structuredTask, expectedOutputFormat: e.target.value })
                }
                required
                placeholder="Exact artifact: file types, JSON keys, stdout shape, repo layout…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Validation method</label>
              <select
                className="form-input"
                value={structuredTask.validationMethod}
                onChange={(e) => {
                  const vm = e.target.value as ValidationMethod;
                  setStructuredTask({
                    ...structuredTask,
                    validationMethod: vm,
                    taskType: validationMethodToTaskType(vm),
                  });
                }}
              >
                {(Object.keys(METHOD_LABELS) as ValidationMethod[]).map((k) => (
                  <option key={k} value={k}>
                    {METHOD_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Success conditions (measurable)</label>
              <textarea
                className="form-input"
                value={structuredTask.successConditions}
                onChange={(e) =>
                  setStructuredTask({ ...structuredTask, successConditions: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Machine verification spec (JSON)</label>
              <textarea
                className="form-input"
                style={{ minHeight: "200px", fontFamily: "ui-monospace, monospace", fontSize: "0.82rem" }}
                value={verificationSpecJson}
                onChange={(e) => setVerificationSpecJson(e.target.value)}
                spellCheck={false}
              />
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-faint)" }}>
                Routed task type: {structuredTask.taskType} (derived from validation method on save)
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Reward (INIT)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
              <button type="button" onClick={() => void handleCreate()} className="btn" disabled={loading}>
                {loading ? "Working…" : skipOnChain ? "Publish task" : "Publish & fund on-chain"}
              </button>
              <button
                type="button"
                onClick={() => setStructuredTask(null)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Edit brief
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
