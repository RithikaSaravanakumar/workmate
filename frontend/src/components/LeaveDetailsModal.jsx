import React from 'react';
import { X, Calendar, Clock, User, CheckCircle2, AlertCircle, MessageSquare, Palmtree, Check, XCircle } from 'lucide-react';

export default function LeaveDetailsModal({ isOpen, leave, isManager = false, onApprove, onReject, onClose }) {
  if (!isOpen || !leave) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 210, 31, 0.12)',
                color: 'var(--primary-yellow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Palmtree size={18} />
            </div>
            <div>
              <h2 className="modal-title">Leave Request Details</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--primary-yellow)', fontWeight: 700 }}>{leave.id}</span> • {leave.leave_type} Leave
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFE44D 0%, #FFD21F 100%)',
                  color: '#0A0A0A',
                  fontWeight: 800,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(leave.employee_name || 'U')[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-100)', fontSize: '13.5px' }}>{leave.employee_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {leave.department} • {leave.employee_id}
                </div>
              </div>
            </div>

            <span
              className={`badge ${
                leave.status === 'Approved'
                  ? 'badge-completed'
                  : leave.status === 'Rejected'
                  ? 'badge-priority-high'
                  : 'badge-pending'
              }`}
            >
              {leave.status}
            </span>
          </div>

          {/* Date info boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Start Date</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-100)', marginTop: '2px' }}>{leave.start_date}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>End Date</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-100)', marginTop: '2px' }}>{leave.end_date}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Duration</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary-yellow)', marginTop: '2px' }}>
                {leave.days_count} {leave.days_count === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Reason for Absence
            </label>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                fontSize: '13.5px',
                color: 'var(--text-100)',
                lineHeight: '1.5',
              }}
            >
              "{leave.reason}"
            </div>
          </div>

          {/* Approver Feedback */}
          {leave.manager_comment && (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--emerald)' }}>
                💬 Approver Feedback &amp; Notes
              </label>
              <div
                style={{
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '13px',
                  color: 'var(--emerald)',
                }}
              >
                {leave.manager_comment}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {leave.status === 'Rejected' && leave.rejection_reason && (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--coral)' }}>
                ✕ Rejection Reason
              </label>
              <div
                style={{
                  background: 'rgba(240, 124, 108, 0.1)',
                  border: '1px solid rgba(240, 124, 108, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '13px',
                  color: 'var(--coral)',
                }}
              >
                {leave.rejection_reason}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {isManager && leave.status === 'Pending' && (
            <>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onClose();
                  onReject(leave.id);
                }}
              >
                <XCircle size={15} />
                <span>Reject</span>
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  onClose();
                  onApprove(leave.id);
                }}
              >
                <Check size={15} />
                <span>Approve Leave</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
