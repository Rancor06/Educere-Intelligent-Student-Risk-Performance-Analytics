import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import PanelLoader from '../components/PanelLoader';
import { API_BASE } from '../apiBase';

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
      const raw = student.risk_prediction || student.dropout_risk;
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
        const raw = student.risk_prediction || student.dropout_risk;
        return { student, normalized: riskLabel[raw] || raw };
      })
      .filter(({ normalized }) => normalized === 'At risk' || normalized === 'Watch')
      .sort((a, b) => rank[a.normalized] - rank[b.normalized])
      .slice(0, 4)
      .map(({ student }) => student);
  }, [students]);
  const greeting = name ? `Good morning, ${name}` : 'Good morning';

  return <AppShell active="/dashboard">
    <div className="topbar"><div><span className="eyebrow">Student intelligence</span><h1>{greeting}</h1><p className="sub">Here’s where your cohort stands today.</p></div></div>
    <div className="stat-strip"><div className="stat-card"><div className="label">Total students</div><div className="value">{students.length}</div></div><div className="stat-card rag-green"><div className="label"><span className="dot" />On track</div><div className="value">{counts.green}</div></div><div className="stat-card rag-amber"><div className="label"><span className="dot" />Watch</div><div className="value">{counts.amber}</div></div><div className="stat-card rag-red"><div className="label"><span className="dot" />At risk</div><div className="value">{counts.red}</div></div></div>
    {loading ? <PanelLoader label="Loading your student intelligence…" /> : <div className="overview-grid"><div className="panel"><div className="panel-head"><h2>Needs attention</h2><Link to="/students" className="row-link">View all students →</Link></div><div className="alert-list">{attention.length ? attention.map((student) => { const risk = student.risk_prediction || student.dropout_risk || 'Prediction Pending'; return <div className="alert-item" key={student.id}><div className="student-avatar">{initials(student.name)}</div><div className="alert-info"><div className="student-name">{student.name}</div><div className="why">{student.roll_no} · {student.course || 'No course recorded'}</div></div><span className={`rag-pill ${riskClass[risk] || 'grey'}`}><span className="dot" />{riskLabel[risk] || risk}</span><Link to={`/student-detail?id=${student.id}`} className="row-link">View →</Link></div>; }) : <p className="chart-note" style={{ padding: '1.2rem' }}>No students need attention right now.</p>}</div></div><div className="quick-links"><Link to="/students" className="quick-link"><div className="ql-title">Open student directory</div><div className="ql-sub">Manage student details and their latest risk analysis</div></Link><Link to="/predictor" className="quick-link"><div className="ql-title">Run a one-off prediction</div><div className="ql-sub">Use the trained model without creating a student record</div></Link><Link to="/reports" className="quick-link"><div className="ql-title">Cohort reports</div><div className="ql-sub">Risk distribution, trends, and course breakdown</div></Link></div></div>}
  </AppShell>;
}
