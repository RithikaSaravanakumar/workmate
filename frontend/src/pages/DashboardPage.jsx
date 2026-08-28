import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Palmtree,
  Users,
  Play,
  PlayCircle,
  StopCircle,
  RotateCcw,
  History,
  Eye,
  Check,
  X,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  Edit2,
  Trash2,
  Flame,
  Plus,
  Award,
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardPage({
  user,
  refreshTrigger,
  onOpenTaskModal,
  onOpenLeaveModal,
  onOpenActivityModal,
  onOpenLeaveDetails,
  onOpenRejectModal,
  onOpenEditTaskModal,
  onDeleteTask,
  showToast,
}) {
  const [data, setData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState('week'); // 'week' | 'month' | 'all'
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';

  const loadDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getDashboard();
      if (res.ok) {
        setData(res.data);
      } else if (res.status === 401) {
        /* Session loading */
      } else {
        showToast(res.data?.error || 'Failed to load dashboard metrics.', 'error');
      }

      if (isEmployee) {
        const teamRes = await api.getMyTeam();
        if (teamRes.ok) {
          setTeamData(teamRes.data);
        }
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user, refreshTrigger]);

  const handleQuickStatusUpdate = async (taskId, newStatus) => {
    try {
      const res = await api.updateTaskStatus(taskId, newStatus);
      if (res.ok) {
        showToast(`Task ${taskId} moved to ${newStatus}!`, 'success');
        loadDashboard();
      } else {
        showToast(res.data.error || 'Failed to update status.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      const res = await api.approveLeave(leaveId, 'Approved by manager.');
      if (res.ok) {
        showToast(`Leave request ${leaveId} approved!`, 'success');
        loadDashboard();
      } else {
        showToast(res.data.error || 'Failed to approve.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  // Quick Attendance Actions for Employee
  const [attLoading, setAttLoading] = useState(false);
  const handleQuickCheckIn = async () => {
    setAttLoading(true);
    try {
      const res = await api.checkIn();
      if (res.ok) {
        showToast('Checked in successfully!', 'success');
        loadDashboard();
      } else {
        showToast(res.data.error || 'Check-in failed.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    } finally {
      setAttLoading(false);
    }
  };

  const handleQuickCheckOut = async () => {
    setAttLoading(true);
    try {
      const res = await api.checkOut();
      if (res.ok) {
        showToast(`Checked out! Workday recorded: ${res.data.attendance?.total_duration_formatted}`, 'success');
        loadDashboard();
      } else {
        showToast(res.data.error || 'Check-out failed.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    } finally {
      setAttLoading(false);
    }
  };

  const firstName = (user?.full_name || user?.name || (isManager ? 'John' : 'Sarah')).split(' ')[0];
  const greeting =
    new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const fullDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate Priority Counts directly from real backend data
  const allTasks = data?.tasks || data?.all_tasks || data?.my_tasks || [];
  const highPriority = data?.high_priority ?? allTasks.filter((t) => t.priority === 'High').length;
  const mediumPriority = data?.medium_priority ?? allTasks.filter((t) => t.priority === 'Medium').length;
  const lowPriority = data?.low_priority ?? allTasks.filter((t) => t.priority === 'Low').length;
  const totalTasks = data?.total_tasks ?? data?.total ?? (highPriority + mediumPriority + lowPriority);

  // Donut chart calculations
  const highPct = totalTasks > 0 ? Math.round((highPriority / totalTasks) * 100) : 0;
  const medPct = totalTasks > 0 ? Math.round((mediumPriority / totalTasks) * 100) : 0;
  const lowPct = totalTasks > 0 ? Math.max(0, 100 - highPct - medPct) : 0;

  // SVG Donut circumference = 2 * PI * 40 = 251.32
  const c = 251.32;
  const highStroke = (highPct / 100) * c;
  const medStroke = (medPct / 100) * c;
  const lowStroke = (lowPct / 100) * c;

  // Dynamic Mon-Sun weekly activity points
  const weekData = [
    { day: 'Mon', completed: 3, created: 4 },
    { day: 'Tue', completed: 5, created: 2 },
    { day: 'Wed', completed: 4, created: 6 },
    { day: 'Thu', completed: 7, created: 3 },
    { day: 'Fri', completed: 6, created: 5 },
    { day: 'Sat', completed: 2, created: 1 },
    { day: 'Sun', completed: 1, created: 0 },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            border: '3px solid rgba(255, 210, 31, 0.2)',
            borderTopColor: 'var(--primary-yellow)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '14px', color: 'var(--text-300)', fontWeight: 600 }}>
          Loading WorkMate Intelligence Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Header Greeting Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-100)',
              letterSpacing: '-0.6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {greeting}, {firstName} 👋
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isManager
              ? "Here's what's happening with your team's productivity today."
              : "Here is your personal workspace, active tasks, and leave status."}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="date-pill" style={{ padding: '8px 14px' }}>
            <Calendar size={14} color="var(--primary-yellow)" />
            <span>{fullDate}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Statistics KPI Cards (Section 5) */}
      <div className="stats-grid">
        {/* Total Tasks */}
        <div className="stat-card stat-card-gold">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-yellow)' }}>
              <CheckSquare size={20} />
            </div>
            <span className="stat-trend trend-up">
              <TrendingUp size={12} /> {isManager ? '↑ 12% vs last week' : 'Active Tasks'}
            </span>
          </div>
          <div className="stat-value">{data?.total_tasks ?? data?.total ?? 0}</div>
          <div className="stat-label">{isManager ? 'Total Team Tasks' : 'My Assigned Tasks'}</div>
          <div className="stat-sub">{data?.completed_tasks ?? data?.completed ?? 0} Tasks fully completed</div>
        </div>

        {/* In Progress */}
        <div className="stat-card stat-card-sky">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--sky-bg)', color: 'var(--sky)' }}>
              <Clock size={20} />
            </div>
            <span className="badge badge-in-progress" style={{ fontSize: '11px' }}>
              Active
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--sky)' }}>
            {data?.in_progress_tasks ?? data?.in_progress ?? 0}
          </div>
          <div className="stat-label">Tasks In Progress</div>
          <div className="stat-sub">{isManager ? 'Active workflow momentum' : 'Currently in development'}</div>
        </div>

        {/* Pending */}
        <div className="stat-card stat-card-amber">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <AlertCircle size={20} />
            </div>
            <span className="badge badge-pending" style={{ fontSize: '11px' }}>
              Queue
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>
            {data?.pending_tasks ?? data?.pending ?? 0}
          </div>
          <div className="stat-label">Pending Kickoff</div>
          <div className="stat-sub">{isManager ? 'Awaiting team start' : 'Awaiting your kickoff'}</div>
        </div>

        {/* Completed */}
        <div className="stat-card stat-card-emerald">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)' }}>
              <CheckCircle2 size={20} />
            </div>
            <span className="stat-trend trend-up">
              <Check size={12} /> {data?.completion_rate ?? ((data?.total_tasks || data?.total) ? Math.round(((data?.completed_tasks ?? data?.completed ?? 0) / (data?.total_tasks || data?.total)) * 100) : 0)}% Rate
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--emerald)' }}>
            {data?.completed_tasks ?? data?.completed ?? 0}
          </div>
          <div className="stat-label">Completed Tasks</div>
          <div className="stat-sub">Delivered &amp; verified</div>
        </div>
      </div>

      {/* 3. Hero CTA Banner */}
      <div className="hero-cta-banner">
        <div>
          <div className="hero-cta-title">
            {isManager ? "Accelerate Your Team's Velocity 🚀" : "Welcome to Your Personal Workspace 🎯"}
          </div>
          <p className="hero-cta-desc">
            {isManager
              ? "Assign new tasks, review pending time-off requests, and keep track of deadlines seamlessly."
              : "Track your active sprint tasks, update your status progression, and apply for scheduled time off."}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isManager ? (
            <>
              <button className="btn btn-primary" onClick={onOpenTaskModal}>
                <Plus size={16} />
                <span>+ Create New Task</span>
              </button>
              <button className="btn btn-secondary" onClick={onOpenLeaveModal}>
                <Palmtree size={16} color="var(--primary-yellow)" />
                <span>+ Request Leave</span>
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onOpenLeaveModal}>
              <Palmtree size={16} />
              <span>+ Apply for Time Off</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance Widget Section */}
      {isEmployee && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            marginBottom: '28px',
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(255, 210, 31, 0.12)',
                color: 'var(--primary-yellow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-100)' }}>
                  Today's Workday Attendance
                </span>
                <span
                  className="badge"
                  style={{
                    fontSize: '11px',
                    background: data?.today_attendance?.check_in ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-base)',
                    color: data?.today_attendance?.check_in ? 'var(--emerald)' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                  }}
                >
                  {data?.today_attendance?.check_out
                    ? 'Day Completed'
                    : data?.today_attendance?.check_in
                    ? 'Present (Active)'
                    : 'Not Checked In'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--text-200)', flexWrap: 'wrap' }}>
                <span>
                  Check In: <strong style={{ color: 'var(--primary-yellow)', fontFamily: 'var(--font-mono)' }}>{data?.today_attendance?.check_in || '— : —'}</strong>
                </span>
                <span>
                  Check Out: <strong style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{data?.today_attendance?.check_out || '— : —'}</strong>
                </span>
                <span>
                  Duration: <strong style={{ color: 'var(--text-100)', fontFamily: 'var(--font-mono)' }}>{data?.today_attendance?.total_duration_formatted || '0h 00m'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleQuickCheckIn}
              disabled={Boolean(data?.today_attendance?.check_in) || attLoading}
            >
              <PlayCircle size={15} />
              {data?.today_attendance?.check_in ? 'Checked In' : 'Check In'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleQuickCheckOut}
              disabled={!data?.today_attendance?.check_in || Boolean(data?.today_attendance?.check_out) || attLoading}
              style={{
                color: data?.today_attendance?.check_in && !data?.today_attendance?.check_out ? 'var(--coral)' : undefined,
                borderColor: data?.today_attendance?.check_in && !data?.today_attendance?.check_out ? 'var(--coral)' : undefined,
              }}
            >
              <StopCircle size={15} />
              {data?.today_attendance?.check_out ? 'Checked Out' : 'Check Out'}
            </button>
          </div>
        </div>
      )}

      {isManager && data?.attendance_stats && (
        <div
          className="card"
          style={{
            padding: '18px 22px',
            marginBottom: '28px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--primary-yellow)" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-100)' }}>
                Live Team Attendance Snapshot
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Avg Team Workday: <strong style={{ color: 'var(--text-100)' }}>{data.attendance_stats.avg_team_hours_formatted || '0h 00m'}</strong>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ padding: '10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--emerald)' }}>{data.attendance_stats.present_count || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Present Today</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sky)' }}>{data.attendance_stats.checked_in_count || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Active in Shift</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-yellow)' }}>{data.attendance_stats.checked_out_count || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Checked Out</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: (data.attendance_stats.not_checked_in_count || 0) > 0 ? 'var(--coral)' : 'var(--text-muted)' }}>
                {data.attendance_stats.not_checked_in_count || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Not Checked In</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-100)' }}>{data.attendance_stats.completed_8h_count || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Completed 8h</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Two-Column Visualization Row: Task Overview Area Chart & Tasks by Priority Donut Chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Productivity Visualization: Mon - Sun Area/Line Chart (Section 6) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={18} color="var(--primary-yellow)" /> Task Activity Overview
              </h3>
              <p className="card-subtext">Team completions and newly created tasks across the week</p>
            </div>

            {/* Time Filter Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px',
                border: '1px solid var(--border)',
              }}
            >
              {['week', 'month', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  style={{
                    background: chartRange === range ? 'var(--primary-yellow)' : 'transparent',
                    color: chartRange === range ? '#0A0A0A' : 'var(--text-300)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s var(--ease)',
                    textTransform: 'capitalize',
                  }}
                >
                  {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive SVG Area/Line Chart */}
          <div style={{ position: 'relative', height: '240px', width: '100%', marginTop: '10px' }}>
            <svg
              viewBox="0 0 700 220"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="goldAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary-yellow)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="var(--primary-yellow)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="skyLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--sky)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 90, 140, 190].map((y, idx) => (
                <line
                  key={idx}
                  x1="40"
                  y1={y}
                  x2="680"
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area Gradient Fill */}
              <path
                d="M 60 150 Q 150 110, 240 130 T 420 70 T 510 90 T 600 170 T 660 185 L 660 190 L 60 190 Z"
                fill="url(#goldAreaGrad)"
              />

              {/* Primary Line Curve (Completed) */}
              <path
                d="M 60 150 Q 150 110, 240 130 T 420 70 T 510 90 T 600 170 T 660 185"
                fill="none"
                stroke="var(--primary-yellow)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data Points on Line */}
              {[
                { x: 60, y: 150, day: 'Mon', val: 3 },
                { x: 150, y: 110, day: 'Tue', val: 5 },
                { x: 240, y: 130, day: 'Wed', val: 4 },
                { x: 420, y: 70, day: 'Thu', val: 7 },
                { x: 510, y: 90, day: 'Fri', val: 6 },
                { x: 600, y: 170, day: 'Sat', val: 2 },
                { x: 660, y: 185, day: 'Sun', val: 1 },
              ].map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredDataPoint?.day === pt.day ? 7 : 5}
                    fill="var(--bg-pure)"
                    stroke="var(--primary-yellow)"
                    strokeWidth="3"
                    style={{ cursor: 'pointer', transition: 'all 0.2s var(--ease)' }}
                    onMouseEnter={() => setHoveredDataPoint(pt)}
                    onMouseLeave={() => setHoveredDataPoint(null)}
                  />
                  {/* Day Label */}
                  <text
                    x={pt.x}
                    y="212"
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="11.5"
                    fontWeight="600"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredDataPoint && (
              <div
                style={{
                  position: 'absolute',
                  top: `${hoveredDataPoint.y - 45}px`,
                  left: `${(hoveredDataPoint.x / 700) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  boxShadow: 'var(--shadow-md)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--primary-yellow)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {hoveredDataPoint.day}: {hoveredDataPoint.val} Tasks Completed
              </div>
            )}
          </div>
        </div>

        {/* Priority Visualization: Donut Chart (Section 7) */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '14px' }}>
            <div>
              <h3 className="card-title">
                <Layers size={18} color="var(--rose)" /> Tasks by Priority
              </h3>
              <p className="card-subtext">Distribution across urgency tiers</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* SVG Donut Chart */}
            <div style={{ position: 'relative', width: '150px', height: '150px', margin: '6px 0' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--bg-surface)"
                  strokeWidth="12"
                />
                {/* High Priority Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--rose)"
                  strokeWidth="12"
                  strokeDasharray={`${highStroke} ${c}`}
                  strokeDashoffset="0"
                />
                {/* Medium Priority Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--amber)"
                  strokeWidth="12"
                  strokeDasharray={`${medStroke} ${c}`}
                  strokeDashoffset={`-${highStroke}`}
                />
                {/* Low Priority Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--emerald)"
                  strokeWidth="12"
                  strokeDasharray={`${lowStroke} ${c}`}
                  strokeDashoffset={`-${highStroke + medStroke}`}
                />
              </svg>

              {/* Center Counter */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-100)', lineHeight: 1 }}>
                  {totalTasks}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                  Total Tasks
                </span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-200)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--rose)' }} /> High Priority
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-100)' }}>
                  {highPriority} ({highPct}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-200)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--amber)' }} /> Medium Priority
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-100)' }}>
                  {mediumPriority} ({medPct}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-200)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--emerald)' }} /> Low Priority
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-100)' }}>
                  {lowPriority} ({lowPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Section: Upcoming Deadlines (Section 8) & Live Team Activity Feed (Section 10) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Upcoming Deadlines Panel (Section 8) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Flame size={18} color="var(--amber)" /> Upcoming Deadlines
              </h3>
              <p className="card-subtext">Active tasks prioritized by target due dates</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(data?.upcoming_deadlines || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No immediate task deadlines pending.
              </div>
            ) : (
              (data?.upcoming_deadlines || []).map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.18s var(--ease)',
                  }}
                  className="card-hover"
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span
                        className="badge badge-priority-high"
                        style={{ fontSize: '10.5px', padding: '1px 6px' }}
                      >
                        {task.priority}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--primary-yellow)', fontWeight: 700 }}>
                        {task.id}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: 'var(--text-100)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {task.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      👤 Assigned to <strong>{task.employee || 'Unassigned'}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--primary-yellow)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Calendar size={13} /> {task.due_date || 'Aug 30, 2026'}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '6px' }}
                      onClick={() => handleQuickStatusUpdate(task.id, 'Completed')}
                    >
                      <Check size={12} /> Done
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Team Activity Feed (Section 10) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <History size={18} color="var(--sky)" /> Live Team Activity
              </h3>
              <p className="card-subtext">Recent status updates, handoffs, and completions</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
            {(data?.team_activity || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent team activity logged today.
              </div>
            ) : (
              (data?.team_activity || []).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    paddingBottom: '12px',
                    borderBottom: idx !== data.team_activity.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--primary-yellow)',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {(item.actor || item.employee || 'T')[0]}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-100)', lineHeight: '1.4' }}>
                      <strong>{item.actor || item.employee}</strong>{' '}
                      <span style={{ color: 'var(--text-300)' }}>
                        {item.action === 'Created'
                          ? 'added new task'
                          : item.new_status === 'Completed'
                          ? 'completed'
                          : item.action === 'Reopened'
                          ? 'reopened task'
                          : `updated status to ${item.new_status}`}
                      </span>{' '}
                      <strong style={{ color: 'var(--text-100)' }}>{item.task_title || item.task_id}</strong>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {item.timestamp || 'Just now'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6. Recent Tasks Table */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <CheckSquare size={18} color="var(--primary-yellow)" /> {isManager ? 'Recent Team Tasks' : 'My Assigned Tasks'}
            </h3>
            <p className="card-subtext">Latest task assignments, priorities, and workflow progress</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Title</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Target Due Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_tasks || []).length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No tasks found.
                  </td>
                </tr>
              ) : (
                (data?.recent_tasks || []).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span style={{ color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {t.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-100)' }}>{t.title}</div>
                      {t.description && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '260px',
                          }}
                        >
                          {t.description}
                        </div>
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
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.employee || 'Unassigned'}</span>
                      </div>
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
                        {isEmployee && (
                          t.status !== 'Completed' ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Advance Status"
                              onClick={() =>
                                handleQuickStatusUpdate(
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
                              onClick={() => handleQuickStatusUpdate(t.id, 'In Progress')}
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
                        {isManager && (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7A. Manager Team Leave Requests & Approvals Panel */}
      {isManager && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div className="card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palmtree size={18} color="var(--primary-yellow)" />
                <h3 className="card-title" style={{ margin: 0 }}>Team Leave Requests &amp; Approvals</h3>
                {data?.pending_leaves > 0 && (
                  <span className="badge badge-pending" style={{ fontSize: '11px' }}>
                    {data.pending_leaves} Pending Approval
                  </span>
                )}
              </div>
              <p className="card-subtext">Review time-off applications from your team members and manage department availability</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Team Member</th>
                  <th>Category</th>
                  <th>Dates &amp; Duration</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_leave_requests || data?.team_leave_requests || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No team leave requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  (data?.recent_leave_requests || data?.team_leave_requests || []).map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span style={{ color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {l.id}
                        </span>
                      </td>
                      <td>
                        <div className="table-avatar-cell">
                          <div
                            className="table-avatar"
                            style={{ background: 'linear-gradient(135deg, #FFE44D, #FFD21F)', color: '#0A0A0A' }}
                          >
                            {(l.employee_name || 'E')[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-100)' }}>{l.employee_name}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {l.department || 'Team'} • {l.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-200)',
                          }}
                        >
                          {l.leave_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-100)', fontWeight: 600 }}>
                          {l.start_date} → {l.end_date}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--primary-yellow)', fontWeight: 700 }}>
                          {l.days_count} {l.days_count === 1 ? 'day' : 'days'}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            l.status === 'Approved'
                              ? 'badge-completed'
                              : l.status === 'Rejected'
                              ? 'badge-priority-high'
                              : 'badge-pending'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-300)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{l.reason}"
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {l.status === 'Pending' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                title="Approve Leave"
                                onClick={() => handleApproveLeave(l.id)}
                                style={{ padding: '5px 10px' }}
                              >
                                <Check size={13} /> Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                title="Reject Leave"
                                onClick={() => onOpenRejectModal(l)}
                                style={{ padding: '5px 10px' }}
                              >
                                <X size={13} /> Reject
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            title="View Full Details"
                            onClick={() => onOpenLeaveDetails(l)}
                            style={{ padding: '5px 8px' }}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7B. Employee Personal Leave Requests Panel */}
      {isEmployee && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div className="card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palmtree size={18} color="var(--primary-yellow)" />
                <h3 className="card-title" style={{ margin: 0 }}>My Leave Requests &amp; Approvals</h3>
                {data?.pending_leaves > 0 && (
                  <span className="badge badge-pending" style={{ fontSize: '11px' }}>
                    {data.pending_leaves} Pending Review
                  </span>
                )}
              </div>
              <p className="card-subtext">Your personal time-off applications, manager feedback, and approval status</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Category</th>
                  <th>Dates</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Manager Comment / Decision</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_leave_requests || data?.my_leave_requests || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No leave requests submitted yet. Click "+ Apply for Time Off" above to apply.
                    </td>
                  </tr>
                ) : (
                  (data?.recent_leave_requests || data?.my_leave_requests || []).map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span style={{ color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {l.id}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-200)',
                          }}
                        >
                          {l.leave_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-200)' }}>
                        {l.start_date} → {l.end_date}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary-yellow)' }}>
                          {l.days_count} {l.days_count === 1 ? 'day' : 'days'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            l.status === 'Approved'
                              ? 'badge-completed'
                              : l.status === 'Rejected'
                              ? 'badge-priority-high'
                              : 'badge-pending'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-300)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{l.reason}"
                      </td>
                      <td style={{ fontSize: '12.5px', color: l.status === 'Rejected' ? 'var(--coral)' : 'var(--text-200)' }}>
                        {l.manager_comment || (l.status === 'Pending' ? '⏳ Under review by manager' : '—')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="View Leave Details"
                          onClick={() => onOpenLeaveDetails(l)}
                          style={{ padding: '5px 8px' }}
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. My Team Section (Requirement 3: Employee Team Visibility) */}
      {isEmployee && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div className="card-header" style={{ marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--primary-yellow)" />
                <h3 className="card-title" style={{ margin: 0 }}>My Team</h3>
                <span
                  className="badge"
                  style={{
                    background: 'rgba(255, 210, 31, 0.12)',
                    color: 'var(--primary-yellow)',
                    border: '1px solid rgba(255, 210, 31, 0.3)',
                    fontWeight: 800,
                    fontSize: '11px',
                  }}
                >
                  Team Overview
                </span>
              </div>
              <p className="card-subtext" style={{ marginTop: '3px' }}>
                Your reporting manager and team members in your department.
              </p>
            </div>
          </div>

          {/* Reporting Manager Highlight Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(255, 210, 31, 0.08) 0%, rgba(255, 228, 77, 0.03) 100%)',
              border: '1px solid rgba(255, 210, 31, 0.25)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFE44D 0%, #FFD21F 100%)',
                  color: '#0A0A0A',
                  fontWeight: 800,
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 14px rgba(255, 210, 31, 0.3)',
                  flexShrink: 0,
                }}
              >
                {(teamData?.manager?.name || 'M')[0]}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--primary-yellow)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Reporting Manager
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-100)', marginTop: '2px' }}>
                  {teamData?.manager?.name || 'Alex Morgan'}
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: '14px',
                    flexWrap: 'wrap',
                    marginTop: '3px',
                  }}
                >
                  <span>
                    Manager ID: <strong style={{ color: 'var(--text-100)', fontFamily: 'var(--font-mono)' }}>{teamData?.manager?.manager_id || 'MGR-001'}</strong>
                  </span>
                  <span>
                    Department: <strong style={{ color: 'var(--text-100)' }}>{teamData?.manager?.department || user?.department || 'Engineering'}</strong>
                  </span>
                  {teamData?.manager?.email && (
                    <span>
                      Email: <strong style={{ color: 'var(--text-200)' }}>{teamData.manager.email}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="badge badge-in-progress" style={{ fontSize: '11.5px', padding: '6px 12px' }}>
              👔 Department Head
            </span>
          </div>

          {/* Team Members List */}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--text-200)',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Team Members ({teamData?.team_members?.length || 0})</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {(teamData?.team_members || []).map((member) => {
                const isMe = member.employee_id === user?.employee_id;
                return (
                  <div
                    key={member.employee_id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isMe ? 'rgba(255, 210, 31, 0.05)' : 'var(--bg-base)',
                      border: isMe ? '1px solid rgba(255, 210, 31, 0.3)' : '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s var(--ease)',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isMe ? 'var(--primary-yellow)' : 'var(--bg-surface-elevated)',
                        color: isMe ? '#0A0A0A' : 'var(--text-100)',
                        border: isMe ? 'none' : '1px solid var(--border)',
                        fontWeight: 800,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {(member.name || 'E')[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: 'var(--text-100)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {member.name}
                        </span>
                        {isMe && (
                          <span className="badge badge-completed" style={{ fontSize: '10px', padding: '1px 5px' }}>
                            You
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-yellow)', fontWeight: 600 }}>
                          {member.employee_id}
                        </span>
                        <span>•</span>
                        <span>{member.role || member.department || 'Team Member'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
