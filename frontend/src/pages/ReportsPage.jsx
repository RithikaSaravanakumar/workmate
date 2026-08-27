import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Palmtree, CheckCircle2, Download, Printer, Award, Sparkles, Building } from 'lucide-react';
import { api } from '../services/api';

export default function ReportsPage({ user, showToast }) {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    if (!user || user.role === 'employee') return;
    setLoading(true);
    try {
      const res = await api.getReports();
      if (res.ok && res.data) {
        setReports(res.data);
      } else if (res.status === 401 || res.status === 403) {
        /* Session expired or role restricted */
      } else {
        showToast(res.data?.error || 'Failed to load team analytics.', 'error');
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        Loading team analytics and productivity metrics...
      </div>
    );
  }

  const rate = reports?.completion_rate || 0;

  return (
    <div>
      {/* Top Banner & Export */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-100)' }}>
            Productivity Analytics &amp; Reports
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Comprehensive team turnaround time, task completion velocity, and department breakdowns.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-gold">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-yellow)' }}>
              <TrendingUp size={20} />
            </div>
            <span className="stat-trend trend-up">
              <Sparkles size={12} /> Target: 85%
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary-yellow)' }}>
            {rate}%
          </div>
          <div className="stat-label">Team Completion Velocity</div>
          <div className="workload-bar-wrap">
            <div
              className="workload-bar-fill"
              style={{ width: `${rate}%`, background: 'var(--primary-yellow)' }}
            />
          </div>
          <div className="stat-sub">
            {reports?.completed_tasks || 0} of {reports?.total_tasks || 0} tasks finished
          </div>
        </div>

        <div className="stat-card stat-card-sky">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--sky-bg)', color: 'var(--sky)' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{reports?.total_employees || 0}</div>
          <div className="stat-label">Active Workforce</div>
          <div className="stat-sub">Across 5 departments</div>
        </div>

        <div className="stat-card stat-card-emerald">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--emerald)' }}>
            {reports?.leave_stats?.approved || 0}
          </div>
          <div className="stat-label">Granted Time Off Requests</div>
          <div className="stat-sub">{reports?.leave_stats?.total_leave_days_approved || 0} total scheduled days</div>
        </div>

        <div className="stat-card stat-card-violet">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--violet-bg)', color: 'var(--lavender)' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--lavender)' }}>
            Optimal
          </div>
          <div className="stat-label">Workload Balance Score</div>
          <div className="stat-sub">Low burnout risk index</div>
        </div>
      </div>

      {/* Department Breakdown Cards */}
      {reports?.department_breakdown && reports.department_breakdown.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Building size={18} color="var(--sky)" /> Department Performance Breakdown
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {reports.department_breakdown.map((dept, idx) => {
              const deptRate = dept.tasks > 0 ? Math.round((dept.completed / dept.tasks) * 100) : 0;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-100)' }}>
                      {dept.department}
                    </span>
                    <span className="badge badge-in-progress" style={{ fontSize: '11px' }}>
                      {dept.employees} {dept.employees === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-300)' }}>
                      <span>Completion: {dept.completed}/{dept.tasks}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-yellow)' }}>{deptRate}%</span>
                    </div>
                    <div className="workload-bar-wrap">
                      <div
                        className="workload-bar-fill"
                        style={{ width: `${deptRate}%`, background: 'var(--primary-yellow)' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Employee Productivity Leaderboard Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={18} color="var(--primary-yellow)" /> Team Productivity Leaderboard
          </h3>
        </div>

        <div className="table-wrap">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Department</th>
                <th>Total Assigned</th>
                <th>In Progress</th>
                <th>Completed</th>
                <th>Completion Rate</th>
                <th>Approved Leaves</th>
              </tr>
            </thead>
            <tbody>
              {!reports?.employee_stats || reports.employee_stats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No employee performance data available.
                  </td>
                </tr>
              ) : (
                reports.employee_stats.map((emp) => (
                  <tr key={emp.employee_id}>
                    <td>
                      <div className="table-avatar-cell">
                        <div
                          className="table-avatar"
                          style={{ background: 'linear-gradient(135deg, #FFE44D, #FFD21F)', color: '#0A0A0A' }}
                        >
                          {(emp.name || 'U')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-100)' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        {emp.department}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{emp.total_tasks}</td>
                    <td>
                      <span className="badge badge-in-progress">{emp.in_progress}</span>
                    </td>
                    <td>
                      <span className="badge badge-completed">{emp.completed}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '70px', height: '6px', background: 'var(--bg-surface)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${emp.completion_rate}%`,
                              height: '100%',
                              background: emp.completion_rate >= 80 ? 'var(--emerald)' : 'var(--primary-yellow)',
                              borderRadius: '99px',
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-100)' }}>
                          {emp.completion_rate}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-300)', fontSize: '12.5px' }}>
                        {emp.days_off} {emp.days_off === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
