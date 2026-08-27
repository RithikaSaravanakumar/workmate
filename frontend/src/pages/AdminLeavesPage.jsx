import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Eye, Palmtree, User, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AdminLeavesPage({ user, onOpenLeaveDetails, showToast }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminLeaves();
      if (res.ok) {
        setLeaves(res.data);
      } else {
        showToast('Failed to load manager leave requests.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await api.ceoApproveLeave(id, 'Approved by CEO / Executive Office.');
      if (res.ok) {
        showToast(`Manager leave ${id} approved by CEO!`, 'success');
        loadLeaves();
      } else {
        showToast(res.data.error || 'Approval failed.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please enter a rejection reason for this manager leave:');
    if (!reason || reason.trim().length < 3) return;

    try {
      const res = await api.ceoRejectLeave(id, reason.trim());
      if (res.ok) {
        showToast(`Manager leave ${id} rejected.`, 'info');
        loadLeaves();
      } else {
        showToast(res.data.error || 'Rejection failed.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="badge"
            style={{
              background: 'rgba(124, 58, 237, 0.15)',
              color: 'var(--lavender)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
            }}
          >
            🛡️ Executive Approver
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-100)' }}>
            CEO &amp; Admin Leave Approvals
          </h2>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Review and execute executive sign-offs on personal time-off requests submitted by Managers.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <ShieldCheck size={18} color="var(--primary-yellow)" /> Manager Leave Applications ({leaves.length})
          </h3>
        </div>

        <div className="table-wrap">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Leave ID</th>
                <th>Manager</th>
                <th>Category</th>
                <th>Dates &amp; Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Executive Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Loading executive review queue...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className="empty-state-icon">
                      <ShieldCheck size={28} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-100)', fontSize: '16px' }}>
                      No Manager Leaves Pending
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      All manager leave requests have been reviewed and resolved.
                    </p>
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
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
                          {(l.employee_name || 'M')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-100)' }}>{l.employee_name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>ID: {l.manager_id}</div>
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
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-100)' }}>
                        {l.start_date} → {l.end_date}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--primary-yellow)', fontWeight: 700 }}>
                        {l.days_count} Days
                      </div>
                    </td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--text-300)' }}>
                      "{l.reason}"
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
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {l.status === 'Pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleApprove(l.id)}
                              title="CEO Approve"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReject(l.id)}
                              title="CEO Reject"
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => onOpenLeaveDetails(l)}
                          title="View Details"
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
    </div>
  );
}
