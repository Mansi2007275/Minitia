import Link from "next/link";
import { tasks } from "@/lib/data";
import type { MarketplaceTask } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";

type TaskDetailPageProps = {
  params: { id: string };
};

async function getTaskById(id: string): Promise<MarketplaceTask | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/tasks/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { task: MarketplaceTask };
    return payload.task;
  } catch {
    return null;
  }
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const mockTask = tasks.find((item) => item.id === params.id);
  const backendTask = await getTaskById(params.id);
  const displayTask = backendTask || mockTask;

  if (!displayTask) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Task not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            The task you are looking for does not exist yet.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
          >
            Back to marketplace
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">{displayTask.title}</h1>
          <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            ${displayTask.reward}
          </span>
        </div>
        <div className="mt-6 space-y-4 text-sm text-slate-700">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </h2>
            <p className="mt-2 leading-6 text-slate-700">{displayTask.description}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Success Criteria
            </h2>
            <p className="mt-2 leading-6 text-slate-700">{displayTask.criteria}</p>
          </div>
        </div>
        <Link
          href={`/submit/${displayTask.id}`}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Submit Work
        </Link>
      </div>
    </div>
  );
}
