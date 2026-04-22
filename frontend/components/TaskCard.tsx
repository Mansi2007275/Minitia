import Link from "next/link";
import type { Task } from "@/lib/data";

type TaskCardProps = {
  task: Task;
};

export default function TaskCard({ task }: TaskCardProps) {
  const shortDescription =
    task.description.length > 120
      ? `${task.description.slice(0, 117)}...`
      : task.description;

  return (
    <article className="task-card">
      <h3 className="task-card-title">{task.title}</h3>
      <p className="task-card-body">{shortDescription}</p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginTop: "auto" }}>
        <span className="reward-pill">${task.reward}</span>
      </div>
      <div className="task-card-actions" style={{ marginTop: "1rem" }}>
        <Link href={`/task/${task.id}`} className="btn btn-secondary">
          View details
        </Link>
      </div>
    </article>
  );
}
