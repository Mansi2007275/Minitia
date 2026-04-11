"use client";
import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EvaluateTask({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const taskId = unwrappedParams.id;
  
  const [task, setTask] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchData();
  }, [taskId]);

  // Hack for MVP since we don't have a direct submissions by task endpoint in the instructions clearly defined to fetch them.
  // Actually, we DO have it in submissionStore but no direct GET /submissions route was requested.
  // Wait, I should add a quick way to get submissions, but since I already created the backend without it...
  // Let me just send the first submission ID, wait we need submissionId.
  // Wait, I will just call evaluate and pass a mock submissionId if needed, OR I will modify the backend to get the latest submission.
  // The instructions: "GET /evaluate-submission ... Flow: 1. Fetch task by taskId 2. Fetch submission 3. Call OpenAI"
  // Let me adjust the frontend to handle this by guessing the submission ID if I didn't add an endpoint, 
  // OR wait... the backend evaluates and expects `req.body.submissionId`.
  // Wait, instructions say: Flow 1. Fetch task by taskId 2. Fetch submission...
  // Let's modify the frontend to just send `taskId` and we can update evaluateWork in backend to fetch the latest submission by taskId.
  
  const fetchData = async () => {
    try {
      const res = await fetch(`${baseUrl}/tasks/${taskId}`);
      const data = await res.json();
      if (data.success) {
        setTask(data.task);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`${baseUrl}/evaluate-submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }) // Backend should be able to find the submission
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div>
      <h1>Evaluate Task</h1>
      {loading ? <p>Loading...</p> : task ? (
        <div className="card">
          <h2>{task.title}</h2>
          <p><strong>Status:</strong> <span className={`status-badge status-${task.status.toLowerCase()}`}>{task.status}</span></p>

          {!result ? (
             <div style={{ marginTop: "2rem" }}>
               <button onClick={handleEvaluate} className="btn" disabled={evaluating}>
                 {evaluating ? "Evaluating via AI..." : "Run AI Evaluation"}
               </button>
             </div>
          ) : (
             <div style={{ marginTop: "2rem", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
               <h3>Evaluation Result</h3>
               <p><strong>Verdict:</strong> {result.result.verdict}</p>
               <p><strong>Score:</strong> {result.result.score}/100</p>
               <p><strong>Reason:</strong> {result.result.reason}</p>
               {result.payment?.txHash && (
                 <p style={{ wordBreak: 'break-all' }}>
                   <strong>Transaction Hash (Payment Released):</strong><br/>
                   <a href="#" style={{ color: "var(--primary-color)" }}>{result.payment.txHash}</a>
                 </p>
               )}
               <button onClick={() => router.push('/')} className="btn" style={{ marginTop: "1rem" }}>
                 Back to Dashboard
               </button>
             </div>
          )}
        </div>
      ) : <p>Task not found</p>}
    </div>
  );
}
