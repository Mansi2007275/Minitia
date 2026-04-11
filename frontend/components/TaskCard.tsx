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
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
          ${task.reward}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{shortDescription}</p>
      <div className="mt-6">
        <Link
          href={`/task/${task.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
        >
          View Details
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
