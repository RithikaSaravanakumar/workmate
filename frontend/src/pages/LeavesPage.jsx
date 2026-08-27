import React, { useState, useEffect } from 'react';
import {
  Palmtree,
  Plus,
  Filter,
  Check,
  X,
  Eye,
  Trash2,
  Clock,
  Send,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';

export default function LeavesPage({
  user,
  searchQuery,
  onOpenLeaveModal,
  onOpenLeaveDetails,
  onOpenRejectModal,
  onDeleteLeave,
  showToast,
}) {
  const [leaves, setLeaves] = useState([]);
  const [managerOwnLeaves, setManagerOwnLeaves] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'my-leaves'
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const isManager = user?.role === 'manager';

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.q = searchQuery;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const [leavesRes, statsRes] = await Promise.all([
        api.getLeaves(params),
        api.getLeaveStats(),
      ]);

      if (leavesRes.ok) setLeaves(leavesRes.data);
      if (statsRes.ok) setStats(statsRes.data);

      if (isManager) {
        const mgrOwnRes = await api.getManagerOwnLeaves();
        if (mgrOwnRes.ok) setManagerOwnLeaves(mgrOwnRes.data);
      }
    } catch (e) {
      showToast('Network error loading leaves.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [user, searchQuery, typeFilter, statusFilter]);

  const handleApprove = async (id) => {
    try {
      const res = await api.approveLeave(id, 'Approved by manager.');
      if (res.ok) {
        showToast(`Leave request ${id} approved!`, 'success');
        loadLeaves();
      } else {
        showToast(res.data.error || 'Failed to approve.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  const displayedLeaves = isManager && activeTab === 'my-leaves' ? managerOwnLeaves : leaves;

  return (
    <div>
      {/* Top KPI Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-amber">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <Clock size={20} />
            </div>
            <span className="badge badge-pending">Action Needed</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>
            {stats?.pending || 0}
          </div>
          <div className="stat-label">Pending Reviews</div>
          <div className="stat-sub">Awaiting management sign-off</div>
        </div>

        <div className="stat-card stat-card-emerald">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)' }}>
              <CheckCircle2 size={20} />
            </div>
            <span className="badge badge-completed">Approved</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--emerald)' }}>
            {stats?.approved || 0}
          </div>
          <div className="stat-label">Approved Requests</div>
          <div className="stat-sub">Granted time off</div>
        </div>

        <div className="stat-card stat-card-gold">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-yellow)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary-yellow)' }}>
            {stats?.total_days_off || 0}
          </div>
          <div className="stat-label">Total Days Off</div>
          <div className="stat-sub">Cumulative team leave days</div>
        </div>

        <div className="stat-card stat-card-rose">
          <div className="stat-card-top">
            <div className="stat-icon" style={{ background: 'var(--rose-bg)', color: 'var(--rose)' }}>
              <XCircle size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--rose)' }}>
            {stats?.rejected || 0}
          </div>
          <div className="stat-label">Rejected Requests</div>
          <div className="stat-sub">Declined applications</div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div
        className="card"
        style={{
          padding: '16px 22px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
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
                  background: activeTab === 'team' ? 'var(--primary-yellow)' : 'transparent',
                  color: activeTab === 'team' ? '#0A0A0A' : 'var(--text-300)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s var(--ease)',
                }}
              >
                Team Requests ({leaves.length})
              </button>
              <button
                onClick={() => setActiveTab('my-leaves')}
                style={{
                  background: activeTab === 'my-leaves' ? 'var(--primary-yellow)' : 'transparent',
                  color: activeTab === 'my-leaves' ? '#0A0A0A' : 'var(--text-300)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s var(--ease)',
                }}
              >
                My Manager Leaves (To CEO)
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="form-control"
              style={{ width: '150px', height: '38px', fontSize: '13px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              className="form-control"
              style={{ width: '150px', height: '38px', fontSize: '13px' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Casual">Casual</option>
              <option value="Sick">Sick</option>
              <option value="Annual">Annual</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onOpenLeaveModal}>
          <Plus size={16} />
          <span>{isManager ? '+ Request Manager Leave' : '+ Request Time Off'}</span>
        </button>
      </div>

      {/* Leaves Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Dates</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Reason</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading leave records...
                  </td>
                </tr>
              ) : displayedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                displayedLeaves.map((l) => (
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
                          {(l.employee_name || 'U')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-100)' }}>{l.employee_name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{l.department}</div>
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
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--text-300)' }}>
                      "{l.reason}"
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="View Details"
                          onClick={() => onOpenLeaveDetails(l)}
                        >
                          <Eye size={13} />
                        </button>
                        {isManager && activeTab === 'team' && l.status === 'Pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              title="Approve Leave"
                              onClick={() => handleApprove(l.id)}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Reject Leave"
                              onClick={() => onOpenRejectModal(l.id)}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete Request"
                          onClick={() => onDeleteLeave(l.id)}
                        >
                          <Trash2 size={13} />
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
    </div>
  );
}
