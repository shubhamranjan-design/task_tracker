'use client';

import { format } from 'date-fns';
import type { Task } from '@/lib/sheets';

interface TaskTableProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function TaskTable({ tasks, onEdit, onDelete, onStatusChange }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-secondary)]">
        <p className="text-lg mb-2">No tasks yet</p>
        <p className="text-sm">Click &quot;+ New Task&quot; to get started</p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Assignee</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Tags</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
              return (
                <tr
                  key={task.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  onClick={() => onEdit(task)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-[var(--text-primary)]">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{task.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value)}
                      className={`badge-${task.status} px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`priority-${task.priority} px-2 py-1 rounded text-xs font-medium`}>
                      {PRIORITY_LABELS[task.priority] || task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{task.assignee || '-'}</td>
                  <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-[var(--text-secondary)]'}`}>
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}
                    {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                  </td>
                  <td className="px-4 py-3">
                    {task.tags && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.split(',').map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-xs text-[var(--text-secondary)]">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDelete(task.id)}
                      className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
