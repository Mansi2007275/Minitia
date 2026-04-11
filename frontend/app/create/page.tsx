"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateTask() {
  const router = useRouter();
  const [rawDescription, setRawDescription] = useState("");
  const [structuredTask, setStructuredTask] = useState<any>(null);
  const [reward, setReward] = useState("0.1");
  const [creatorWallet, setCreatorWallet] = useState("0xMockCreatorWallet");
  const [loading, setLoading] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  const handleGenerate = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/tasks/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawDescription })
      });
      const data = await res.json();
      if (data.success) {
        setStructuredTask(data.structuredTask);
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...structuredTask,
          reward: parseFloat(reward),
          creatorWallet
        })
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create New Task</h1>
      <div className="card">
        {!structuredTask ? (
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label className="form-label">Describe the tasks you want done in plain text:</label>
              <textarea 
                className="form-input" 
                value={rawDescription} 
                onChange={(e) => setRawDescription(e.target.value)} 
                required 
                placeholder="E.g., I need a simple React login component with testing..."
              />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Generating..." : "Generate Task Structure"}
            </button>
          </form>
        ) : (
          <div>
            <h3>AI Generated Structure</h3>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input type="text" className="form-input" value={structuredTask.title} onChange={(e) => setStructuredTask({...structuredTask, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={structuredTask.description} onChange={(e) => setStructuredTask({...structuredTask, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Criteria</label>
              <textarea className="form-input" value={structuredTask.criteria} onChange={(e) => setStructuredTask({...structuredTask, criteria: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Reward (ETH)</label>
              <input type="number" step="0.01" className="form-input" value={reward} onChange={(e) => setReward(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Creator Wallet</label>
              <input type="text" className="form-input" value={creatorWallet} onChange={(e) => setCreatorWallet(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={handleCreate} className="btn" disabled={loading}>
                {loading ? "Creating..." : "Confirm & Create Task"}
              </button>
              <button onClick={() => setStructuredTask(null)} className="btn btn-secondary">
                Edit Prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
