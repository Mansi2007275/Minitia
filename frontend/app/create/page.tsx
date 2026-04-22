"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import {
  connectKeplrEvm,
  getKeplrEvmProvider,
} from '@/lib/keplr';

export default function CreateTask() {
  const router = useRouter();
  const [rawDescription, setRawDescription] = useState("");
  const [structuredTask, setStructuredTask] = useState<any>(null);
  const [reward, setReward] = useState("0.1");
  const [creatorWallet, setCreatorWallet] = useState("");

  // Wallet connection must now happen explicitly via user click.
  // We'll update the logic below to prompt for connection if wallet isn't cached or provided.
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
    let connectedAccount = "";
    try {
      connectedAccount = await connectKeplrEvm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Keplr connection failed";
      alert(message);
      return;
    }

    setCreatorWallet(connectedAccount);

    setLoading(true);
    try {
      // 1. Create the task in the backend to get a taskId
      const res = await fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...structuredTask,
          reward: parseFloat(reward),
          creatorWallet: connectedAccount
        })
      });
      const data = await res.json();
      
      if (!data.success) {
        alert("Error: " + data.message);
        setLoading(false);
        return;
      }

      // 2. Fund the task on-chain
      const evmProvider = getKeplrEvmProvider();
      if (!evmProvider) {
        alert("Keplr EVM provider not found. Please enable EVM support in Keplr.");
        return;
      }
      const provider = new BrowserProvider(evmProvider);
      const signer = await provider.getSigner();
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
      const abi = ["function createTask(uint taskId) payable"];
      const contract = new Contract(contractAddress, abi, signer);

      const tx = await contract.createTask(data.task.onChainTaskId, {
        value: parseEther(reward)
      });
      await tx.wait();

      router.push('/');
    } catch (err: any) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Transaction failed";
      if (message.includes("Failed to fetch")) {
        alert(
          "Transaction failed: Initia RPC is unreachable. Check Keplr network settings and RPC URL."
        );
      } else {
        alert("Transaction failed: " + message);
      }
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
              <label className="form-label">Reward (INIT)</label>
              <input type="number" step="0.01" className="form-input" value={reward} onChange={(e) => setReward(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Creator Wallet (EVM)</label>
              <input type="text" className="form-input" value={creatorWallet} readOnly />
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
