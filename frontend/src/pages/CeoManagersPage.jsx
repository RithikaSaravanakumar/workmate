import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckSquare,
  Mail,
  Phone,
  Search,
  Building,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

export default function CeoManagersPage({ refreshTrigger, showToast }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadManagers = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminManagers();
      if (res.ok) {
        setManagers(res.data || []);
      } else {
        if (showToast) showToast(res.data?.error || 'Failed to load managers.', 'error');
      }
    } catch (e) {
      if (showToast) showToast('Network error loading managers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagers();
  }, [refreshTrigger]);

  const filteredManagers = managers.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.manager_id || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-100)' }}>
            Organization Managers Roster
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            List of all department managers reporting directly to CEO / Executive Office.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '30px', fontSize: '12.5px', width: '220px', paddingTop: '7px', paddingBottom: '7px' }}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadManagers}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading managers directory...
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="empty-state card" style={{ padding: '48px', textAlign: 'center' }}>
          <Shield size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>No Managers Found</h3>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Manager ID</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Direct Reports</th>
                  <th>Tasks Tracked</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.map((m) => (
                  <tr key={m.manager_id}>
                    <td>
                      <span style={{ color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {m.manager_id}
                      </span>
                    </td>
                    <td>
                      <div className="table-avatar-cell">
                        <div
                          className="table-avatar"
                          style={{ background: 'linear-gradient(135deg, #FFE44D, #FFD21F)', color: '#0A0A0A' }}
                        >
                          {(m.full_name || 'M')[0]}
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-100)', fontSize: '13.5px' }}>
                          {m.full_name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-in-progress" style={{ fontSize: '11px' }}>
                        {m.department}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-200)' }}>{m.email}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-300)' }}>{m.phone || '—'}</td>
                    <td>
                      <span className="badge badge-completed" style={{ fontWeight: 800 }}>
                        {m.team_size || 0} Employees
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-100)' }}>{m.total_tasks || 0}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {m.created_at ? m.created_at.split(' ')[0] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
