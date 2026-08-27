import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Palmtree, CheckSquare, Clock, User, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function CalendarPage({ user, onOpenLeaveModal, showToast }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({ leaves: [], tasks: [] });
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [loading, setLoading] = useState(true);

  const isManager = user?.role === 'manager';

  const loadCalendar = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getCalendar();
      if (res.ok && res.data) {
        setCalendarData({
          leaves: Array.isArray(res.data.leaves) ? res.data.leaves : [],
          tasks: Array.isArray(res.data.tasks) ? res.data.tasks : [],
        });
      } else if (res.status === 401) {
        /* Session expired or pending */
      } else {
        setCalendarData({ leaves: [], tasks: [] });
      }
    } catch (e) {
      setCalendarData({ leaves: [], tasks: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now.getDate());
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Days in month
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const formatKey = (day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Find events for selected day
  const selectedDateKey = formatKey(selectedDay);
  const dayLeaves = (calendarData.leaves || []).filter(
    (l) => l.start_date <= selectedDateKey && l.end_date >= selectedDateKey
  );
  const dayTasks = (calendarData.tasks || []).filter(
    (t) => (t.due_date || '').startsWith(selectedDateKey)
  );

  return (
    <div>
      {/* Calendar Header Controls */}
      <div
        className="card"
        style={{
          padding: '16px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth}>
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={today}>
              Today
            </button>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-100)' }}>{monthName}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-300)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--emerald)' }} />
            <span>Approved Leaves</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-300)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary-yellow)' }} />
            <span>Task Due Dates</span>
          </div>

          <button className="btn btn-primary btn-sm" onClick={onOpenLeaveModal}>
            <Palmtree size={14} /> + Request Leave
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '20px' }}>
        {/* Monthly Calendar Grid */}
        <div className="card" style={{ padding: '22px' }}>
          {/* Day Name Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} style={{ padding: '6px' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {days.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    style={{
                      height: '90px',
                      background: 'transparent',
                    }}
                  />
                );
              }

              const dateKey = formatKey(day);
              const hasLeaves = (calendarData.leaves || []).some(
                (l) => l.start_date <= dateKey && l.end_date >= dateKey
              );
              const hasTasks = (calendarData.tasks || []).some(
                (t) => (t.due_date || '').startsWith(dateKey)
              );

              const isSelected = selectedDay === day;
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    height: '90px',
                    background: isSelected
                      ? 'var(--bg-surface-elevated)'
                      : isToday
                      ? 'rgba(255, 210, 31, 0.08)'
                      : 'var(--bg-surface)',
                    border: isSelected
                      ? '1px solid var(--border-gold-strong)'
                      : isToday
                      ? '1px solid var(--border-gold)'
                      : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s var(--ease)',
                  }}
                  className="card-hover"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isToday || isSelected ? 800 : 600,
                        color: isToday ? 'var(--primary-yellow)' : isSelected ? 'var(--text-100)' : 'var(--text-200)',
                      }}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--primary-yellow)', textTransform: 'uppercase' }}>
                        Today
                      </span>
                    )}
                  </div>

                  {/* Event Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {hasLeaves && (
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 'rgba(52, 211, 153, 0.15)',
                          color: 'var(--emerald)',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        🌴 Leave Active
                      </div>
                    )}
                    {hasTasks && (
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 'rgba(255, 210, 31, 0.15)',
                          color: 'var(--primary-yellow)',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        📋 Task Due
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Drawer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '15px' }}>
                <CalendarIcon size={16} color="var(--primary-yellow)" /> Agenda: {selectedDateKey}
              </h3>
              <p className="card-subtext">Events &amp; milestones scheduled</p>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dayLeaves.length === 0 && dayTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No deadlines or approved leaves scheduled for this date.
              </div>
            ) : (
              <>
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--primary-yellow)', fontWeight: 700 }}>
                        {t.id}
                      </span>
                      <span className="badge badge-priority-high" style={{ fontSize: '10px' }}>
                        {t.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-100)', marginTop: '3px' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      👤 Assigned to {t.employee || 'Unassigned'}
                    </div>
                  </div>
                ))}

                {dayLeaves.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      background: 'rgba(52, 211, 153, 0.08)',
                      border: '1px solid rgba(52, 211, 153, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 700 }}>
                        {l.leave_type} Leave
                      </span>
                      <span className="badge badge-completed" style={{ fontSize: '10px' }}>
                        Approved
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-100)', marginTop: '3px' }}>
                      {l.employee_name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      ⏱ {l.days_count} Days ({l.start_date} → {l.end_date})
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
