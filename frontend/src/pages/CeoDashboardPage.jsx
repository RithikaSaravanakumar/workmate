import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  CheckSquare,
  Palmtree,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Building,
  Mail,
  Phone,
  ArrowUpRight,
  Sparkles,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

export default function CeoDashboardPage({
  user,
  onNavigate,
  onOpenLeaveDetails,
  showToast,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCeoDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard();
      if (res.ok) {
        setData(res.data);
      } else {
        if (showToast) showToast(res.data?.error || 'Failed to load CEO dashboard.', 'error');
      }
    } catch (e) {
      if (showToast) showToast('Network error loading executive overview.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCeoDashboard();
  }, []);

  const handleApproveLeave = async (leaveId) => {
    setActionLoading(true);
    try {
      const res = await api.ceoApproveLeave(leaveId, 'Approved by CEO / Executive Office');
      if (res.ok) {
        if (showToast) showToast(`Manager leave ${leaveId} approved!`, 'success');
        loadCeoDashboard();
      } else {
        if (showToast) showToast(res.data?.error || 'Failed to approve leave.', 'error');
      }
    } catch (e) {
      if (showToast) showToast('Network error approving leave.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const reason = window.prompt('Enter reason for leave rejection:');
    if (reason === null) return;
    if (!reason.trim()) {
      if (showToast) showToast('Rejection reason is required.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.ceoRejectLeave(leaveId, reason.trim());
      if (res.ok) {
        if (showToast) showToast(`Manager leave ${leaveId} rejected.`, 'info');
        loadCeoDashboard();
      } else {
        if (showToast) showToast(res.data?.error || 'Failed to reject leave.', 'error');
      }
    } catch (e) {
      if (showToast) showToast('Network error rejecting leave.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 12px', display: 'block' }} />
        Loading CEO Executive Dashboard...
      </div>
    );
  }

  const managers = data?.managers || [];
  const pendingLeaves = (data?.manager_leaves || []).filter((l) => l.status === 'Pending');
  const attStats = data?.attendance_stats || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-100)' }}>Executive CEO Portal</h2>
            <span className="badge" style={{ background: 'rgba(255, 210, 31, 0.15)', color: 'var(--primary-yellow)', border: '1px solid rgba(255, 210, 31, 0.3)', fontWeight: 800 }}>
              🛡️ Organization Overview
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Supervise department managers, review executive leave requests, and track company-wide workforce operations.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadCeoDashboard}>
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          className="card card-hover"
          style={{ padding: '20px', cursor: onNavigate ? 'pointer' : 'default' }}
          onClick={() => onNavigate && onNavigate('managers')}
          title={onNavigate ? 'Click to view Managers roster' : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Managers</span>
            <Shield size={18} color="var(--primary-yellow)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-100)', marginTop: '8px' }}>
            {data?.total_managers || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Managing department teams →</div>
        </div>

        <div
          className="card card-hover"
          style={{ padding: '20px', cursor: onNavigate ? 'pointer' : 'default' }}
          onClick={() => onNavigate && onNavigate('employees')}
          title={onNavigate ? 'Click to view Organization Employee directory' : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Employees</span>
            <Users size={18} color="var(--sky)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--sky)', marginTop: '8px' }}>
            {data?.total_employees || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Organization workforce →</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Organization Tasks</span>
            <CheckSquare size={18} color="var(--emerald)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--emerald)', marginTop: '8px' }}>
            {data?.total_tasks || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data?.completed_tasks || 0} completed
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Manager Leaves</span>
            <Palmtree size={18} color="var(--coral)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: (data?.pending_manager_leaves || 0) > 0 ? 'var(--coral)' : 'var(--text-100)', marginTop: '8px' }}>
            {data?.pending_manager_leaves || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting CEO approval</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Workforce Present</span>
            <Clock size={18} color="var(--primary-yellow)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary-yellow)', marginTop: '8px' }}>
            {attStats.present_count || 0} / {attStats.total_workforce || data?.total_employees || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {attStats.attendance_rate || 0}% attendance rate
          </div>
        </div>
      </div>

      {/* Pending Manager Leave Requests */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-100)' }}>
              Pending Manager Leave Requests ({pendingLeaves.length})
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Managers report directly to CEO/Admin. Approve or reject their leave submissions below.
            </p>
          </div>
        </div>

        {pendingLeaves.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 0', textAlign: 'center' }}>
            <Palmtree size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-200)' }}>No Pending Manager Leave Requests</h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              All manager time-off requests have been reviewed.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Manager</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'right' }}>CEO Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span style={{ color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {l.id}
                      </span>
                    </td>
                    <td>
                      <div className="table-avatar-cell">
                        <div className="table-avatar" style={{ background: 'linear-gradient(135deg, #FFE44D, #FFD21F)', color: '#0A0A0A' }}>
                          {(l.employee_name || 'M')[0]}
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-100)' }}>{l.employee_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        {l.department || 'Management'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-in-progress">{l.leave_type}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{l.days_count} {l.days_count === 1 ? 'day' : 'days'}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-200)' }}>
                      {l.start_date} → {l.end_date}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-300)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.reason}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApproveLeave(l.id)}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRejectLeave(l.id)}
                          disabled={actionLoading}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Managers Directory Grid */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-100)' }}>Reporting Managers</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Overview of department heads, assigned staff, and task execution.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >
          {managers.map((m) => (
            <div
              key={m.manager_id}
              style={{
                padding: '18px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFE44D, #FFD21F)',
                    color: '#0A0A0A',
                    fontWeight: 800,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(m.full_name || 'M')[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text-100)' }}>
                    {m.full_name}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {m.manager_id}
                    </span>
                    <span className="badge" style={{ fontSize: '10px', background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                      {m.department}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-300)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={12} color="var(--text-muted)" />
                  <span>{m.email}</span>
                </div>
                {m.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={12} color="var(--text-muted)" />
                    <span>{m.phone}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '10px',
                  background: 'var(--bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                  marginTop: 'auto',
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--sky)' }}>{m.team_size || 0}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Team Size</div>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--emerald)' }}>{m.total_tasks || 0}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Total Tasks</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
