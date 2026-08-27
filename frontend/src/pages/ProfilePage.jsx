import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar, Lock, CheckCircle2, Shield, Sparkles, KeyRound, Users } from 'lucide-react';
import { api } from '../services/api';

export default function ProfilePage({ user, onProfileUpdate, showToast }) {
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    name: '',
    email: '',
    phone: '',
    department: 'Engineering',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [teamData, setTeamData] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || user.name || '',
        name: user.name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || 'Engineering',
      });

      if (user.role === 'employee') {
        api.getMyTeam().then((res) => {
          if (res.ok) setTeamData(res.data);
        });
      }
    }
  }, [user]);

  const isManager = user?.role === 'manager';
  const fullName = user?.full_name || user?.name || 'Alex Morgan';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErrors({});

    const errs = {};
    if (!profileForm.full_name.trim() || profileForm.full_name.length < 2) {
      errs.full_name = 'Name must be at least 2 characters.';
    }
    if (!profileForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errs.email = 'Valid email is required.';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setProfileLoading(true);
    try {
      const res = await api.updateProfile(profileForm);
      if (res.ok) {
        showToast('Profile details updated successfully!', 'success');
        onProfileUpdate(res.data.user);
      } else {
        setProfileErrors({ global: res.data.error || 'Update failed.' });
      }
    } catch (e) {
      setProfileErrors({ global: 'Network error.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    const errs = {};
    if (!passwordForm.current_password) errs.current_password = 'Current password is required.';
    if (!passwordForm.new_password || passwordForm.new_password.length < 6) {
      errs.new_password = 'New password must be at least 6 characters.';
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errs.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword(passwordForm);
      if (res.ok) {
        showToast('Security password changed successfully!', 'success');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setPasswordErrors({ global: res.data.error || 'Password change failed.' });
      }
    } catch (e) {
      setPasswordErrors({ global: 'Network error.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      {/* Profile Overview Card */}
      <div
        className="card"
        style={{
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '28px 32px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFE44D 0%, #FFD21F 100%)',
            color: '#0A0A0A',
            fontWeight: 800,
            fontSize: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(255, 210, 31, 0.3)',
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-100)' }}>
              {fullName}
            </h2>
            <span className="badge badge-in-progress">
              {isManager ? '👔 Manager' : '👤 Employee'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '8px',
              fontSize: '13px',
              color: 'var(--text-300)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={14} color="var(--primary-yellow)" /> {user?.department || 'Engineering'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="var(--primary-yellow)" /> {user?.email || 'alex@workmate.io'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="var(--primary-yellow)" /> Member since {user?.created_at?.split(' ')[0] || 'Jan 2025'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Edit Profile Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <User size={18} color="var(--primary-yellow)" /> Account Details
            </h3>
          </div>

          <form onSubmit={handleProfileSubmit}>
            {profileErrors.global && (
              <div style={{ padding: '10px', background: 'var(--coral-bg)', color: 'var(--coral)', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                {profileErrors.global}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              />
              {profileErrors.full_name && <span className="field-error">{profileErrors.full_name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Work Email *</label>
              <input
                type="email"
                className="form-control"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
              {profileErrors.email && <span className="field-error">{profileErrors.email}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-control"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
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

            <div style={{ marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <KeyRound size={18} color="var(--primary-yellow)" /> Change Security Password
            </h3>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            {passwordErrors.global && (
              <div style={{ padding: '10px', background: 'var(--coral-bg)', color: 'var(--coral)', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                {passwordErrors.global}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                type="password"
                className="form-control"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                placeholder="••••••••"
              />
              {passwordErrors.current_password && <span className="field-error">{passwordErrors.current_password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">New Password (min 6 characters) *</label>
              <input
                type="password"
                className="form-control"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                placeholder="••••••••"
              />
              {passwordErrors.new_password && <span className="field-error">{passwordErrors.new_password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                className="form-control"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                placeholder="••••••••"
              />
              {passwordErrors.confirm_password && <span className="field-error">{passwordErrors.confirm_password}</span>}
            </div>

            <div style={{ marginTop: '10px' }}>
              <button type="submit" className="btn btn-secondary" disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Employee Team Structure Card */}
      {user?.role === 'employee' && teamData && (
        <div className="card" style={{ marginTop: '28px', padding: '24px 28px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h3 className="card-title">
              <Users size={18} color="var(--primary-yellow)" /> My Reporting Team &amp; Manager
            </h3>
            <p className="card-subtext">Assigned organizational hierarchy and peer department team members.</p>
          </div>

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
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFE44D 0%, #FFD21F 100%)',
                  color: '#0A0A0A',
                  fontWeight: 800,
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(255, 210, 31, 0.3)',
                }}
              >
                {(teamData.manager?.name || 'M')[0]}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary-yellow)', textTransform: 'uppercase' }}>
                  Reporting Manager
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-100)', marginTop: '2px' }}>
                  {teamData.manager?.name || 'Alex Morgan'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span>ID: <strong style={{ color: 'var(--text-200)', fontFamily: 'var(--font-mono)' }}>{teamData.manager?.manager_id || 'MGR-001'}</strong></span>
                  <span>Dept: <strong style={{ color: 'var(--text-200)' }}>{teamData.manager?.department || user?.department}</strong></span>
                  {teamData.manager?.email && <span>Email: <strong style={{ color: 'var(--text-200)' }}>{teamData.manager.email}</strong></span>}
                </div>
              </div>
            </div>
            <span className="badge badge-in-progress">👔 Manager</span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-200)', marginBottom: '12px' }}>
            Team Members ({teamData.team_members?.length || 0})
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {(teamData.team_members || []).map((m) => {
              const isMe = m.employee_id === user?.employee_id;
              return (
                <div
                  key={m.employee_id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isMe ? 'rgba(255, 210, 31, 0.05)' : 'var(--bg-base)',
                    border: isMe ? '1px solid rgba(255, 210, 31, 0.3)' : '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: isMe ? 'var(--primary-yellow)' : 'var(--bg-surface-elevated)',
                      color: isMe ? '#0A0A0A' : 'var(--text-100)',
                      fontWeight: 800,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {(m.name || 'E')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-100)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name} {isMe && <span style={{ color: 'var(--primary-yellow)', fontSize: '11px' }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {m.employee_id} • {m.department}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
