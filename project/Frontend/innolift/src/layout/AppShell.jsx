import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../apiBase';
import Logo from '../components/Logo';

// Mirrors the header + sidebar + footer markup that was duplicated across
// every static admin page (dashboard.html, students.html, reports.html,
// settings.html, register-student.html, student-detail.html). Same classes
// from edutrack.css, so the look is unchanged — just one component instead
// of seven copies of the same HTML.

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/students', label: 'Students', icon: 'students' },
  { to: '/predictor', label: 'Risk Predictor', icon: 'risk' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function NavIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    students: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 20c.7-3.2 2.6-4.8 5.5-4.8s4.8 1.6 5.5 4.8M15 15.5c2.9.1 4.7 1.6 5.2 4.5" /></>,
    risk: <><path d="M12 3 20 6v5.6c0 4.6-3.1 7.7-8 9.4-4.9-1.7-8-4.8-8-9.4V6l8-3Z" /><path d="M12 8v4M12 16h.01" /></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3.5h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V13h-.2a1.7 1.7 0 0 0-1.5 2Z" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

const THEME_KEY = 'educere-theme';

// Dark is the app's default appearance; the toggle lets a person switch to
// light and stick with it. Applied as a data-theme attribute on <html> so
// every stylesheet's `html[data-theme="..."]` overrides just work.
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return [theme, setTheme];
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" stroke="none" /></svg>
      )}
    </button>
  );
}

function AppShell({ active, children }) {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('educere-sidebar-collapsed') === 'true'
  );
  const [user, setUser] = useState({ name: 'Loading…', department: '' });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/profile`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUser({ name: data.full_name || data.username, department: data.department || '' });
      })
      .catch(() => {
        /* backend not running — keep placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('educere-sidebar-collapsed', String(next));
      return next;
    });
  };

  const handleSignOut = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    navigate('/login');
  };

  return (
    <div className="page-shell">
      <header className="app-header">
        <div className="header-left">
          <button
            className="collapse-toggle"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            onClick={toggleCollapse}
          >
            &#9776;
          </button>
          <div className="brand-mark">
            <div className="glyph"><Logo /></div>
            <div className="name">Educere</div>
          </div>
        </div>
        <div className="header-right">
          <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
          <span className="header-user">{user.name}</span>
          <a href="#" className="btn btn-ghost" onClick={handleSignOut}>Sign out</a>
        </div>
      </header>

      <div className={`app${collapsed ? ' sidebar-collapsed' : ''}`}>
        <nav className="sidebar">
          <button
            className="sidebar-toggle"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          >
            <span></span><span></span><span></span>
          </button>
          <div className={`sidebar-nav${navOpen ? ' open' : ''}`}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className={active === item.to ? 'active' : ''}>
                <NavIcon name={item.icon} />
                <span className="label">{item.label}</span>
              </Link>
            ))}
          </div>
          <div className="sidebar-foot">
            {user.name}
            {user.department ? <><br />{user.department}</> : null}
          </div>
        </nav>

        <main className="main">{children}</main>
      </div>

      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand"><b>Educere</b> — Intelligent student risk &amp; performance analytics</div>
        <nav className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/login?role=student">Student login</Link>
          <Link to="/login?role=admin">Admin login</Link>
        </nav>
        <div className="footer-contact">
          <a href="mailto:support@educere.app">support@educere.app</a><br />
          &copy; 2026 Educere
        </div>
      </div>
    </footer>
  );
}

export default AppShell;
