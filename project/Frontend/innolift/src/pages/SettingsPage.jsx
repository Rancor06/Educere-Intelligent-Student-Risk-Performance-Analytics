import { useEffect, useState } from 'react';
import AppShell from '../layout/AppShell';
import Toast from '../components/Toast';
import { API_BASE } from '../apiBase';

function initials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

// Converted from settings.html. Profile load/save still hits GET/PUT
// /profile exactly as before. Notification toggles and threshold
// sliders were purely visual in the original (no save endpoint existed
// for them either) — preserved as local state for the same reason.

function SettingsPage() {
  const [name, setName] = useState('Ms. Rao');
  const [email, setEmail] = useState('rao@crescent.edu');
  const [dept, setDept] = useState('Computer Science');
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState({ message: '', isError: false });
  const [watchThreshold, setWatchThreshold] = useState(80);
  const [riskThreshold, setRiskThreshold] = useState(65);
  const [notify1, setNotify1] = useState(true);
  const [notify2, setNotify2] = useState(true);
  const [notify3, setNotify3] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/profile`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const fullName = data.full_name || data.username;
        setName(fullName);
        setEmail(data.email || '');
        setDept(data.department || '');
      })
      .catch(() => {
        /* backend not running — keep placeholder values */
      });
  }, []);

  const handleSave = async () => {
    const payload = { full_name: name.trim(), email: email.trim(), department: dept.trim() };
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setToast({ message: data.error || 'Could not save profile changes', isError: true });
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setToast({ message: 'Could not reach the server. Is the Flask app running?', isError: true });
    }
  };

  return (
    <AppShell active="/settings">
      <Toast message={toast.message} isError={toast.isError} onDone={() => setToast({ message: '', isError: false })} />

      <div className="topbar">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Settings</h1>
          <p className="sub">Your profile, alert preferences, and risk thresholds.</p>
        </div>
      </div>

      <div className="panel settings-section">
        <div className="panel-head"><h2>Profile</h2></div>
        <div className="panel-body">
          <div className="profile-row">
            <div className="detail-avatar">{initials(name)}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{name || 'Unnamed'}</div>
              <div className="detail-meta">{dept || '—'}</div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="dept">Department</label>
            <input id="dept" type="text" value={dept} onChange={(e) => setDept(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="panel settings-section">
        <div className="panel-head"><h2>Notifications</h2></div>
        <div className="panel-body" style={{ paddingTop: '0.4rem' }}>
          <div className="toggle-row">
            <div>
              <div className="t-title">Alert when a student moves to "At risk"</div>
              <div className="t-sub">Immediate email notification</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={notify1} onChange={(e) => setNotify1(e.target.checked)} />
              <span className="track"></span>
            </label>
          </div>
          <div className="toggle-row">
            <div>
              <div className="t-title">Weekly cohort summary</div>
              <div className="t-sub">Sent every Monday morning</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={notify2} onChange={(e) => setNotify2(e.target.checked)} />
              <span className="track"></span>
            </label>
          </div>
          <div className="toggle-row">
            <div>
              <div className="t-title">Attendance drop alerts</div>
              <div className="t-sub">When a student's attendance falls more than 10% in a week</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={notify3} onChange={(e) => setNotify3(e.target.checked)} />
              <span className="track"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="panel settings-section">
        <div className="panel-head"><h2>Risk thresholds</h2></div>
        <div className="panel-body" style={{ paddingTop: '0.4rem' }}>
          <p className="chart-note">These are local display preferences only — where the coloured Watch/At risk badges kick in on this screen. They don't retrain or reconfigure the trained Decision Tree model in any way; the model's actual prediction and dropout-risk probability are unaffected by this slider.</p>
          <div className="threshold-row">
            <div className="t-label"><span>"Watch" attendance threshold</span><span className="val">{watchThreshold}%</span></div>
            <input type="range" min="50" max="95" value={watchThreshold} onChange={(e) => setWatchThreshold(e.target.value)} />
          </div>
          <div className="threshold-row">
            <div className="t-label"><span>"At risk" attendance threshold</span><span className="val">{riskThreshold}%</span></div>
            <input type="range" min="30" max="80" value={riskThreshold} onChange={(e) => setRiskThreshold(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', alignSelf: 'flex-start' }}>
        <button className="btn btn-primary" onClick={handleSave}>Save changes</button>
        {saved && <span style={{ fontSize: '0.85rem', color: 'var(--rag-green)' }}>Saved</span>}
      </div>
    </AppShell>
  );
}

export default SettingsPage;
