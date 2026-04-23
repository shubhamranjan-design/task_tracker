'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProjectList } from './ProjectList';
import { TaskModal } from './TaskModal';
import { StatsBar } from './StatsBar';
import type { Task, Project } from '@/lib/sheets';

export function TaskBoard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalParentId, setModalParentId] = useState('');
  const [modalType, setModalType] = useState<'project' | 'task'>('project');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [seeding, setSeeding] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [treeRes, allRes] = await Promise.all([
        fetch('/api/tasks?format=tree'),
        fetch('/api/tasks'),
      ]);
      const treeData = await treeRes.json();
      const allData = await allRes.json();
      if (treeData.error) throw new Error(treeData.error);
      setProjects(treeData.projects || []);
      setAllTasks(allData.tasks || []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleSave = async (task: Partial<Task>) => {
    try {
      if (editingTask) {
        await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...task }),
        });
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...task,
            type: modalType,
            parentId: modalParentId,
          }),
        });
      }
      setShowModal(false);
      setEditingTask(null);
      setModalParentId('');
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, type: string) => {
    const msg = type === 'project'
      ? 'Delete this project and all its subtasks?'
      : 'Delete this subtask?';
    if (!confirm(msg)) return;
    try {
      await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSeed = async () => {
    if (!confirm('This will load your predefined task list. Continue?')) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const openNewProject = () => {
    setEditingTask(null);
    setModalType('project');
    setModalParentId('');
    setShowModal(true);
  };

  const openNewSubtask = (projectId: string) => {
    setEditingTask(null);
    setModalType('task');
    setModalParentId(projectId);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalType(task.type);
    setModalParentId(task.parentId);
    setShowModal(true);
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (filterStatus !== 'all' && filterStatus !== 'done' && p.status === 'done') return false;
    if (filterStatus === 'done' && p.status !== 'done') return false;
    if (filterStatus !== 'all' && filterStatus !== 'done' && p.status !== filterStatus) {
      // Also show if any subtask matches
      const hasMatch = p.subtasks.some((s) => s.status === filterStatus);
      if (!hasMatch) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchProject = p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchSub = p.subtasks.some((s) =>
        s.title.toLowerCase().includes(q) || s.assignee.toLowerCase().includes(q)
      );
      return matchProject || matchSub;
    }
    return true;
  }).map((p) => {
    // Filter subtasks within matching projects
    if (filterStatus !== 'all') {
      return { ...p, subtasks: p.subtasks };
    }
    return p;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4 sticky top-0 bg-[var(--bg-primary)] z-40">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">T</div>
            <h1 className="text-lg font-semibold">Task Tracker</h1>
            <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
              {projects.length} projects
            </span>
          </div>
          <div className="flex items-center gap-2">
            {projects.length === 0 && !loading && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-indigo-500 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors"
              >
                {seeding ? 'Loading...' : 'Load My Tasks'}
              </button>
            )}
            <button
              onClick={openNewProject}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + New Project
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Stats */}
        <StatsBar tasks={allTasks} projects={projects} />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search projects and tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchTasks}
            className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-auto"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ProjectList
            projects={filteredProjects}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onAddSubtask={openNewSubtask}
          />
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          type={modalType}
          parentId={modalParentId}
          projects={projects}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}
