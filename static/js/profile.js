/**
 * profile.js — WorkMate Profile Page Logic (Manager & Employee Support)
 * Handles: profile display, edit profile form, and secure password updates.
 */

"use strict";

// ----------------------------------------------------------------
// Load Profile Data
// ----------------------------------------------------------------
async function loadProfileData() {
  const { ok, data } = await apiFetch('/api/auth/me');
  if (!ok) { showToast('Failed to load profile.', 'error'); return; }

  currentUser = data;
  renderProfileCard(data);
  populateEditForm(data);
}

// ----------------------------------------------------------------
// Render Profile Info Card
// ----------------------------------------------------------------
function renderProfileCard(user) {
  const name = user.full_name || user.name || 'User';
  const role = user.role || 'manager';
  const id = user.manager_id || user.employee_id || '—';
  const initials = getInitials(name);
  const color = avatarColor(name);

  // Avatar
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    avatarEl.textContent = initials;
    avatarEl.style.background = `linear-gradient(135deg, ${color}, ${color}cc)`;
    avatarEl.style.color = '#0A0A0A';
  }

  // Name & ID
  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = name;

  const idEl = document.getElementById('profile-user-id');
  if (idEl) idEl.textContent = `${role === 'manager' ? 'Manager ID' : 'Employee ID'}: ${id}`;

  const roleBadge = document.getElementById('profile-role-badge');
  if (roleBadge) {
    roleBadge.textContent = role === 'manager' ? '👔 Manager' : '👤 Employee';
    roleBadge.className = `role-badge ${role === 'manager' ? 'role-badge-manager' : 'role-badge-employee'}`;
  }

  // Employee count box in stats
  const empStatBox = document.getElementById('profile-stat-emp-box');
  const empStatLabel = document.getElementById('profile-stat-emp-label');
  if (empStatBox) {
    if (role === 'employee') {
      empStatBox.style.display = 'none';
    } else {
      empStatBox.style.display = 'block';
      if (empStatLabel) empStatLabel.textContent = 'Employees';
    }
  }

  // Details list
  const detailsList = document.getElementById('profile-details-list');
  if (detailsList) {
    detailsList.innerHTML = `
      <div class="profile-detail-row">
        <span class="profile-detail-icon">✉️</span>
        <div>
          <div class="profile-detail-label">Work Email</div>
          <div class="profile-detail-value">${escapeHtml(user.email)}</div>
        </div>
      </div>
      <div class="profile-detail-row">
        <span class="profile-detail-icon">📞</span>
        <div>
          <div class="profile-detail-label">Phone Number</div>
          <div class="profile-detail-value">${escapeHtml(user.phone || '—')}</div>
        </div>
      </div>
      <div class="profile-detail-row">
        <span class="profile-detail-icon">🏢</span>
        <div>
          <div class="profile-detail-label">Department</div>
          <div class="profile-detail-value">${escapeHtml(user.department || '—')}</div>
        </div>
      </div>
      <div class="profile-detail-row">
        <span class="profile-detail-icon">📅</span>
        <div>
          <div class="profile-detail-label">Account Created</div>
          <div class="profile-detail-value">${formatDate(user.created_at)}</div>
        </div>
      </div>
    `;
  }
}

// ----------------------------------------------------------------
// Populate Edit Form
// ----------------------------------------------------------------
function populateEditForm(user) {
  const nameField = document.getElementById('prof-name');
  const emailField = document.getElementById('prof-email');
  const phoneField = document.getElementById('prof-phone');
  const deptField = document.getElementById('prof-dept');

  if (nameField) nameField.value = user.full_name || user.name || '';
  if (emailField) emailField.value = user.email || '';
  if (phoneField) phoneField.value = user.phone || '';
  if (deptField) deptField.value = user.department || '';

  // Clear any previous errors
  ['prof-name-err', 'prof-email-err', 'prof-phone-err', 'profile-update-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  });
}

// ----------------------------------------------------------------
// Handle Profile Update
// ----------------------------------------------------------------
async function handleProfileUpdate(event) {
  event.preventDefault();

  const name = document.getElementById('prof-name').value.trim();
  const email = document.getElementById('prof-email').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const dept = document.getElementById('prof-dept').value;

  ['prof-name-err', 'prof-email-err', 'prof-phone-err', 'profile-update-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  });

  let valid = true;
  if (!name || name.length < 2) {
    const el = document.getElementById('prof-name-err');
    if (el) { el.textContent = 'Name must be at least 2 characters.'; el.classList.add('show'); }
    valid = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const el = document.getElementById('prof-email-err');
    if (el) { el.textContent = 'Enter a valid email address.'; el.classList.add('show'); }
    valid = false;
  }
  if (!valid) return;

  const payload = { full_name: name, name: name, email, phone, department: dept };

  const { ok, data } = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(payload) });

  if (ok) {
    currentUser = data.user;
    showToast('Profile updated successfully!', 'success');
    renderProfileCard(data.user);
    applyUserRoleView(data.user);
  } else {
    const errEl = document.getElementById('profile-update-err');
    if (errEl) { errEl.textContent = data.error || 'Update failed.'; errEl.classList.add('show'); }
  }
}

// ----------------------------------------------------------------
// Handle Password Change
// ----------------------------------------------------------------
async function handlePasswordChange(event) {
  event.preventDefault();

  const current = document.getElementById('pwd-current').value;
  const newPwd = document.getElementById('pwd-new').value;
  const confirm = document.getElementById('pwd-confirm').value;

  ['pwd-current-err', 'pwd-new-err', 'pwd-confirm-err', 'pwd-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  });

  let valid = true;
  if (!current) {
    const el = document.getElementById('pwd-current-err');
    if (el) { el.textContent = 'Current password is required.'; el.classList.add('show'); }
    valid = false;
  }
  if (!newPwd || newPwd.length < 6) {
    const el = document.getElementById('pwd-new-err');
    if (el) { el.textContent = 'New password must be at least 6 characters.'; el.classList.add('show'); }
    valid = false;
  }
  if (!confirm) {
    const el = document.getElementById('pwd-confirm-err');
    if (el) { el.textContent = 'Please confirm your new password.'; el.classList.add('show'); }
    valid = false;
  } else if (newPwd !== confirm) {
    const el = document.getElementById('pwd-confirm-err');
    if (el) { el.textContent = 'Passwords do not match.'; el.classList.add('show'); }
    valid = false;
  }
  if (!valid) return;

  const payload = { current_password: current, new_password: newPwd, confirm_password: confirm };
  const { ok, data } = await apiFetch('/api/auth/password', { method: 'PUT', body: JSON.stringify(payload) });

  if (ok) {
    showToast('Password changed successfully!', 'success');
    document.getElementById('change-pwd-form').reset();
  } else {
    const errEl = document.getElementById('pwd-err');
    if (errEl) { errEl.textContent = data.error || 'Password change failed.'; errEl.classList.add('show'); }
  }
}
