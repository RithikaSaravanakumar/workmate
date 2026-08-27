import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Palmtree,
  Calendar,
  BarChart3,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Clock,
  Building,
  Layers,
} from 'lucide-react';

export default function Sidebar({
  user,
  activePage,
  setActivePage,
  onLogout,
  taskCount = 0,
  leaveCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const role = user?.role || 'manager';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isAdmin = role === 'admin';

  const fullName = user?.full_name || user?.name || (isManager ? 'John Manager' : isAdmin ? 'CEO / Executive' : 'Team Member');
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const handleNavClick = (page) => {
    setActivePage(page);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99, background: 'rgba(0,0,0,0.6)' }}
          onClick={onCloseMobile}
        />
      )}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header with WorkMate Logo */}
        <div
          className="sidebar-brand"
          onClick={() => handleNavClick('dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-icon-wrap" style={{ overflow: 'hidden' }}>
            <img
              src="/logo.png"
              alt="WorkMate"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="brand-text">
            Work<span>Mate</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {isAdmin ? 'Executive Suite' : isManager ? 'Management Portal' : 'My Workspace'}
          </div>

          {/* 1. Dashboard */}
          <div
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>

          {/* 2. Tasks (Manager: Task Board / Employee: My Tasks) */}
          {!isAdmin && (
            <div
              className={`nav-item ${activePage === 'tasks' ? 'active' : ''}`}
              onClick={() => handleNavClick('tasks')}
            >
              <CheckSquare size={18} />
              <span>{isManager ? 'Task Board' : 'My Tasks'}</span>
              {taskCount > 0 && <span className="nav-badge">{taskCount}</span>}
            </div>
          )}

          {/* 3. Managers (CEO/Admin Only) */}
          {isAdmin && (
            <div
              className={`nav-item ${activePage === 'managers' ? 'active' : ''}`}
              onClick={() => handleNavClick('managers')}
            >
              <Building size={18} />
              <span>Managers</span>
            </div>
          )}

          {/* 4. Employees (Manager & CEO/Admin) */}
          {(isManager || isAdmin) && (
            <div
              className={`nav-item ${activePage === 'employees' ? 'active' : ''}`}
              onClick={() => handleNavClick('employees')}
            >
              <Users size={18} />
              <span>Employees</span>
            </div>
          )}

          {/* 5. Leave Management / Leave Approvals */}
          {isAdmin ? (
            <div
              className={`nav-item ${activePage === 'admin-leaves' ? 'active' : ''}`}
              onClick={() => handleNavClick('admin-leaves')}
            >
              <ShieldCheck size={18} />
              <span>Leave Approvals</span>
              {leaveCount > 0 && <span className="nav-badge">{leaveCount}</span>}
            </div>
          ) : (
            <div
              className={`nav-item ${activePage === 'leaves' ? 'active' : ''}`}
              onClick={() => handleNavClick('leaves')}
            >
              <Palmtree size={18} />
              <span>Leave Management</span>
              {isManager && leaveCount > 0 && <span className="nav-badge">{leaveCount}</span>}
            </div>
          )}

          {/* 6. Attendance (All Roles) */}
          <div
            className={`nav-item ${activePage === 'attendance' ? 'active' : ''}`}
            onClick={() => handleNavClick('attendance')}
          >
            <Clock size={18} />
            <span>Attendance</span>
          </div>

          {/* 7. Calendar (Manager & Employee) */}
          {!isAdmin && (
            <div
              className={`nav-item ${activePage === 'calendar' ? 'active' : ''}`}
              onClick={() => handleNavClick('calendar')}
            >
              <Calendar size={18} />
              <span>Calendar</span>
            </div>
          )}

          {/* 8. Reports (Manager & CEO/Admin) */}
          {(isManager || isAdmin) && (
            <div
              className={`nav-item ${activePage === 'reports' ? 'active' : ''}`}
              onClick={() => handleNavClick('reports')}
            >
              <BarChart3 size={18} />
              <span>Reports</span>
            </div>
          )}

          <div className="nav-section-title" style={{ marginTop: 'auto' }}>Account &amp; Access</div>

          {/* 9. Profile */}
          <div
            className={`nav-item ${activePage === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavClick('profile')}
          >
            <User size={18} />
            <span>My Profile</span>
          </div>

          {/* 10. Settings (Manager & CEO/Admin) */}
          {(isManager || isAdmin) && (
            <div
              className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
              onClick={() => handleNavClick('profile')}
            >
              <Settings size={18} />
              <span>Settings</span>
            </div>
          )}

          {/* 11. Logout */}
          <div
            className="nav-item"
            style={{ color: 'var(--coral)' }}
            onClick={onLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </div>
        </nav>

        {/* User Footer Profile */}
        <div
          className="sidebar-user"
          onClick={() => handleNavClick('profile')}
          style={{ cursor: 'pointer' }}
          title="View profile settings"
        >
          <div className="user-avatar">
            {initials || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{fullName}</div>
            <div className="user-role">
              {isAdmin ? '🛡️ CEO / Admin' : isManager ? '👔 Manager' : '👤 Employee'}
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" />
        </div>
      </aside>
    </>
  );
}
