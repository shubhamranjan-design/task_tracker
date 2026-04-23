'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { Task, Project } from '@/lib/sheets';

interface ProjectListProps {
  projects: Project[];
  onEdit: (task: Task) => void;
  onDelete: (id: string, type: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onAddSubtask: (projectId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: string }> = {
  todo: { label: 'Todo', icon: '○' },
  in_progress: { label: 'In Progress', icon: '◐' },
  in_review: { label: 'In Review', icon: '◑' },
  done: { label: 'Done', icon: '●' },
  blocked: { label: 'Blocked', icon: '⊘' },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
};

export function ProjectList({ projects, onEdit, onDelete, onStatusChange, onAddSubtask }: ProjectListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    projects.forEach((p) => { init[p.id] = true; });
    return init;
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-secondary)]">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-lg mb-2">No projects yet</p>
        <p className="text-sm">Click &quot;+ New Project&quot; to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const isExpanded = expanded[project.id] !== false;
        const totalSubs = project.subtasks.length;
        const doneSubs = project.subtasks.filter((s) => s.status === 'done').length;
        const progress = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
        const isOverdue = project.dueDate && project.status !== 'done' && new Date(project.dueDate) < new Date();

        return (
          <div key={project.id} className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
            {/* Project Header */}
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
              {/* Expand toggle */}
              <button
                onClick={() => toggleExpand(project.id)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Status checkbox */}
              <button
                onClick={() => onStatusChange(project.id, project.status === 'done' ? 'todo' : 'done')}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  project.status === 'done'
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'border-[var(--border)] hover:border-indigo-500'
                }`}
              >
                {project.status === 'done' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Title + meta */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(project)}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${project.status === 'done' ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                    {project.title}
                  </span>
                  <span className={`badge-${project.status} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
                    {STATUS_CONFIG[project.status]?.label || project.status}
                  </span>
                  {project.priority !== 'medium' && (
                    <span className={`priority-${project.priority} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
                      {PRIORITY_LABELS[project.priority]}
                    </span>
                  )}
                </div>
                {project.description && (
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{project.description}</div>
                )}
              </div>

              {/* Progress */}
              {totalSubs > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-24 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {doneSubs}/{totalSubs}
                  </span>
                </div>
              )}

              {/* Due date */}
              {project.dueDate && (
                <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-400 font-medium' : 'text-[var(--text-secondary)]'}`}>
                  {format(new Date(project.dueDate), 'MMM d')}
                </span>
              )}

              {/* Assignee */}
              {project.assignee && (
                <span className="text-xs text-[var(--text-secondary)] flex-shrink-0 max-w-[80px] truncate">
                  {project.assignee}
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onAddSubtask(project.id)}
                  className="p-1 text-[var(--text-secondary)] hover:text-indigo-400 transition-colors"
                  title="Add subtask"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(project.id, 'project')}
                  className="p-1 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                  title="Delete project"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Subtasks */}
            {isExpanded && totalSubs > 0 && (
              <div className="border-t border-[var(--border)]">
                {project.subtasks.map((sub, idx) => {
                  const subOverdue = sub.dueDate && sub.status !== 'done' && new Date(sub.dueDate) < new Date();
                  return (
                    <div
                      key={sub.id}
                      className={`flex items-center gap-3 pl-12 pr-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors ${
                        idx < totalSubs - 1 ? 'border-b border-[var(--border)]/50' : ''
                      }`}
                    >
                      {/* Subtask checkbox */}
                      <button
                        onClick={() => onStatusChange(sub.id, sub.status === 'done' ? 'todo' : 'done')}
                        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          sub.status === 'done'
                            ? 'bg-green-600 border-green-600 text-white'
                            : sub.status === 'in_progress'
                            ? 'border-blue-500'
                            : sub.status === 'blocked'
                            ? 'border-orange-500'
                            : 'border-[var(--border)] hover:border-indigo-500'
                        }`}
                      >
                        {sub.status === 'done' && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Title */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(sub)}>
                        <span className={`text-sm ${sub.status === 'done' ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                          {sub.title}
                        </span>
                      </div>

                      {/* Status badge (only if not todo or done) */}
                      {sub.status !== 'todo' && sub.status !== 'done' && (
                        <span className={`badge-${sub.status} px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0`}>
                          {STATUS_CONFIG[sub.status]?.label}
                        </span>
                      )}

                      {/* Priority (only high/critical) */}
                      {(sub.priority === 'high' || sub.priority === 'critical') && (
                        <span className={`priority-${sub.priority} px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0`}>
                          {PRIORITY_LABELS[sub.priority]}
                        </span>
                      )}

                      {/* Assignee */}
                      {sub.assignee && (
                        <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0 max-w-[60px] truncate">
                          {sub.assignee}
                        </span>
                      )}

                      {/* Due date */}
                      {sub.dueDate && (
                        <span className={`text-[10px] flex-shrink-0 ${subOverdue ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                          {format(new Date(sub.dueDate), 'MMM d')}
                        </span>
                      )}

                      {/* Delete subtask */}
                      <button
                        onClick={() => onDelete(sub.id, 'task')}
                        className="p-0.5 text-[var(--text-secondary)] hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty subtasks message */}
            {isExpanded && totalSubs === 0 && (
              <div className="border-t border-[var(--border)] px-12 py-3">
                <button
                  onClick={() => onAddSubtask(project.id)}
                  className="text-xs text-[var(--text-secondary)] hover:text-indigo-400 transition-colors"
                >
                  + Add first subtask
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
