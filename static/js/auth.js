/**
 * auth.js — WorkMate Authentication Page Logic
 * Handles login, registration, field validation, password strength.
 */

"use strict";

// ----------------------------------------------------------------
// Tab Switching
// ----------------------------------------------------------------
function switchAuthTab(tab) {
  const loginSection = document.getElementById('login-form-section');
  const registerSection = document.getElementById('register-form-section');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  if (tab === 'login') {
    loginSection.style.display = 'block';
    registerSection.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.setAttribute('aria-selected', 'false');
  } else {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'false');
    tabRegister.setAttribute('aria-selected', 'true');
  }
}

// ----------------------------------------------------------------
// Toggle Password Visibility
// ----------------------------------------------------------------
function togglePwd(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    iconEl.textContent = '🙈';
  } else {
    input.type = 'password';
    iconEl.textContent = '👁';
  }
}

// ----------------------------------------------------------------
// Field Error Helpers
// ----------------------------------------------------------------
function setFieldError(errId, message) {
  const el = document.getElementById(errId);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('show', !!message);
}

function clearAllErrors(prefix, fields) {
  fields.forEach(f => setFieldError(`${prefix}-${f}-err`, ''));
  const globalErr = document.getElementById(`${prefix}-error`);
  if (globalErr) globalErr.classList.remove('show');
}

function showGlobalError(errorId, message) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
}

// ----------------------------------------------------------------
// Password Strength Indicator
// ----------------------------------------------------------------
function updateStrength(password) {
  const wrap = document.getElementById('pwd-strength-wrap');
  const fill = document.getElementById('strength-fill');
  const text = document.getElementById('strength-text');

  if (!password) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { pct: 20, color: '#ef4444', label: 'Very Weak' },
    { pct: 40, color: '#f59e0b', label: 'Weak' },
    { pct: 60, color: '#f59e0b', label: 'Fair' },
    { pct: 80, color: '#3b82f6', label: 'Strong' },
    { pct: 100, color: '#10b981', label: 'Very Strong' },
  ];

  const level = levels[Math.min(score, 4)];
  fill.style.width = `${level.pct}%`;
  fill.style.background = level.color;
  text.textContent = level.label;
  text.style.color = level.color;
}

// ----------------------------------------------------------------
// Set loading state on button
// ----------------------------------------------------------------
function setLoading(btnId, textId, loading, loadingText = 'Please wait…', defaultText = '') {
  const btn = document.getElementById(btnId);
  const textEl = document.getElementById(textId);
  if (!btn || !textEl) return;
  btn.disabled = loading;
  textEl.textContent = loading ? loadingText : (defaultText || textEl.dataset.default || textEl.textContent);
  if (!textEl.dataset.default) textEl.dataset.default = defaultText;
}

// ----------------------------------------------------------------
// LOGIN
// ----------------------------------------------------------------
async function handleLogin(event) {
  event.preventDefault();
  clearAllErrors('login', ['identifier', 'password']);

  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  let valid = true;
  if (!identifier) { setFieldError('login-identifier-err', 'Manager ID or email is required.'); valid = false; }
  if (!password) { setFieldError('login-password-err', 'Password is required.'); valid = false; }
  if (!valid) return;

  setLoading('login-btn', 'login-btn-text', true, 'Signing in…', 'Sign In');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // Redirect to app
      window.location.href = '/app';
    } else {
      showGlobalError('login-error', data.error || 'Login failed. Please try again.');
    }
  } catch (err) {
    showGlobalError('login-error', 'Network error. Please check your connection.');
  } finally {
    setLoading('login-btn', 'login-btn-text', false, '', 'Sign In');
  }
}

// ----------------------------------------------------------------
// REGISTER
// ----------------------------------------------------------------
async function handleRegister(event) {
  event.preventDefault();
  clearAllErrors('reg', ['name', 'id', 'email', 'phone', 'dept', 'password', 'confirm']);

  const fullName = document.getElementById('reg-name').value.trim();
  const managerId = document.getElementById('reg-id').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const department = document.getElementById('reg-dept').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm').value;

  let valid = true;

  if (!fullName) { setFieldError('reg-name-err', 'Full name is required.'); valid = false; }
  if (!managerId) { setFieldError('reg-id-err', 'Manager ID is required.'); valid = false; }
  if (!email) { setFieldError('reg-email-err', 'Work email is required.'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('reg-email-err', 'Enter a valid email address.'); valid = false; }
  if (!phone) { setFieldError('reg-phone-err', 'Phone number is required.'); valid = false; }
  if (!department) { setFieldError('reg-dept-err', 'Department is required.'); valid = false; }
  if (!password) { setFieldError('reg-password-err', 'Password is required.'); valid = false; }
  else if (password.length < 8) { setFieldError('reg-password-err', 'Password must be at least 8 characters.'); valid = false; }
  if (!confirmPassword) { setFieldError('reg-confirm-err', 'Please confirm your password.'); valid = false; }
  else if (password !== confirmPassword) { setFieldError('reg-confirm-err', 'Passwords do not match.'); valid = false; }

  if (!valid) return;

  setLoading('register-btn', 'register-btn-text', true, 'Creating account…', 'Create Account');

  const errEl = document.getElementById('register-error');
  const successEl = document.getElementById('register-success');
  errEl.classList.remove('show');
  successEl.style.display = 'none';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        manager_id: managerId,
        email,
        phone,
        department,
        password,
        confirm_password: confirmPassword,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      // Show success, then auto-switch to login
      successEl.textContent = '✅ Account created! Redirecting to sign in…';
      successEl.style.display = 'block';
      document.getElementById('register-form').reset();
      document.getElementById('pwd-strength-wrap').style.display = 'none';
      setTimeout(() => switchAuthTab('login'), 2000);
    } else {
      errEl.textContent = data.error || 'Registration failed.';
      errEl.classList.add('show');
    }
  } catch (err) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.classList.add('show');
  } finally {
    setLoading('register-btn', 'register-btn-text', false, '', 'Create Account');
  }
}

// ----------------------------------------------------------------
// Quick Demo Fills
// ----------------------------------------------------------------
function quickFillManager() {
  switchAuthTab('login');
  document.getElementById('login-identifier').value = 'alex@workmate.io';
  document.getElementById('login-password').value = 'Demo@1234';
  clearAllErrors('login', ['identifier', 'password']);
}

function quickFillEmployee() {
  switchAuthTab('login');
  document.getElementById('login-identifier').value = 'sarah.jenkins@workmate.io';
  document.getElementById('login-password').value = 'Emp@1234';
  clearAllErrors('login', ['identifier', 'password']);
}
