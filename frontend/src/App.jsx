import React, { useState, useEffect } from 'react';
import { api } from './services/api';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import TaskModal from './components/TaskModal';
import TaskActivityModal from './components/TaskActivityModal';
import EmployeeModal from './components/EmployeeModal';
import LeaveModal from './components/LeaveModal';
import LeaveDetailsModal from './components/LeaveDetailsModal';
import RejectLeaveModal from './components/RejectLeaveModal';

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import EmployeesPage from './pages/EmployeesPage';
import LeavesPage from './pages/LeavesPage';
import AttendancePage from './pages/AttendancePage';
import CalendarPage from './pages/CalendarPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import AdminLeavesPage from './pages/AdminLeavesPage';
import CeoDashboardPage from './pages/CeoDashboardPage';
import CeoManagersPage from './pages/CeoManagersPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('guest');
  const [authChecking, setAuthChecking] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [taskModal, setTaskModal] = useState({ isOpen: false, mode: 'add', initialData: null });
  const [taskActivityModal, setTaskActivityModal] = useState({ isOpen: false, task: null });
  const [employeeModal, setEmployeeModal] = useState({ isOpen: false, mode: 'add', initialData: null });
  const [leaveModal, setLeaveModal] = useState({ isOpen: false });
  const [leaveDetailsModal, setLeaveDetailsModal] = useState({ isOpen: false, leave: null });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, leaveId: null });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    text: '',
    icon: null,
    okLabel: 'Delete',
    onConfirm: null,
  });

  const [employees, setEmployees] = useState([]);
  const [taskCount, setTaskCount] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);

  // Toast Helper
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Synchronize URL with active page for direct routing and browser history
  const navigateTo = (page) => {
    setActivePage(page);
    const targetPath = page === 'dashboard' ? '/' : `/${page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
      if (['dashboard', 'tasks', 'employees', 'leaves', 'attendance', 'calendar', 'reports', 'profile', 'settings', 'managers', 'admin-leaves'].includes(path)) {
        setActivePage(path);
      } else {
        setActivePage('dashboard');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Check initial session & initial route
  const checkAuth = async () => {
    setAuthChecking(true);
    try {
      const res = await api.getMe();
      if (res.ok && res.data) {
        setUser(res.data);
        const userRole = res.data.role || 'manager';
        setRole(userRole);

        // Read initial URL path
        const path = window.location.pathname.replace(/^\//, '').split('/')[0];
        if (path && ['dashboard', 'tasks', 'employees', 'leaves', 'attendance', 'calendar', 'reports', 'profile', 'settings', 'managers', 'admin-leaves'].includes(path)) {
          // Verify role permission on requested route
          if (userRole === 'employee' && (path === 'employees' || path === 'reports' || path === 'managers' || path === 'admin-leaves')) {
            setActivePage('dashboard');
          } else {
            setActivePage(path);
          }
        } else {
          setActivePage('dashboard');
        }
      } else {
        setUser(null);
        setRole('guest');
      }
    } catch (e) {
      setUser(null);
      setRole('guest');
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Load roster and badge stats
  useEffect(() => {
    if (user && role === 'manager') {
      api.getEmployees().then((res) => {
        if (res.ok) setEmployees(res.data);
      });
      api.getTasks().then((res) => {
        if (res.ok) setTaskCount(res.data.length);
      });
      api.getLeaveStats().then((res) => {
        if (res.ok) setLeaveCount(res.data.pending || 0);
      });
    } else if (user && role === 'employee') {
      api.getTasks().then((res) => {
        if (res.ok) setTaskCount(res.data.length);
      });
    } else if (user && role === 'admin') {
      api.getAdminLeaves().then((res) => {
        if (res.ok) setLeaveCount((res.data || []).filter((l) => l.status === 'Pending').length);
      });
    }
  }, [user, role, activePage, refreshTrigger]);

  // Auth Handlers
  const handleLoginSuccess = (userData, userRole) => {
    setUser(userData);
    setRole(userRole);
    navigateTo('dashboard');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      /* ignore */
    }
    setUser(null);
    setRole('guest');
    setActivePage('dashboard');
    window.history.pushState({}, '', '/');
    setEmployees([]);
    setTaskCount(0);
    setLeaveCount(0);
    setSearchQuery('');
    setRefreshTrigger((prev) => prev + 1);
    showToast('Signed out successfully.', 'info');
  };

  // Task Actions
  const handleTaskSubmit = async (formData) => {
    try {
      let res;
      if (taskModal.mode === 'edit') {
        res = await api.updateTask(formData.id, formData);
      } else {
        res = await api.createTask(formData);
      }

      if (res.ok) {
        showToast(taskModal.mode === 'edit' ? 'Task updated!' : 'Task created successfully!', 'success');
        setTaskModal({ isOpen: false, mode: 'add', initialData: null });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showToast(res.data.error || 'Failed to save task.', 'error');
      }
    } catch (e) {
      showToast('Network error saving task.', 'error');
    }
  };

  const handleDeleteTask = (taskId, taskTitle = '') => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Task',
      text: `Are you sure you want to permanently delete task ${taskId}? This will also remove all associated audit logs.`,
      okLabel: 'Delete Task',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          const res = await api.deleteTask(taskId);
          if (res.ok) {
            showToast(`Task ${taskId} deleted successfully.`, 'success');
            setRefreshTrigger((prev) => prev + 1);
          } else {
            showToast(res.data.error || 'Failed to delete task.', 'error');
          }
        } catch (e) {
          showToast('Network error.', 'error');
        }
      },
    });
  };

  // Employee Actions
  const handleEmployeeSubmit = async (formData) => {
    try {
      let res;
      if (employeeModal.mode === 'edit') {
        res = await api.updateEmployee(formData.employee_id, formData);
      } else {
        res = await api.createEmployee(formData);
      }

      if (res.ok) {
        showToast(
          employeeModal.mode === 'edit'
            ? 'Employee updated!'
            : 'Employee added with login access credentials!',
          'success'
        );
        setEmployeeModal({ isOpen: false, mode: 'add', initialData: null });
        api.getEmployees().then((r) => r.ok && setEmployees(r.data));
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showToast(res.data.error || 'Failed to save employee.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  const handleDeleteEmployee = (employeeId, employeeName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Team Member',
      text: `Are you sure you want to remove "${employeeName}" (${employeeId})? Note: Team members with active unfinished tasks cannot be deleted.`,
      okLabel: 'Remove Member',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          const res = await api.deleteEmployee(employeeId);
          if (res.ok) {
            showToast(`${employeeName} removed from roster.`, 'success');
            api.getEmployees().then((r) => r.ok && setEmployees(r.data));
            setRefreshTrigger((prev) => prev + 1);
          } else {
            showToast(res.data.error || 'Failed to remove employee.', 'error');
          }
        } catch (e) {
          showToast('Network error.', 'error');
        }
      },
    });
  };

  // Leave Actions
  const handleLeaveSubmit = async (formData) => {
    try {
      let res;
      if (role === 'manager') {
        res = await api.submitManagerOwnLeave(formData);
      } else {
        res = await api.createLeave(formData);
      }

      if (res.ok) {
        showToast(
          role === 'manager'
            ? 'Manager leave request submitted to CEO / Executive Office!'
            : 'Leave request submitted to manager for review!',
          'success'
        );
        setLeaveModal({ isOpen: false });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showToast(res.data.error || 'Failed to submit leave.', 'error');
      }
    } catch (e) {
      showToast('Network error submitting leave.', 'error');
    }
  };

  const handleRejectSubmit = async (leaveId, rejectionReason) => {
    try {
      const res = await api.rejectLeave(leaveId, rejectionReason);
      if (res.ok) {
        showToast(`Leave request ${leaveId} rejected.`, 'info');
        setRejectModal({ isOpen: false, leaveId: null });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showToast(res.data.error || 'Failed to reject leave.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  const handleDeleteLeave = (leaveId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel / Delete Leave',
      text: `Are you sure you want to cancel or delete leave request ${leaveId}?`,
      okLabel: 'Confirm Delete',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          const res = await api.deleteLeave(leaveId);
          if (res.ok) {
            showToast(`Leave request ${leaveId} removed.`, 'success');
            setRefreshTrigger((prev) => prev + 1);
          } else {
            showToast(res.data.error || 'Failed to delete leave.', 'error');
          }
        } catch (e) {
          showToast('Network error.', 'error');
        }
      },
    });
  };

  // Header Action Router
  const handleHeaderAction = () => {
    if (activePage === 'employees') {
      setEmployeeModal({ isOpen: true, mode: 'add', initialData: null });
    } else if (activePage === 'leaves') {
      setLeaveModal({ isOpen: true });
    } else if (role === 'employee') {
      setLeaveModal({ isOpen: true });
    } else {
      setTaskModal({ isOpen: true, mode: 'add', initialData: null });
    }
  };

  if (authChecking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-pure)' }}>
        <div style={{ fontSize: '15px', color: 'var(--text-300)', fontWeight: 600 }}>Initializing WorkMate...</div>
      </div>
    );
  }

  // Not authenticated -> Show Auth Page
  if (!user) {
    return (
      <>
        <AuthPage onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        <Toast toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Manager */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={navigateTo}
        onLogout={handleLogout}
        taskCount={taskCount}
        leaveCount={leaveCount}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          user={user}
          activePage={activePage}
          setActivePage={navigateTo}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onHeaderAction={handleHeaderAction}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onLogout={handleLogout}
        />

        <main className="page-content">
          {/* Dashboard Route */}
          {activePage === 'dashboard' && (
            role === 'admin' ? (
              <CeoDashboardPage
                user={user}
                onNavigate={navigateTo}
                onOpenLeaveDetails={(leave) => setLeaveDetailsModal({ isOpen: true, leave })}
                showToast={showToast}
              />
            ) : (
              <DashboardPage
                user={user}
                onOpenTaskModal={() => setTaskModal({ isOpen: true, mode: 'add', initialData: null })}
                onOpenLeaveModal={() => setLeaveModal({ isOpen: true })}
                onOpenActivityModal={(task) => setTaskActivityModal({ isOpen: true, task })}
                onOpenLeaveDetails={(leave) => setLeaveDetailsModal({ isOpen: true, leave })}
                onOpenRejectModal={(leaveId) => setRejectModal({ isOpen: true, leaveId })}
                onOpenEditTaskModal={(task) => setTaskModal({ isOpen: true, mode: 'edit', initialData: task })}
                onDeleteTask={handleDeleteTask}
                showToast={showToast}
              />
            )
          )}

          {/* Tasks Route */}
          {activePage === 'tasks' && role !== 'admin' && (
            <TasksPage
              user={user}
              searchQuery={searchQuery}
              onOpenTaskModal={() => setTaskModal({ isOpen: true, mode: 'add', initialData: null })}
              onOpenEditTaskModal={(task) => setTaskModal({ isOpen: true, mode: 'edit', initialData: task })}
              onOpenActivityModal={(task) => setTaskActivityModal({ isOpen: true, task })}
              onDeleteTask={handleDeleteTask}
              showToast={showToast}
            />
          )}

          {/* Managers Route (CEO/Admin Only) */}
          {activePage === 'managers' && role === 'admin' && (
            <CeoManagersPage showToast={showToast} />
          )}

          {/* Employees Route */}
          {activePage === 'employees' && (role === 'manager' || role === 'admin') && (
            <EmployeesPage
              user={user}
              onOpenEmployeeModal={() => setEmployeeModal({ isOpen: true, mode: 'add', initialData: null })}
              onOpenEditEmployeeModal={(emp) => setEmployeeModal({ isOpen: true, mode: 'edit', initialData: emp })}
              onDeleteEmployee={handleDeleteEmployee}
              onOpenTaskModal={() => setTaskModal({ isOpen: true, mode: 'add', initialData: null })}
              showToast={showToast}
            />
          )}

          {/* Leaves Route */}
          {activePage === 'leaves' && role !== 'admin' && (
            <LeavesPage
              user={user}
              searchQuery={searchQuery}
              onOpenLeaveModal={() => setLeaveModal({ isOpen: true })}
              onOpenLeaveDetails={(leave) => setLeaveDetailsModal({ isOpen: true, leave })}
              onOpenRejectModal={(leaveId) => setRejectModal({ isOpen: true, leaveId })}
              onDeleteLeave={handleDeleteLeave}
              showToast={showToast}
            />
          )}

          {/* Attendance Route (All Roles) */}
          {activePage === 'attendance' && (
            <AttendancePage user={user} showToast={showToast} />
          )}

          {/* Calendar Route */}
          {activePage === 'calendar' && role !== 'admin' && (
            <CalendarPage
              user={user}
              onOpenLeaveModal={() => setLeaveModal({ isOpen: true })}
              showToast={showToast}
            />
          )}

          {/* Reports Route */}
          {activePage === 'reports' && (role === 'manager' || role === 'admin') && (
            <ReportsPage user={user} showToast={showToast} />
          )}

          {/* Profile Route */}
          {(activePage === 'profile' || activePage === 'settings') && (
            <ProfilePage
              user={user}
              onProfileUpdate={(updatedUser) => setUser(updatedUser)}
              showToast={showToast}
            />
          )}

          {/* Admin Leaves Route (CEO/Admin Only) */}
          {activePage === 'admin-leaves' && role === 'admin' && (
            <AdminLeavesPage
              user={user}
              onOpenLeaveDetails={(leave) => setLeaveDetailsModal({ isOpen: true, leave })}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <TaskModal
        isOpen={taskModal.isOpen}
        mode={taskModal.mode}
        initialData={taskModal.initialData}
        employees={employees}
        onSubmit={handleTaskSubmit}
        onClose={() => setTaskModal({ isOpen: false, mode: 'add', initialData: null })}
      />

      <TaskActivityModal
        isOpen={taskActivityModal.isOpen}
        task={taskActivityModal.task}
        onClose={() => setTaskActivityModal({ isOpen: false, task: null })}
      />

      <EmployeeModal
        isOpen={employeeModal.isOpen}
        mode={employeeModal.mode}
        initialData={employeeModal.initialData}
        managerName={user?.full_name || user?.name}
        onSubmit={handleEmployeeSubmit}
        onClose={() => setEmployeeModal({ isOpen: false, mode: 'add', initialData: null })}
      />

      <LeaveModal
        isOpen={leaveModal.isOpen}
        isManager={role === 'manager'}
        employees={employees}
        onSubmit={handleLeaveSubmit}
        onClose={() => setLeaveModal({ isOpen: false })}
      />

      <LeaveDetailsModal
        isOpen={leaveDetailsModal.isOpen}
        leave={leaveDetailsModal.leave}
        isManager={role === 'manager'}
        isAdmin={role === 'admin'}
        onApprove={(id) => {
          if (role === 'admin') {
            api.ceoApproveLeave(id).then(() => {
              showToast('Manager leave request approved by CEO!', 'success');
              setRefreshTrigger((prev) => prev + 1);
            });
          } else {
            api.approveLeave(id).then(() => {
              showToast('Leave request approved!', 'success');
              setRefreshTrigger((prev) => prev + 1);
            });
          }
        }}
        onReject={(id) => setRejectModal({ isOpen: true, leaveId: id })}
        onClose={() => setLeaveDetailsModal({ isOpen: false, leave: null })}
      />

      <RejectLeaveModal
        isOpen={rejectModal.isOpen}
        leaveId={rejectModal.leaveId}
        onSubmit={handleRejectSubmit}
        onClose={() => setRejectModal({ isOpen: false, leaveId: null })}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        text={confirmModal.text}
        icon={confirmModal.icon}
        okLabel={confirmModal.okLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </div>
  );
}
