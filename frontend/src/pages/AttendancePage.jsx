import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  StopCircle,
  Calendar,
  Users,
  Search,
  Filter,
  Flame,
  Award,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { api } from '../services/api';

export default function AttendancePage({ user, refreshTrigger, showToast }) {
  const role = user?.role || 'employee';
  const isEmployee = role === 'employee';
  const isManager = role === 'manager';
  const isAdmin = role === 'admin';

  // Employee state
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live timer for active check-in
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Manager & Admin state
  const [teamStats, setTeamStats] = useState(null);
  const [teamRecords, setTeamRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const TARGET_MINUTES = 480; // 8 hours

  // Load attendance data
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isEmployee) {
        const [todayRes, histRes] = await Promise.all([
          api.getTodayAttendance(),
          api.getAttendanceHistory(),
        ]);
        const att = todayRes.ok ? (todayRes.data?.attendance !== undefined ? todayRes.data.attendance : (todayRes.data?.id ? todayRes.data : null)) : null;
        setTodayAttendance(att);
        if (histRes.ok) {
          setHistory(histRes.data || []);
        }
      } else if (isManager) {
        const res = await api.getTeamAttendance({ date: dateFilter, q: searchQuery });
        if (res.ok) {
          setTeamRecords(res.data.records || []);
          setTeamStats(res.data.stats || {});
        }
      } else if (isAdmin) {
        const res = await api.getOrganizationAttendance({ date: dateFilter, q: searchQuery });
        if (res.ok) {
          setTeamRecords(res.data.records || []);
          setTeamStats(res.data.stats || {});
        }
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, role, dateFilter, refreshTrigger]);

  // Live timer computation
  useEffect(() => {
    if (!todayAttendance || !todayAttendance.check_in_iso) {
      setElapsedMinutes(0);
      return;
    }

    if (todayAttendance.check_out_iso) {
      setElapsedMinutes(todayAttendance.total_duration_minutes || 0);
      return;
    }

    const calculateElapsed = () => {
      try {
        const inTime = new Date(todayAttendance.check_in_iso).getTime();
        const now = Date.now();
        const diffMin = Math.max(0, Math.floor((now - inTime) / (1000 * 60)));
        setElapsedMinutes(diffMin);
      } catch (e) {
        setElapsedMinutes(0);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000); // update every 10s
    return () => clearInterval(interval);
  }, [todayAttendance]);

  // Format minutes into XXh YYm
  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  // Actions
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await api.checkIn();
      if (res.ok) {
        if (showToast) showToast(res.data.message || 'Checked in successfully!', 'success');
        setTodayAttendance(res.data.attendance);
        loadData();
      } else {
        if (showToast) showToast(res.data.error || 'Check-in failed.', 'error');
      }
    } catch (e) {
      if (showToast) showToast('Network error during check-in.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await api.checkOut();
      if (res.ok) {
        if (showToast) showToast(res.data.message || 'Checked out successfully!', 'success');
        setTodayAttendance(res.data.attendance);
        loadData();
      } else {
        if (showToast) showToast(res.data.error || 'Check-out failed.', 'error');
      }
    } catch (e) {
      if (showToast) showToast('Network error during check-out.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 8-hour progress calculations
  const progressPct = Math.min(100, Math.round((elapsedMinutes / TARGET_MINUTES) * 100));
  const isWorkdayCompleted = elapsedMinutes >= TARGET_MINUTES;
  const overtimeMinutes = Math.max(0, elapsedMinutes - TARGET_MINUTES);

  // Filter manager/admin records
  const filteredTeamRecords = teamRecords.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.employee_name || '').toLowerCase().includes(q) ||
      (r.employee_id || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-100)' }}>
            {isEmployee ? 'Workday Attendance & Time Tracker' : isManager ? 'Team Attendance & Hours' : 'Organization Attendance Overview'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEmployee
              ? 'Real-time check-in, 8-hour workday target tracking, overtime calculation, and attendance history.'
              : isManager
              ? 'Monitor team check-in statuses, daily working duration, 8-hour target completion, and compliance.'
              : 'Company-wide attendance statistics, check-in rates, and employee attendance logs.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="badge" style={{ background: 'var(--bg-surface)', padding: '6px 14px', fontSize: '12.5px', border: '1px solid var(--border)' }}>
            <Calendar size={14} style={{ marginRight: '6px' }} />
            Today: <strong style={{ marginLeft: '4px', color: 'var(--primary-yellow)' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
          </div>
        </div>
      </div>

      {/* ====================================================================
          EMPLOYEE VIEW: LIVE ATTENDANCE CARD
      ==================================================================== */}
      {isEmployee && (
        <div
          className="card"
          style={{
            padding: '28px',
            background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)',
            border: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '28px',
            alignItems: 'center',
          }}
        >
          {/* Left: Workday Clock & Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Today's Work Hours (Target: 8h 00m)
                </span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-100)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {formatDuration(elapsedMinutes)}{' '}
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ 08h 00m</span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {todayAttendance?.check_out ? (
                  <span
                    className={`badge ${
                      todayAttendance.status === 'Overtime'
                        ? 'badge-completed'
                        : todayAttendance.status === 'Completed'
                        ? 'badge-completed'
                        : 'badge-pending'
                    }`}
                    style={{ fontSize: '13px', padding: '6px 14px', fontWeight: 800 }}
                  >
                    <CheckCircle2 size={14} style={{ marginRight: '6px' }} />
                    {todayAttendance.status === 'Overtime' ? 'Overtime Completed' : todayAttendance.status === 'Completed' ? 'Day Completed' : 'Short Workday'}
                  </span>
                ) : todayAttendance?.check_in ? (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--sky)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      fontSize: '13px',
                      padding: '6px 14px',
                      fontWeight: 800,
                    }}
                  >
                    <span className="pulse-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sky)', marginRight: '8px' }} />
                    Checked In (Active)
                  </span>
                ) : (
                  <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '13px', padding: '6px 14px' }}>
                    Not Checked In Yet
                  </span>
                )}
              </div>
            </div>

            {/* 8-Hour Workday Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>8-Hour Progress</span>
                <span style={{ color: isWorkdayCompleted ? 'var(--emerald)' : 'var(--primary-yellow)' }}>
                  {progressPct}% {isWorkdayCompleted && '— 8h Target Reached!'}
                </span>
              </div>
              <div
                style={{
                  height: '10px',
                  background: 'var(--bg-base)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: isWorkdayCompleted
                      ? 'linear-gradient(90deg, #10B981, #34D399)'
                      : 'linear-gradient(90deg, #FFD21F, #FFE44D)',
                    transition: 'width 0.4s var(--ease)',
                    borderRadius: '10px',
                  }}
                />
              </div>
            </div>

            {/* Overtime or Completion Indicator */}
            {isWorkdayCompleted && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '13px',
                  color: 'var(--emerald)',
                  fontWeight: 700,
                }}
              >
                <Award size={18} />
                <span>Workday Completed! {overtimeMinutes > 0 ? `Overtime: ${formatDuration(overtimeMinutes)}` : 'Standard 8 Hours Achieved.'}</span>
              </div>
            )}
          </div>

          {/* Right: Check-In / Check-Out Controls */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '20px',
              background: 'var(--bg-base)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Check In Time</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: todayAttendance?.check_in ? 'var(--primary-yellow)' : 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {todayAttendance?.check_in || '— : —'}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Check Out Time</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: todayAttendance?.check_out ? 'var(--emerald)' : 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {todayAttendance?.check_out || '— : —'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px 18px', fontSize: '14px', fontWeight: 800 }}
                onClick={handleCheckIn}
                disabled={Boolean(todayAttendance?.check_in) || actionLoading}
              >
                <PlayCircle size={18} />
                {todayAttendance?.check_in ? 'Checked In' : 'Check In'}
              </button>

              <button
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  fontSize: '14px',
                  fontWeight: 800,
                  borderColor: todayAttendance?.check_in && !todayAttendance?.check_out ? 'var(--coral)' : undefined,
                  color: todayAttendance?.check_in && !todayAttendance?.check_out ? 'var(--coral)' : undefined,
                }}
                onClick={handleCheckOut}
                disabled={!todayAttendance?.check_in || Boolean(todayAttendance?.check_out) || actionLoading}
              >
                <StopCircle size={18} />
                {todayAttendance?.check_out ? 'Checked Out' : 'Check Out'}
              </button>
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {todayAttendance?.check_out
                ? 'Your attendance for today has been recorded.'
                : todayAttendance?.check_in
                ? 'Timer active. Remember to check out at the end of your workday.'
                : 'Click Check In when starting your shift.'}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MANAGER / ADMIN VIEW: METRICS SUMMARY CARDS
      ==================================================================== */}
      {(isManager || isAdmin) && teamStats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{isAdmin ? 'Total Workforce' : 'Team Members'}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-100)', marginTop: '4px' }}>
              {teamStats.total_team_members || teamStats.total_workforce || 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Assigned staff</div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Employees Present</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--emerald)', marginTop: '4px' }}>
              {teamStats.present_count || 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--emerald)', marginTop: '4px' }}>Checked in today</div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Currently Active (Working)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sky)', marginTop: '4px' }}>
              {teamStats.checked_in_count || 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--sky)', marginTop: '4px' }}>In shift</div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Checked Out (Completed)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-yellow)', marginTop: '4px' }}>
              {teamStats.checked_out_count || 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Finished shifts</div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Not Checked In</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: teamStats.not_checked_in_count > 0 ? 'var(--coral)' : 'var(--text-muted)', marginTop: '4px' }}>
              {teamStats.not_checked_in_count || 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending arrival</div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Average Working Hours</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-100)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {teamStats.avg_team_hours_formatted || `${teamStats.avg_hours_float || 0}h`}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {teamStats.completed_8h_count || 0} reached 8h
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ATTENDANCE HISTORY / ROSTER TABLE
      ==================================================================== */}
      <div className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-100)' }}>
              {isEmployee ? 'Personal Attendance History' : isManager ? 'Team Attendance Log' : 'Organization Attendance Log'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isEmployee ? 'Review your past check-ins, check-outs, total duration, and overtime records.' : 'Filter by employee, status, or specific date.'}
            </p>
          </div>

          {(isManager || isAdmin) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '30px', fontSize: '12px', width: '170px', paddingTop: '6px', paddingBottom: '6px' }}
                />
              </div>

              {/* Status Filter */}
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ fontSize: '12px', paddingTop: '6px', paddingBottom: '6px', width: 'auto' }}
              >
                <option value="all">All Statuses</option>
                <option value="Present">Present (Active)</option>
                <option value="Completed">Completed (8h)</option>
                <option value="Overtime">Overtime</option>
                <option value="Short">Short (&lt;8h)</option>
              </select>

              {/* Date Filter */}
              <input
                type="date"
                className="form-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ fontSize: '12px', paddingTop: '6px', paddingBottom: '6px', width: 'auto' }}
              />

              {dateFilter && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDateFilter('')}
                  style={{ fontSize: '11.5px', padding: '6px 10px' }}
                >
                  Clear Date
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading attendance records...
          </div>
        ) : (isEmployee ? history : filteredTeamRecords).length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0', textAlign: 'center' }}>
            <Clock size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-200)', marginBottom: '4px' }}>No Attendance Records Found</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {isEmployee ? 'Start tracking your workday by clicking Check In above.' : 'No records match the current filter selection.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {!isEmployee && <th>Employee</th>}
                  {!isEmployee && <th>Department</th>}
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Total Hours</th>
                  <th>Target</th>
                  <th>Overtime</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(isEmployee ? history : filteredTeamRecords).map((rec) => {
                  const isPresent = rec.status === 'Present';
                  const isOvertime = rec.status === 'Overtime';
                  const isCompleted = rec.status === 'Completed';
                  const isShort = rec.status === 'Short';

                  return (
                    <tr key={rec.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-100)', fontSize: '13px' }}>
                          {rec.date_display || rec.date}
                        </span>
                      </td>

                      {!isEmployee && (
                        <td>
                          <div className="table-avatar-cell">
                            <div
                              className="table-avatar"
                              style={{ background: 'linear-gradient(135deg, #FFE44D, #FFD21F)', color: '#0A0A0A' }}
                            >
                              {(rec.employee_name || 'U')[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-100)' }}>
                                {rec.employee_name}
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--primary-yellow)', fontFamily: 'var(--font-mono)' }}>
                                {rec.employee_id}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {!isEmployee && (
                        <td>
                          <span className="badge" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '11px' }}>
                            {rec.department || 'General'}
                          </span>
                        </td>
                      )}

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px', color: 'var(--text-200)' }}>
                          {rec.check_in || '—'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px', color: 'var(--text-200)' }}>
                          {rec.check_out || '—'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13.5px', color: isOvertime ? 'var(--emerald)' : isCompleted ? 'var(--text-100)' : 'var(--text-300)' }}>
                          {rec.total_duration_formatted || `${Math.floor((rec.total_duration_minutes || 0) / 60)}h ${(rec.total_duration_minutes || 0) % 60}m`}
                        </span>
                      </td>

                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        8h 00m
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: isOvertime ? 'var(--emerald)' : 'var(--text-muted)', fontWeight: isOvertime ? 700 : 500 }}>
                          {rec.overtime_formatted && rec.overtime_formatted !== '00h 00m' ? `+${rec.overtime_formatted}` : '—'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            isPresent
                              ? 'badge-in-progress'
                              : isOvertime
                              ? 'badge-completed'
                              : isCompleted
                              ? 'badge-completed'
                              : 'badge-pending'
                          }`}
                          style={{ fontSize: '11px', fontWeight: 800 }}
                        >
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
