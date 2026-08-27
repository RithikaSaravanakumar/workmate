import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Palmtree, User, FileText } from 'lucide-react';

export default function LeaveModal({ isOpen, isManager = false, employees = [], onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: 'Casual',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [daysCount, setDaysCount] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const toYMD = (d) => {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
      };

      setFormData({
        employee_id: isManager && employees.length ? employees[0].employee_id : '',
        leave_type: 'Casual',
        start_date: toYMD(today),
        end_date: toYMD(tomorrow),
        reason: '',
      });
      setErrors({});
    }
  }, [isOpen, isManager, employees]);

  // Live days count calculation
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const d1 = new Date(formData.start_date + 'T00:00:00');
      const d2 = new Date(formData.end_date + 'T00:00:00');
      if (d2 >= d1) {
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
        setDaysCount(diffDays);
      } else {
        setDaysCount(-1); // Invalid range
      }
    } else {
      setDaysCount(0);
    }
  }, [formData.start_date, formData.end_date]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (isManager && !formData.employee_id) errs.employee_id = 'Please select a team member.';
    if (!formData.leave_type) errs.leave_type = 'Leave type is required.';
    if (!formData.start_date) errs.start_date = 'Start date is required.';
    if (!formData.end_date) errs.end_date = 'End date is required.';
    if (daysCount === -1) errs.end_date = 'End date cannot precede start date.';
    if (!formData.reason.trim() || formData.reason.length < 3) errs.reason = 'Reason must be at least 3 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
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
              <h2 className="modal-title">
                {isManager ? 'Submit Manager Leave Request' : 'Request Time Off'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {isManager
                  ? 'Request scheduled time off submitted for CEO approval'
                  : 'Submit a leave request for manager review and approval'}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Leave Category *</label>
              <select
                className="form-control"
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
              >
                <option value="Casual">🌴 Casual Leave</option>
                <option value="Sick">🩺 Sick / Medical Leave</option>
                <option value="Annual">✈️ Annual Paid Leave</option>
                <option value="Emergency">🚨 Emergency Leave</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <CalendarIcon size={13} style={{ display: 'inline', marginRight: '4px' }} /> Start Date *
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                {errors.start_date && <span className="field-error">{errors.start_date}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <CalendarIcon size={13} style={{ display: 'inline', marginRight: '4px' }} /> End Date *
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
                {errors.end_date && <span className="field-error">{errors.end_date}</span>}
              </div>
            </div>

            {daysCount > 0 && (
              <div
                style={{
                  background: 'rgba(255, 210, 31, 0.08)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  color: 'var(--text-100)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Clock size={16} color="var(--primary-yellow)" />
                <span>
                  Total duration: <strong style={{ color: 'var(--primary-yellow)' }}>{daysCount} {daysCount === 1 ? 'day' : 'days'}</strong> off requested.
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Reason for Request *</label>
              <textarea
                className="form-control"
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Explain the reason for taking time off, backup coverage plan, etc..."
              />
              {errors.reason && <span className="field-error">{errors.reason}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || daysCount === -1}>
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
