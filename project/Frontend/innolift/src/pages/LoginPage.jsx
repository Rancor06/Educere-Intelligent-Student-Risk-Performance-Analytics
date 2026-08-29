import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../apiBase';
import { Footer } from '../layout/AppShell';
import Logo from '../components/Logo';
import './Login.css';

// Converted from login.html — same role toggle + form, same fetch to
// POST /login, same redirect targets. The only behavior change: uses
// React Router's navigate() instead of window.location.href.

function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialRole = params.get('role') === 'admin' ? 'admin' : 'student';

  const [role, setRole] = useState(initialRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const roleSub = role === 'admin'
    ? 'Admin access — manage students and risk records.'
    : 'Student access — view your own attendance and grades.';
  const placeholder = role === 'admin' ? 'admin' : 'e.g. stu-20261001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      navigate(data.role === 'admin' ? '/dashboard' : '/student-dashboard');
    } catch {
      setError('Could not reach the server. Is the Flask app running?');
    }
  };

  return (
    <>
      <div className="login-shell">
        <aside className="login-side">
          <div className="brand-mark">
            <div className="glyph"><Logo /></div>
            <div className="name">Educere</div>
          </div>

          <div>
            <p className="quote">"Catching a dropout risk in week three beats catching it in semester three."</p>
            <p className="quote-attr">— what this dashboard is for</p>
          </div>

          <div className="rag-key">
            <span><span className="dot" style={{ background: '#4ADE80' }}></span>On track</span>
            <span><span className="dot" style={{ background: '#FBBF24' }}></span>Watch</span>
            <span><span className="dot" style={{ background: '#F87171' }}></span>At risk</span>
          </div>
        </aside>

        <main className="login-main">
          <div className="login-card">
            <h1>Sign in</h1>
            <p className="sub">{roleSub}</p>

            <div className="role-toggle">
              <button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admin</button>
              <button type="button" className={role === 'student' ? 'active' : ''} onClick={() => setRole('student')}>Student</button>
            </div>

            {error && <div className="login-error show">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username" type="text" placeholder={placeholder} required
                  value={username} onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password" type="password" placeholder="••••••••" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">Sign in</button>
            </form>

            <p className="login-foot"><Link to="/" style={{ color: 'var(--brand)', fontWeight: 600 }}>&larr; Back to home</Link></p>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}

export default LoginPage;
