'use client';

import type { Task, Project } from '@/lib/sheets';

interface StatsBarProps {
  tasks: Task[];
  projects: Project[];
}

export function StatsBar({ tasks, projects }: StatsBarProps) {
  const totalProjects = projects.length;
  const totalSubtasks = tasks.filter((t) => t.type === 'task').length;
  const doneSubs = tasks.filter((t) => t.type === 'task' && t.status === 'done').length;
  const inProgressSubs = tasks.filter((t) => t.type === 'task' && t.status === 'in_progress').length;
  const blockedSubs = tasks.filter((t) => t.type === 'task' && t.status === 'blocked').length;
  const doneProjects = projects.filter((p) => p.status === 'done').length;

  const overallProgress = totalSubtasks > 0 ? Math.round((doneSubs / totalSubtasks) * 100) : 0;

  const stats = [
    { label: 'Projects', value: totalProjects, sub: `${doneProjects} done`, color: 'text-[var(--text-primary)]' },
    { label: 'Total Tasks', value: totalSubtasks, sub: '', color: 'text-[var(--text-primary)]' },
    { label: 'Completed', value: doneSubs, sub: `${overallProgress}%`, color: 'text-green-400' },
    { label: 'In Progress', value: inProgressSubs, sub: '', color: 'text-blue-400' },
    { label: 'Blocked', value: blockedSubs, sub: '', color: 'text-orange-400' },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">{s.label}</span>
              {s.sub && <span className="text-[10px] text-[var(--text-secondary)] opacity-70">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {totalSubtasks > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)]">Overall</span>
          <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${overallProgress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-medium">{overallProgress}%</span>
        </div>
      )}
    </div>
  );
}
