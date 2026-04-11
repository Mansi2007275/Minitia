"use client";
import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitWork({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const taskId = unwrappedParams.id;
  const [submissionText, setSubmissionText] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [contributorWallet, setContributorWallet] = useState("0xMockContributor");
  const [loading, setLoading] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  const handleSubmit = async (e: any) => {
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
          contributorWallet
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
      <h1>Submit Work</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Submission Text / Notes</label>
            <textarea 
              className="form-input" 
              value={submissionText} 
              onChange={(e) => setSubmissionText(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Submission Link (Optional limit 1)</label>
            <input 
              type="url" 
              className="form-input" 
              value={submissionLink} 
              onChange={(e) => setSubmissionLink(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Your Wallet Address</label>
            <input 
              type="text" 
              className="form-input" 
              value={contributorWallet} 
              onChange={(e) => setContributorWallet(e.target.value)} 
              required
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
