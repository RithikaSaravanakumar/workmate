import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Palmtree,
  UserPlus,
  Bell,
  Calendar as CalendarIcon,
  Menu,
  CheckCircle2,
  Clock,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export default function Header({
  user,
  activePage,
  setActivePage,
  searchQuery,
  setSearchQuery,
  onHeaderAction,
  onToggleMobileSidebar,
  onLogout,
  notifications = [],
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchInputRef = useRef(null);

  const role = user?.role || 'manager';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isAdmin = role === 'admin';

  const titles = {
    dashboard: isAdmin ? 'CEO / Executive Dashboard' : isManager ? 'Manager Productivity Dashboard' : 'Employee Workspace',
    tasks: isManager ? 'Team Task Management Board' : 'My Assigned Tasks',
    managers: 'Organization Managers Roster',
    employees: isAdmin ? 'Organization Employee Directory' : 'Employee Team Directory & Workload',
    leaves: isManager ? 'Leave Management & Approvals' : 'Leave Management & Time Off Portal',
    attendance: isEmployee ? 'Workday Attendance & Timer' : isManager ? 'Team Attendance & Hours' : 'Organization Attendance Statistics',
    calendar: 'Team Schedule & Deadlines Calendar',
    reports: 'Productivity Analytics & Reports',
    profile: 'User Profile & Account Settings',
    settings: 'Settings & Security',
    'admin-leaves': 'Executive CEO Leave Approvals',
  };

  const subtitles = {
    dashboard: isAdmin ? "Executive overview of managers, workforce, tasks, and attendance." : isManager ? "Monitor team productivity, active tasks, and upcoming milestones." : "Here is your personal workspace, active tasks, and leave status.",
    tasks: "Organize, assign, and track task progression across your team.",
    managers: "Supervise department heads and management team.",
    employees: "Manage team roster, workload capacity, and employee credentials.",
    leaves: isManager ? "Review employee leave requests and scheduled time off." : "Apply for time off and view leave history.",
    attendance: "Real-time check-in, 8-hour workday target, overtime calculation, and history logs.",
    calendar: "Visual timeline of upcoming deadlines and approved time off.",
    reports: "In-depth completion rates, department metrics, and summaries.",
    profile: "Manage your profile, credentials, and password.",
    settings: "System settings, notification preferences, and security.",
    'admin-leaves': "Review and approve leave requests submitted by managers.",
  };

  // Keyboard shortcut listener for '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  const initials = (user?.full_name || user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <header className="header">
      <div className="header-left">
        {/* Mobile Hamburger */}
        <button
          className="icon-btn mobile-menu-btn"
          style={{ display: 'none' }}
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        <div className="page-title-wrap">
          <h1 className="page-title">{titles[activePage] || 'WorkMate'}</h1>
          <p className="page-subtext">{subtitles[activePage] || 'Productivity Platform'}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Global Live Search Bar */}
        <div className="header-search">
          <Search size={15} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tasks, team, leaves..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-kbd">/</span>
        </div>

        {/* Date Indicator Pill */}
        <div className="date-pill">
          <CalendarIcon size={14} color="var(--primary-yellow)" />
          <span>{currentDate}</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            title="Notifications"
          >
            <Bell size={18} />
            <span className="badge-dot" />
          </button>

          {showNotifications && (
            <div className="dropdown-menu" style={{ width: '320px' }}>
              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-100)' }}>Notifications</span>
                <span className="badge badge-pending">3 New</span>
              </div>
              <div className="dropdown-divider" />
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-100)' }}>
                    <CheckCircle2 size={14} color="var(--emerald)" /> Sarah Jenkins completed TASK-201
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Design System Token Overhaul • 10m ago</span>
                </div>
                <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-100)' }}>
                    <Clock size={14} color="var(--amber)" /> New Leave Request from David Miller
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annual Leave (2 days) • 45m ago</span>
                </div>
                <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-100)' }}>
                    <Sparkles size={14} color="var(--primary-yellow)" /> Sprint goal on track (+14% completion)
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Weekly milestone update • 2h ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            className="user-avatar"
            style={{ width: '38px', height: '38px', cursor: 'pointer' }}
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            title={user?.full_name || user?.name}
          >
            {initials || 'U'}
          </div>

          {showProfileMenu && (
            <div className="dropdown-menu">
              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-100)' }}>
                  {user?.full_name || user?.name || 'Alex Morgan'}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {user?.email || (isManager ? 'alex@workmate.io' : 'sarah@workmate.io')}
                </div>
              </div>
              <div className="dropdown-divider" />
              <div
                className="dropdown-item"
                onClick={() => {
                  setActivePage('profile');
                  setShowProfileMenu(false);
                }}
              >
                <User size={15} />
                <span>My Profile</span>
              </div>
              <div
                className="dropdown-item"
                onClick={() => {
                  setActivePage('profile');
                  setShowProfileMenu(false);
                }}
              >
                <Settings size={15} />
                <span>Settings &amp; Password</span>
              </div>
              <div className="dropdown-divider" />
              <div
                className="dropdown-item"
                style={{ color: 'var(--coral)' }}
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
