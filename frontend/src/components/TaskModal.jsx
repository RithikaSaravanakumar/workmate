import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Tag, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export default function TaskModal({
  isOpen,
  mode = 'add',
  initialData = null,
  employees = [],
  onSubmit,
  onClose,
}) {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    employee_id: '',
    priority: 'Medium',
    status: 'Pending',
    due_date: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          id: initialData.id || '',
          title: initialData.title || '',
          description: initialData.description || '',
          employee_id: initialData.employee_id || '',
          priority: initialData.priority || 'Medium',
          status: initialData.status || 'Pending',
          due_date: initialData.due_date || '',
        });
      } else {
        // Auto generate ID and default due date (7 days from today)
        const randomNum = Math.floor(100 + Math.random() * 900);
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 7);
        const dueStr = defaultDue.toISOString().split('T')[0];

        setFormData({
          id: `TASK-${randomNum}`,
          title: '',
          description: '',
          employee_id: employees.length ? employees[0].employee_id : '',
          priority: 'Medium',
          status: 'Pending',
          due_date: dueStr,
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, initialData, employees]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.id.trim()) errs.id = 'Task ID is required.';
    if (!formData.title.trim() || formData.title.length < 2) {
      errs.title = 'Title must be at least 2 characters.';
    }
    if (!formData.employee_id) errs.employee_id = 'Please assign an employee.';
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
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(255, 210, 31, 0.15)',
                color: 'var(--primary-yellow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 className="modal-title">{mode === 'edit' ? 'Edit Task' : 'Create New Task'}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {mode === 'edit' ? 'Update task assignment and status' : 'Assign a new task to your team member'}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Row 1: Task ID & Priority */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Tag size={13} style={{ display: 'inline', marginRight: '4px' }} /> Task ID *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.id}
                  disabled={mode === 'edit'}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g. TASK-101"
                />
                {errors.id && <span className="field-error">{errors.id}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Priority Level *</label>
                <select
                  className="form-control"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>
            </div>

            {/* Row 2: Title */}
            <div className="form-group">
              <label className="form-label">Task Title *</label>
              <input
                type="text"
                className="form-control"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Implement Role-Based Access Control and Session Auditing"
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            {/* Row 3: Assignee & Due Date */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Assign Employee *
                </label>
                <select
                  className="form-control"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.department} • {emp.employee_id})
                    </option>
                  ))}
                </select>
                {errors.employee_id && <span className="field-error">{errors.employee_id}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Target Due Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            {/* Row 4: Status (Only for new task or if editing own task) */}
            {mode !== 'edit' && (
              <div className="form-group">
                <label className="form-label">
                  <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Initial Status *
                </label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Pending">⏳ Pending (Awaiting Kickoff)</option>
                  <option value="In Progress">⚡ In Progress (Active Sprint)</option>
                </select>
              </div>
            )}

            {/* Row 5: Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description &amp; Acceptance Criteria</label>
              <textarea
                className="form-control"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detail technical requirements, expected deliverables, or instructions for the assignee..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : mode === 'edit' ? 'Save Changes' : '+ Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
