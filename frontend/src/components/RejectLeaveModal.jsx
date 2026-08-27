import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, XCircle } from 'lucide-react';

export default function RejectLeaveModal({ isOpen, leaveId, onSubmit, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const presets = [
    'Critical sprint release conflict on these requested dates.',
    'Insufficient team bandwidth during this project phase.',
    'Please reschedule to after the quarterly milestone review.',
    'Overlapping leave with other core department members.',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please enter a rejection reason (min. 3 characters).');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(leaveId, reason.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(240, 124, 108, 0.15)',
                color: 'var(--coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ color: 'var(--coral)' }}>
                Reject Leave Request
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Target Request: <strong style={{ color: 'var(--primary-yellow)' }}>{leaveId}</strong>
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '13px', color: 'var(--text-300)', lineHeight: '1.4', marginBottom: '16px' }}>
              Please provide clear constructive feedback for rejecting request{' '}
              <strong style={{ color: 'var(--primary-yellow)' }}>{leaveId}</strong>. This note will be recorded and shown to the employee.
            </p>

            <div className="form-group">
              <label className="form-label">Rejection Reason *</label>
              <textarea
                className="form-control"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Detail why this leave request cannot be approved..."
                rows={3}
              />
              {error && <span className="field-error">{error}</span>}
            </div>

            {/* Quick Presets */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                ⚡ Quick Presets:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: '11.5px', padding: '6px 10px' }}
                    onClick={() => {
                      setReason(p);
                      setError('');
                    }}
                  >
                    • {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              <XCircle size={15} />
              <span>{loading ? 'Rejecting...' : 'Confirm Rejection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
