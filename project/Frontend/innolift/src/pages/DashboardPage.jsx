import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import PanelLoader from '../components/PanelLoader';
import { API_BASE } from '../apiBase';
import { statusRaw } from '../riskLabel';

const riskClass = { Dropout: 'red', Enrolled: 'amber', Graduate: 'green', 'At risk': 'red', Watch: 'amber', 'On track': 'green' };
const riskLabel = { Dropout: 'At risk', Enrolled: 'Watch', Graduate: 'On track' };
const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'ST';

export default function DashboardPage() {
  const [name, setName] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${API_BASE}/profile`, { credentials: 'include' }).then((response) => response.ok ? response.json() : null),
      fetch(`${API_BASE}/admin/students`, { credentials: 'include' }).then((response) => response.ok ? response.json() : []),
    ]).then(([profile, roster]) => {
      if (!active) return;
      setName(profile?.full_name || profile?.username || '');
      setStudents(Array.isArray(roster) ? roster : []);
    }).catch(() => {}).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => {
    const tally = { green: 0, amber: 0, red: 0 };
    students.forEach((student) => {
      const raw = statusRaw(student);
      const normalized = riskLabel[raw] || raw;
      if (normalized === 'On track') tally.green += 1;
      else if (normalized === 'Watch') tally.amber += 1;
      else if (normalized === 'At risk') tally.red += 1;
    });
    return tally;
  }, [students]);
  const attention = useMemo(() => {
    const rank = { 'At risk': 0, Watch: 1 };
    return students
      .map((student) => {
        const raw = statusRaw(student);
        return { student, normalized: riskLabel[raw] || raw };
      })
      .filter(({ normalized }) => normalized === 'At risk' || normalized === 'Watch')
      .sort((a, b) => rank[a.normalized] - rank[b.normalized])
      .slice(0, 4)
      .map(({ student }) => student);
  }, [students]);
  const greeting = name ? `Good morning, ${name}` : 'Good morning';

  return <AppShell active="/dashboard">
    <div className="topbar"><div><span className="eyebrow">Student intelligence</span><h1>{greeting}</h1><p className="sub">Here’s where your cohort stands today.</p></div><Link to="/students?add=1" className="btn btn-primary">+ Add Student</Link></div>
    <div className="stat-strip"><div className="stat-card"><div className="label">Total students</div><div className="value">{students.length}</div></div><div className="stat-card rag-green"><div className="label"><span className="dot" />On track</div><div className="value">{counts.green}</div></div><div className="stat-card rag-amber"><div className="label"><span className="dot" />Watch</div><div className="value">{counts.amber}</div></div><div className="stat-card rag-red"><div className="label"><span className="dot" />At risk</div><div className="value">{counts.red}</div></div></div>
    {loading ? <PanelLoader label="Loading your student intelligence…" /> : <>
      <div className="overview-grid">
        <div className="panel"><div className="panel-head"><h2>Needs attention</h2><Link to="/students" className="row-link">View all students →</Link></div><div className="alert-list">{attention.length ? attention.map((student) => { const risk = statusRaw(student); return <div className="alert-item" key={student.id}><div className="student-avatar">{initials(student.name)}</div><div className="alert-info"><div className="student-name">{student.name}</div><div className="why">{student.roll_no} · {student.course || 'No course recorded'}</div></div><span className={`rag-pill ${riskClass[risk] || 'grey'}`}><span className="dot" />{riskLabel[risk] || risk}</span><Link to={`/student-detail?id=${student.id}`} className="row-link">View →</Link></div>; }) : <p className="chart-note" style={{ padding: '1.2rem' }}>No students need attention right now.</p>}</div></div>
        <div className="quick-links">
          <Link to="/students" className="quick-link"><div className="ql-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div><div className="ql-body"><div className="ql-title">Student Directory</div><div className="ql-sub">Manage students and view profiles</div></div><span className="ql-arrow">→</span></Link>
          <Link to="/predictor" className="quick-link"><div className="ql-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 3" /></svg></div><div className="ql-body"><div className="ql-title">Risk Predictor</div><div className="ql-sub">Run a one-off prediction</div></div><span className="ql-arrow">→</span></Link>
          <Link to="/reports" className="quick-link"><div className="ql-icon"><svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></div><div className="ql-body"><div className="ql-title">Cohort Reports</div><div className="ql-sub">Explore cohort-level insights</div></div><span className="ql-arrow">→</span></Link>
          <Link to="/settings" className="quick-link"><div className="ql-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg></div><div className="ql-body"><div className="ql-title">Settings</div><div className="ql-sub">Manage preferences</div></div><span className="ql-arrow">→</span></Link>
        </div>
      </div>
      <div className="report-banner">
        <div><div className="rb-title">🔔 Automated reporting is active</div><div className="rb-sub">Monthly cohort analysis will be generated on Friday at 4:00 PM.</div></div>
        <Link to="/reports" className="row-link">View schedule →</Link>
      </div>
    </>}
  </AppShell>;
}
