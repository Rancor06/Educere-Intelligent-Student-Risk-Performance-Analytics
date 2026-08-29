import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../layout/AppShell';
import Logo from '../components/Logo';
import PanelLoader from '../components/PanelLoader';
import { API_BASE } from '../apiBase';

// Converted from student-dashboard.html. This page has its own minimal
// header/sidebar (only "My Dashboard" — no admin nav), so it doesn't
// reuse AppShell (which is the admin chrome with the full 5-item nav);
// it's built directly, same as the original standalone page was.

function StudentDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/student/dashboard`, { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          navigate('/login?role=student');
          return;
        }
        setData(body);
      })
      .catch(() => setError('Could not reach the server. Is the Flask app running?'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSignOut = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    navigate('/login?role=student');
  };

  const sem1pct = data?.units_1st_sem_enrolled ? Math.round((data.units_1st_sem_approved / data.units_1st_sem_enrolled) * 100) : 0;
  const sem2pct = data?.units_2nd_sem_enrolled ? Math.round((data.units_2nd_sem_approved / data.units_2nd_sem_enrolled) * 100) : 0;

  return (
    <div className="page-shell">
      <header className="app-header">
        <div className="header-left">
          <div className="brand-mark">
            <div className="glyph"><Logo /></div>
            <div className="name">Educere</div>
          </div>
        </div>
        <div className="header-right">
          <span className="header-user">{data ? data.name : 'Ms. Rao'}</span>
          <a href="#" className="btn btn-ghost" onClick={handleSignOut}>Sign out</a>
        </div>
      </header>

      <div className="app">
        <nav className="sidebar">
          <div className="sidebar-nav">
            <a href="#" className="active"><span className="dot"></span><span className="label">My Dashboard</span></a>
          </div>
          <div className="sidebar-foot">
            {data ? <>{data.name}<br />{data.roll_no} &middot; {data.course || ''}</> : 'Loading…'}
          </div>
        </nav>

        <main className="main">
          <div className="topbar">
            <div>
              <span className="eyebrow">Student portal</span>
              <h1>{data ? `Hi, ${data.name.split(' ')[0]}` : 'Welcome'}</h1>
              <p className="sub">Here's your current academic snapshot.</p>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--rag-red-bg)', color: 'var(--rag-red)', border: '1px solid var(--rag-red)', borderRadius: 'var(--radius)', padding: '0.8rem 1.1rem', marginBottom: '1.2rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {loading && <PanelLoader label="Loading your dashboard…" />}

          <div className="stat-strip">
            {data && [
              { label: 'Attendance', value: `${data.attendance_percentage ?? '—'}%` },
              { label: 'GPA', value: data.gpa ?? '—' },
              { label: 'Course', value: data.course || '—' },
              { label: 'Admission grade', value: data.admission_grade ?? '—' },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="label">{s.label}</div>
                <div className="value" style={{ fontSize: '1.3rem' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-head"><h2>Semester progress</h2></div>
            <div style={{ padding: '1.2rem 1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>
                <span>1st semester units</span>
                <span>{data ? `${data.units_1st_sem_approved ?? 0} of ${data.units_1st_sem_enrolled ?? 0} approved` : '—'}</span>
              </div>
              <div style={{ background: 'var(--paper)', borderRadius: '6px', height: '10px', overflow: 'hidden', marginBottom: '1.2rem' }}>
                <div style={{ height: '100%', background: 'var(--rag-green)', width: `${sem1pct}%` }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>
                <span>2nd semester units</span>
                <span>{data ? `${data.units_2nd_sem_approved ?? 0} of ${data.units_2nd_sem_enrolled ?? 0} approved` : '—'}</span>
              </div>
              <div style={{ background: 'var(--paper)', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--rag-green)', width: `${sem2pct}%` }}></div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-head"><h2>Teacher Notes</h2></div>
            <div style={{ padding: '1.2rem 1.4rem' }}>
              {data && data.notes ? (
                <div style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1rem 1.1rem', color: 'var(--ink)', fontSize: '0.92rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {data.notes}
                </div>
              ) : (
                <p className="chart-note">No teacher notes yet.</p>
              )}
            </div>
          </div>

          <p className="chart-note" style={{ marginTop: '1rem' }}>
            Risk assessment isn't shown here — it's reviewed by your instructor, who can reach out if support would help.
          </p>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default StudentDashboardPage;
