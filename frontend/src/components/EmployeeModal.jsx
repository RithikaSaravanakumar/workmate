import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, User, Mail, Phone, Building, KeyRound, UserPlus, Shield, Image } from 'lucide-react';

export default function EmployeeModal({ isOpen, mode = 'add', initialData = null, managerName = '', onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    department: 'Engineering',
    password: '',
    avatar: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          employee_id: initialData.employee_id || '',
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          department: initialData.department || 'Engineering',
          password: '',
          avatar: initialData.avatar || '',
        });
      } else {
        const randomNum = Math.floor(100 + Math.random() * 900);
        setFormData({
          employee_id: `EMP-${randomNum}`,
          name: '',
          email: '',
          phone: '',
          department: 'Engineering',
          password: 'Emp@1234',
          avatar: '',
        });
      }
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.employee_id.trim()) errs.employee_id = 'Employee ID is required.';
    if (!formData.name.trim() || formData.name.length < 2) errs.name = 'Full name must be at least 2 characters.';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Valid work email is required.';
    if (mode === 'add' && (!formData.password || formData.password.length < 6)) {
      errs.password = 'Initial password must be at least 6 characters.';
    }
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
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="modal-title">{mode === 'edit' ? 'Edit Team Member' : 'Create Employee Account'}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {mode === 'edit'
                  ? 'Update employee profile & department assignments'
                  : 'Onboard a new employee with login access credentials under your management'}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Role & Reporting Hierarchy Indicator */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>System Role</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sky)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={13} /> Employee
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Reporting Manager</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary-yellow)', marginTop: '2px' }}>
                  {managerName || 'Your Account (Manager)'}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Employee ID *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.employee_id}
                  disabled={mode === 'edit'}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="e.g. EMP-101"
                />
                {errors.employee_id && <span className="field-error">{errors.employee_id}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Building size={13} style={{ display: 'inline', marginRight: '4px' }} /> Department *
                </label>
                <select
                  className="form-control"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  <option>Engineering</option>
                  <option>Backend</option>
                  <option>Design</option>
                  <option>Product</option>
                  <option>Operations</option>
                  <option>Marketing</option>
                  <option>DevOps</option>
                  <option>QA</option>
                  <option>Human Resources</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Full Name *
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Mail size={13} style={{ display: 'inline', marginRight: '4px' }} /> Work Email *
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sarah.jenkins@workmate.io"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={13} style={{ display: 'inline', marginRight: '4px' }} /> Phone (Optional)
                </label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 234-5678"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Image size={13} style={{ display: 'inline', marginRight: '4px' }} /> Profile Photo / Avatar URL (Optional)
              </label>
              <input
                type="url"
                className="form-control"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://images.unsplash.com/... or leave empty for monogram"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  <KeyRound size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {mode === 'edit' ? 'Reset Password (Leave blank to keep unchanged)' : 'Initial / Temporary Password *'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const randomPwd = 'Emp@' + Math.floor(1000 + Math.random() * 9000);
                    setFormData({ ...formData, password: randomPwd });
                    setShowPassword(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-yellow)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Generate Password
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={mode === 'edit' ? 'Enter new password...' : 'e.g. Emp@1234'}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : mode === 'edit' ? 'Save Changes' : '+ Create Employee Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
