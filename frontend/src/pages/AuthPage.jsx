import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  User,
  Briefcase,
  Sparkles,
  Lock,
  Mail,
  Phone,
  Building,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api } from '../services/api';

export default function AuthPage({ onLoginSuccess, showToast }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loginRole, setLoginRole] = useState('manager'); // 'manager' | 'employee' | 'admin'
  const [loginIdentifier, setLoginIdentifier] = useState('alex@workmate.io');
  const [loginPassword, setLoginPassword] = useState('Demo@1234');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state (Managers only)
  const [regForm, setRegForm] = useState({
    full_name: '',
    manager_id: '',
    email: '',
    phone: '',
    department: 'Engineering',
    password: '',
    confirm_password: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [regLoading, setRegLoading] = useState(false);

  // Switch Role Tabs in Login
  const handleSelectRole = (role) => {
    setLoginRole(role);
    setLoginError('');
    if (role === 'manager') {
      setLoginIdentifier('alex@workmate.io');
      setLoginPassword('Demo@1234');
    } else if (role === 'employee') {
      setLoginIdentifier('sarah.jenkins@workmate.io');
      setLoginPassword('Emp@1234');
    } else if (role === 'admin') {
      setLoginIdentifier('admin@workmate.io');
      setLoginPassword('Admin@1234');
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(regForm.password);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['var(--coral)', 'var(--amber)', 'var(--primary-yellow)', 'var(--emerald)', 'var(--emerald)'];

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginIdentifier.trim() || !loginPassword) {
      setLoginError('Please enter your identifier and password.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await api.login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
        role: loginRole,
      });

      if (res.ok) {
        showToast(`Welcome back, ${res.data.user.full_name || res.data.user.name || 'User'}!`, 'success');
        onLoginSuccess(res.data.user, res.data.role);
      } else {
        setLoginError(res.data.error || 'Invalid credentials.');
      }
    } catch (err) {
      setLoginError('Server connection error.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegErrors({});

    const errs = {};
    if (!regForm.full_name.trim()) errs.full_name = 'Full name is required.';
    if (!regForm.manager_id.trim()) errs.manager_id = 'Manager ID is required.';
    if (!regForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) errs.email = 'Valid work email required.';
    if (!regForm.phone.trim()) errs.phone = 'Phone number is required.';
    if (!regForm.password || regForm.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (regForm.password !== regForm.confirm_password) errs.confirm_password = 'Passwords do not match.';

    if (Object.keys(errs).length > 0) {
      setRegErrors(errs);
      return;
    }

    setRegLoading(true);
    try {
      const res = await api.register(regForm);
      if (res.ok) {
        showToast('Manager account created successfully! You can now log in.', 'success');
        setTab('login');
        setLoginRole('manager');
        setLoginIdentifier(regForm.email);
        setLoginPassword('');
      } else {
        setRegErrors({ global: res.data.error || 'Registration failed.' });
      }
    } catch (err) {
      setRegErrors({ global: 'Server connection error.' });
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 20%, rgba(255, 210, 31, 0.05), transparent 50%), radial-gradient(circle at 10% 90%, rgba(124, 58, 237, 0.04), transparent 40%), var(--bg-pure)',
        padding: '30px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: tab === 'login' ? '480px' : '560px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 40px',
          boxShadow: 'var(--shadow-xl), var(--glow-gold)',
          transition: 'all 0.3s var(--ease)',
        }}
      >
        {/* WorkMate Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <img
              src="/logo.png"
              alt="WorkMate"
              style={{
                height: '52px',
                maxWidth: '220px',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // Fallback to text icon if logo image fails
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-100)', letterSpacing: '-0.5px' }}>
            Work<span style={{ color: 'var(--primary-yellow)' }}>Mate</span>
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {tab === 'login' ? 'Enterprise Workspace & Attendance Portal' : 'Create a New Manager Workspace Account'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            marginBottom: '22px',
            border: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setLoginError('');
            }}
            style={{
              flex: 1,
              padding: '8px',
              background: tab === 'login' ? 'var(--primary-yellow)' : 'transparent',
              color: tab === 'login' ? '#0A0A0A' : 'var(--text-300)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s var(--ease)',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setRegErrors({});
            }}
            style={{
              flex: 1,
              padding: '8px',
              background: tab === 'register' ? 'var(--primary-yellow)' : 'transparent',
              color: tab === 'register' ? '#0A0A0A' : 'var(--text-300)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s var(--ease)',
            }}
          >
            Create Manager Account
          </button>
        </div>

        {/* Role Selector for Sign In: Manager Login | Employee Login | CEO/Admin Login */}
        {tab === 'login' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
              Select Login Role:
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                background: 'var(--bg-surface)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                onClick={() => handleSelectRole('manager')}
                style={{
                  padding: '9px 4px',
                  background: loginRole === 'manager' ? 'var(--primary-yellow)' : 'transparent',
                  color: loginRole === 'manager' ? '#0A0A0A' : 'var(--text-300)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--ease)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                👔 Manager Login
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('employee')}
                style={{
                  padding: '9px 4px',
                  background: loginRole === 'employee' ? 'var(--primary-yellow)' : 'transparent',
                  color: loginRole === 'employee' ? '#0A0A0A' : 'var(--text-300)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--ease)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                👤 Employee Login
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                style={{
                  padding: '9px 4px',
                  background: loginRole === 'admin' ? 'var(--primary-yellow)' : 'transparent',
                  color: loginRole === 'admin' ? '#0A0A0A' : 'var(--text-300)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--ease)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                🛡️ CEO/Admin Login
              </button>
            </div>

            {/* Employee Account Creation Notice */}
            {loginRole === 'employee' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--sky)',
                  fontSize: '12px',
                  marginTop: '12px',
                }}
              >
                <Info size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <strong>Employee accounts are created by your Manager.</strong> If you do not have an account, please request credentials from your reporting manager.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            SIGN IN FORM
        ==================================================================== */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            {loginError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(240, 124, 108, 0.15)',
                  border: '1px solid rgba(240, 124, 108, 0.3)',
                  color: 'var(--coral)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '18px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {loginError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {loginRole === 'manager'
                  ? 'Manager ID / Work Email'
                  : loginRole === 'employee'
                  ? 'Employee ID / Work Email'
                  : 'CEO / Admin Email'}
              </label>
              <input
                type="text"
                className="form-control"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder={
                  loginRole === 'manager'
                    ? 'e.g. alex@workmate.io or MGR-001'
                    : loginRole === 'employee'
                    ? 'e.g. sarah.jenkins@workmate.io or EMP-001'
                    : 'e.g. admin@workmate.io'
                }
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <span style={{ fontSize: '12px', color: 'var(--primary-yellow)', cursor: 'pointer' }}>
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  className="form-control"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
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
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <input type="checkbox" id="remember" defaultChecked style={{ accentColor: 'var(--primary-yellow)' }} />
              <label htmlFor="remember" style={{ fontSize: '12.5px', color: 'var(--text-300)', cursor: 'pointer' }}>
                Remember me on this browser
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '14px' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing in...' : `Sign In as ${loginRole === 'manager' ? 'Manager' : loginRole === 'employee' ? 'Employee' : 'CEO / Admin'}`}
            </button>
          </form>
        ) : (
          /* ====================================================================
              MANAGER REGISTER FORM
          ==================================================================== */
          <form onSubmit={handleRegisterSubmit}>
            {regErrors.global && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(240, 124, 108, 0.15)',
                  border: '1px solid rgba(240, 124, 108, 0.3)',
                  color: 'var(--coral)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '18px',
                  fontSize: '13px',
                }}
              >
                {regErrors.global}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={regForm.full_name}
                  onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                />
                {regErrors.full_name && <span className="field-error">{regErrors.full_name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Manager ID *</label>
                <input
                  type="text"
                  className="form-control"
                  value={regForm.manager_id}
                  onChange={(e) => setRegForm({ ...regForm, manager_id: e.target.value })}
                  placeholder="e.g. MGR-105"
                />
                {regErrors.manager_id && <span className="field-error">{regErrors.manager_id}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Work Email *</label>
                <input
                  type="email"
                  className="form-control"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="alex@workmate.io"
                />
                {regErrors.email && <span className="field-error">{regErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input
                  type="tel"
                  className="form-control"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
                {regErrors.phone && <span className="field-error">{regErrors.phone}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-control"
                value={regForm.department}
                onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
              >
                <option>Engineering</option>
                <option>Operations</option>
                <option>Product</option>
                <option>Human Resources</option>
                <option>Design</option>
                <option>Marketing</option>
                <option>QA</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-control"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Min 8 chars"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
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
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {regErrors.password && <span className="field-error">{regErrors.password}</span>}

                {/* Password Strength Indicator */}
                {regForm.password && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          style={{
                            flex: 1,
                            borderRadius: '2px',
                            background:
                              strengthScore >= step
                                ? strengthColors[strengthScore]
                                : 'var(--bg-surface)',
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: strengthColors[strengthScore], marginTop: '2px', display: 'block' }}>
                      Strength: {strengthLabels[strengthScore]}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={regForm.confirm_password}
                  onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })}
                  placeholder="Repeat password"
                />
                {regErrors.confirm_password && <span className="field-error">{regErrors.confirm_password}</span>}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '14px', marginTop: '6px' }}
              disabled={regLoading}
            >
              {regLoading ? 'Creating Manager Account...' : 'Register Manager Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
