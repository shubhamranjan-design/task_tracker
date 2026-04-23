'use client';

import type { Task } from '@/lib/sheets';

interface StatsBarProps {
  tasks: Task[];
}

export function StatsBar({ tasks }: StatsBarProps) {
  const total = tasks.length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const inReview = tasks.filter((t) => t.status === 'in_review').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;

  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const stats = [
    { label: 'Total', value: total, color: 'text-[var(--text-primary)]', bg: 'bg-[var(--bg-card)]' },
    { label: 'Todo', value: todo, color: 'text-gray-400', bg: 'bg-gray-800/50' },
    { label: 'In Progress', value: inProgress, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { label: 'In Review', value: inReview, color: 'text-purple-400', bg: 'bg-purple-900/30' },
    { label: 'Done', value: done, color: 'text-green-400', bg: 'bg-green-900/30' },
    { label: 'Blocked', value: blocked, color: 'text-orange-400', bg: 'bg-orange-900/30' },
    { label: 'Overdue', value: overdue, color: 'text-red-400', bg: 'bg-red-900/30' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className={`${s.bg} border border-[var(--border)] rounded-lg p-3`}>
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
