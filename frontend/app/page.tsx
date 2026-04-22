"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/tasks`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Task Marketplace Dashboard</h1>
      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p>No tasks found. Create one to get started!</p>
      ) : (
        <div className="grid">
          {tasks.map((t: any) => (
            <div className="card" key={t.id}>
              <h3>{t.title}</h3>
              <p style={{ color: "var(--text-color)", marginBottom: "1rem" }}>
                {t.description.length > 100 ? t.description.substring(0, 100) + '...' : t.description}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span><strong>Reward:</strong> {t.reward} INIT</span>
                <span className={`status-badge status-${t.status.toLowerCase()}`}>{t.status}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {t.status === 'open' && (
                  <Link href={`/submit/${t.id}`} className="btn">
                    Submit Work
                  </Link>
                )}
                {t.status === 'submitted' && (
                  <Link href={`/evaluate/${t.id}`} className="btn btn-secondary">
                    Evaluate
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
