import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Play,
  Check,
  RotateCcw,
  History,
  Edit2,
  Trash2,
  CheckSquare,
  LayoutGrid,
  List,
  Calendar,
  User,
  Clock,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Shield,
  Users,
  Target,
} from 'lucide-react';
import { api } from '../services/api';

export default function TasksPage({
  user,
  searchQuery,
  onOpenTaskModal,
  onOpenEditTaskModal,
  onOpenActivityModal,
  onDeleteTask,
  showToast,
}) {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'my' (for manager)
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [loading, setLoading] = useState(true);

  const role = user?.role || 'employee';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isAdmin = role === 'admin';

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.q = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (empFilter) params.employee_id = empFilter;
      if (isManager) {
        params.scope = activeTab === 'my' ? 'my_tasks' : 'team_tasks';
      }

      const res = await api.getTasks(params);
      if (res.ok) {
        setTasks(res.data || []);
      } else {
        showToast(res.data?.error || 'Failed to load tasks.', 'error');
      }
    } catch (e) {
      showToast('Network error loading tasks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (isManager || isAdmin) {
      try {
        const res = await api.getEmployees();
        if (res.ok) setEmployees(res.data || []);
      } catch (e) {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user, searchQuery, statusFilter, priorityFilter, empFilter, activeTab]);

  useEffect(() => {
    loadEmployees();
  }, [user]);

  const handleStatusTransition = async (taskId, newStatus) => {
    try {
      const res = await api.updateTaskStatus(taskId, newStatus);
      if (res.ok) {
        showToast(`Task ${taskId} moved to ${newStatus}!`, 'success');
        loadTasks();
      } else {
        showToast(res.data?.error || 'Failed to update status.', 'error');
      }
    } catch (e) {
      showToast('Network error updating task status.', 'error');
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'Pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');

  return (
    <div>
      {/* Top Header & Role Notice */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-100)' }}>
              {isManager
                ? activeTab === 'team'
                  ? 'Team Tasks Board & Delegation'
                  : 'My Assigned Executive Tasks'
                : isEmployee
                ? 'My Task Board'
                : 'Organization Tasks Directory'}
            </h2>
            <span
              className="badge"
              style={{
                background: isManager ? 'rgba(255, 210, 31, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                color: isManager ? 'var(--primary-yellow)' : 'var(--sky)',
                border: '1px solid rgba(255, 210, 31, 0.3)',
                fontWeight: 800,
                fontSize: '11px',
              }}
            >
              {isManager
                ? activeTab === 'team'
                  ? '👥 Team Overview'
                  : '🎯 Direct Tasks'
                : isEmployee
                ? '👤 My Deliverables'
                : '🛡️ Executive Supervision'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
            {isManager
              ? activeTab === 'team'
                ? 'Monitor team progress and workload. Employees own their deliverables and manage completion statuses.'
                : 'Tasks and strategic initiatives assigned directly to you by the CEO / Executive Office.'
              : isEmployee
              ? 'Update your task workflow status from Pending → In Progress → Completed, or reopen tasks when needed.'
              : 'Supervise executive and employee workflows across all organization departments.'}
          </p>
        </div>

        {/* Manager Tab Switcher */}
        {isManager && (
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setActiveTab('team')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'team' ? 'var(--primary-yellow)' : 'transparent',
                color: activeTab === 'team' ? '#0A0A0A' : 'var(--text-300)',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s var(--ease)',
              }}
            >
              <Users size={14} /> Team Tasks
            </button>
            <button
              onClick={() => setActiveTab('my')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'my' ? 'var(--primary-yellow)' : 'transparent',
                color: activeTab === 'my' ? '#0A0A0A' : 'var(--text-300)',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s var(--ease)',
              }}
            >
              <Target size={14} /> My Tasks (from CEO)
            </button>
          </div>
        )}
      </div>

      {/* Controls & Filter Bar */}
      <div
        className="card"
        style={{
          padding: '16px 22px',
          marginBottom: '24px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-300)', fontSize: '13px', fontWeight: 700 }}>
            <Filter size={15} color="var(--primary-yellow)" /> Filters:
          </div>

          <select
            className="form-control"
            style={{ width: '160px', height: '38px', fontSize: '13px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">⏳ Pending</option>
            <option value="In Progress">⚡ In Progress</option>
            <option value="Completed">✅ Completed</option>
          </select>

          <select
            className="form-control"
            style={{ width: '150px', height: '38px', fontSize: '13px' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="High">🔴 High Priority</option>
            <option value="Medium">🟡 Medium Priority</option>
            <option value="Low">🟢 Low Priority</option>
          </select>

          {isManager && activeTab === 'team' && employees.length > 0 && (
            <select
              className="form-control"
              style={{ width: '180px', height: '38px', fontSize: '13px' }}
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
            >
              <option value="">All Team Members</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}

          {(statusFilter || priorityFilter || empFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setEmpFilter('');
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* View Switcher & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: viewMode === 'kanban' ? 'var(--primary-yellow)' : 'transparent',
                color: viewMode === 'kanban' ? '#0A0A0A' : 'var(--text-300)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s var(--ease)',
              }}
            >
              <LayoutGrid size={14} /> Kanban Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: viewMode === 'list' ? 'var(--primary-yellow)' : 'transparent',
                color: viewMode === 'list' ? '#0A0A0A' : 'var(--text-300)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s var(--ease)',
              }}
            >
              <List size={14} /> Table View
            </button>
          </div>

          {isManager && activeTab === 'team' && (
            <button className="btn btn-primary btn-sm" onClick={onOpenTaskModal}>
              <Plus size={15} />
              <span>+ Create Task</span>
            </button>
          )}

          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={onOpenTaskModal}>
              <Plus size={15} />
              <span>+ Assign Task to Manager</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card" style={{ padding: '48px', textAlign: 'center' }}>
          <div
            className="empty-state-icon"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(255,210,31,0.1)',
              color: 'var(--primary-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckSquare size={28} />
          </div>
          <h3 className="empty-state-title" style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>
            No tasks found
          </h3>
          <p className="empty-state-desc" style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px' }}>
            {searchQuery || statusFilter || priorityFilter
              ? 'No tasks match the active search or filter criteria.'
              : isManager && activeTab === 'team'
              ? 'Get started by creating and delegating your first task to your team.'
              : isManager && activeTab === 'my'
              ? 'You have no direct tasks assigned from the Executive Office at this time.'
              : 'You have no assigned tasks currently.'}
          </p>
          {isManager && activeTab === 'team' && (
            <button className="btn btn-primary" onClick={onOpenTaskModal}>
              <Plus size={16} /> + Assign Task
            </button>
          )}
        </div>
      ) : viewMode === 'kanban' ? (
        /* ====================================================================
           KANBAN BOARD VIEW
        ==================================================================== */
        <div className="kanban-grid">
          {/* Column 1: Pending */}
          <div className="kanban-column">
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)' }} />
                Pending
              </div>
              <span className="badge badge-pending">{pendingTasks.length}</span>
            </div>

            {pendingTasks.map((t) => {
              const canAdvance = t.can_update_status;
              return (
                <div key={t.id} className="kanban-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      className={`badge ${
                        t.priority === 'High'
                          ? 'badge-priority-high'
                          : t.priority === 'Medium'
                          ? 'badge-priority-medium'
                          : 'badge-priority-low'
                      }`}
                      style={{ fontSize: '10.5px', padding: '1px 7px' }}
                    >
                      {t.priority}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {t.id}
                    </span>
                  </div>

                  <div className="kanban-card-title">{t.title}</div>
                  {t.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {t.description}
                    </p>
                  )}

                  <div className="kanban-card-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FFE44D, #FFD21F)',
                          color: '#0A0A0A',
                          fontWeight: 800,
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {(t.employee || 'U')[0]}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-200)', fontWeight: 600 }}>
                        {t.employee || 'Unassigned'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {canAdvance && (
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Move to In Progress"
                          onClick={() => handleStatusTransition(t.id, 'In Progress')}
                        >
                          <Play size={12} color="var(--primary-yellow)" /> Start
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Activity Log"
                        onClick={() => onOpenActivityModal(t)}
                      >
                        <History size={13} />
                      </button>
                      {isManager && activeTab === 'team' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Edit Task Details"
                          onClick={() => onOpenEditTaskModal(t)}
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column 2: In Progress */}
          <div className="kanban-column">
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sky)' }} />
                In Progress
              </div>
              <span className="badge badge-in-progress">{inProgressTasks.length}</span>
            </div>

            {inProgressTasks.map((t) => {
              const canAdvance = t.can_update_status;
              return (
                <div key={t.id} className="kanban-card" style={{ borderColor: 'rgba(96, 165, 250, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      className={`badge ${
                        t.priority === 'High'
                          ? 'badge-priority-high'
                          : t.priority === 'Medium'
                          ? 'badge-priority-medium'
                          : 'badge-priority-low'
                      }`}
                      style={{ fontSize: '10.5px', padding: '1px 7px' }}
                    >
                      {t.priority}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--sky)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {t.id}
                    </span>
                  </div>

                  <div className="kanban-card-title">{t.title}</div>
                  {t.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {t.description}
                    </p>
                  )}

                  <div className="kanban-card-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FFE44D, #FFD21F)',
                          color: '#0A0A0A',
                          fontWeight: 800,
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {(t.employee || 'U')[0]}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-200)', fontWeight: 600 }}>
                        {t.employee || 'Unassigned'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {canAdvance && (
                        <button
                          className="btn btn-success btn-sm"
                          title="Mark as Completed"
                          onClick={() => handleStatusTransition(t.id, 'Completed')}
                        >
                          <Check size={12} /> Complete
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Activity Log"
                        onClick={() => onOpenActivityModal(t)}
                      >
                        <History size={13} />
                      </button>
                      {isManager && activeTab === 'team' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Edit Task Details"
                          onClick={() => onOpenEditTaskModal(t)}
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column 3: Completed */}
          <div className="kanban-column">
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)' }} />
                Completed Tasks
              </div>
              <span className="badge badge-completed">{completedTasks.length}</span>
            </div>

            {completedTasks.map((t) => {
              const canAdvance = t.can_update_status;
              return (
                <div key={t.id} className="kanban-card" style={{ borderColor: 'rgba(52, 211, 153, 0.25)', opacity: 0.9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      className={`badge ${
                        t.priority === 'High'
                          ? 'badge-priority-high'
                          : t.priority === 'Medium'
                          ? 'badge-priority-medium'
                          : 'badge-priority-low'
                      }`}
                      style={{ fontSize: '10.5px', padding: '1px 7px' }}
                    >
                      {t.priority}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {t.id}
                    </span>
                  </div>

                  <div className="kanban-card-title" style={{ textDecoration: 'line-through', color: 'var(--text-300)' }}>
                    {t.title}
                  </div>
                  {t.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {t.description}
                    </p>
                  )}

                  <div className="kanban-card-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FFE44D, #FFD21F)',
                          color: '#0A0A0A',
                          fontWeight: 800,
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {(t.employee || 'U')[0]}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-200)', fontWeight: 600 }}>
                        {t.employee || 'Unassigned'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {canAdvance && (
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Reopen Task"
                          onClick={() => handleStatusTransition(t.id, 'In Progress')}
                        >
                          <RotateCcw size={12} color="var(--amber)" /> Reopen
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Activity Log"
                        onClick={() => onOpenActivityModal(t)}
                      >
                        <History size={13} />
                      </button>
                      {isManager && activeTab === 'team' && (
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete Task"
                          onClick={() => onDeleteTask(t.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ====================================================================
           TABLE VIEW
        ==================================================================== */
        <div className="card">
          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Task Title</th>
                  <th>Assigned Assignee</th>
                  <th>Assigned By</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const canAdvance = t.can_update_status;
                  return (
                    <tr key={t.id}>
                      <td>
                        <span style={{ color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {t.id}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-100)' }}>{t.title}</div>
                        {t.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.description}</div>
                        )}
                      </td>
                      <td>
                        <div className="table-avatar-cell">
                          <div
                            className="table-avatar"
                            style={{ background: 'linear-gradient(135deg, #FFE44D, #FFD21F)', color: '#0A0A0A' }}
                          >
                            {(t.employee || 'U')[0]}
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.employee || 'Unassigned'}</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {t.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-200)' }}>
                          {t.assigned_by || 'Manager'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            t.priority === 'High'
                              ? 'badge-priority-high'
                              : t.priority === 'Medium'
                              ? 'badge-priority-medium'
                              : 'badge-priority-low'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            t.status === 'Completed'
                              ? 'badge-completed'
                              : t.status === 'In Progress'
                              ? 'badge-in-progress'
                              : 'badge-pending'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-300)' }}>
                        {t.due_date || '2026-08-30'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {canAdvance && (
                            t.status !== 'Completed' ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Advance Status"
                                onClick={() =>
                                  handleStatusTransition(
                                    t.id,
                                    t.status === 'Pending' ? 'In Progress' : 'Completed'
                                  )
                                }
                              >
                                <Play size={13} color="var(--primary-yellow)" />
                              </button>
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Reopen Task"
                                onClick={() => handleStatusTransition(t.id, 'In Progress')}
                              >
                                <RotateCcw size={13} color="var(--amber)" />
                              </button>
                            )
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Activity Audit Log"
                            onClick={() => onOpenActivityModal(t)}
                          >
                            <History size={13} />
                          </button>
                          {isManager && activeTab === 'team' && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Edit Task Details"
                                onClick={() => onOpenEditTaskModal(t)}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                title="Delete Task"
                                onClick={() => onDeleteTask(t.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
