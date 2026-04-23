'use client';

import { format } from 'date-fns';
import type { Task } from '@/lib/sheets';

interface KanbanBoardProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: string) => void;
}

const COLUMNS = [
  { key: 'todo', label: 'Todo', color: 'border-gray-500' },
  { key: 'in_progress', label: 'In Progress', color: 'border-blue-500' },
  { key: 'in_review', label: 'In Review', color: 'border-purple-500' },
  { key: 'blocked', label: 'Blocked', color: 'border-orange-500' },
  { key: 'done', label: 'Done', color: 'border-green-500' },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function KanbanBoard({ tasks, onEdit, onStatusChange }: KanbanBoardProps) {
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onStatusChange(taskId, status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            className="flex-shrink-0 w-72"
            onDrop={(e) => handleDrop(e, col.key)}
            onDragOver={handleDragOver}
          >
            {/* Column header */}
            <div className={`border-t-2 ${col.color} bg-[var(--bg-secondary)] rounded-t-lg px-3 py-2 flex items-center justify-between`}>
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full">
                {columnTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] border-t-0 rounded-b-lg p-2 min-h-[200px] space-y-2">
              {columnTasks.map((task) => {
                const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onEdit(task)}
                    className="task-card bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 cursor-pointer hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="text-sm font-medium mb-2">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{task.description}</div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`priority-${task.priority} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
                        {PRIORITY_LABELS[task.priority] || task.priority}
                      </span>
                      {task.dueDate && (
                        <span className={`text-[10px] ${isOverdue ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                    {task.assignee && (
                      <div className="mt-2 text-[10px] text-[var(--text-secondary)]">{task.assignee}</div>
                    )}
                    {task.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {task.tags.split(',').slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px] text-[var(--text-secondary)]">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
