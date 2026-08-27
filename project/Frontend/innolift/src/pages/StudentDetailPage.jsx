/* eslint-disable react-hooks/set-state-in-effect -- load() is the async
   fetch-on-mount/param-change pattern used throughout this app (see the
   same directive in StudentIntelligence.jsx); the alternative the rule
   suggests (deriving loading state from a request key) isn't worth the
   rewrite for a single admin-only detail page. */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import Toast from '../components/Toast';
import PanelLoader from '../components/PanelLoader';
import { statusRaw } from '../riskLabel';
import { API_BASE } from '../apiBase';

const riskClass = { Dropout: 'red', Enrolled: 'amber', Graduate: 'green', 'At risk': 'red', Watch: 'amber', 'On track': 'green' };
const riskLabel = { Dropout: 'At risk', Enrolled: 'Watch', Graduate: 'On track' };
const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'ST';
const asPercent = (value) => value == null ? '—' : `${Math.round(Number(value) * 100)}%`;

export default function StudentDetailPage() {
  const [params] = useSearchParams();
  const studentId = params.get('id');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [error, setError] = useState(studentId ? '' : 'No student selected. Return to Student Directory and choose View Profile.');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: '', isError: false });

  const load = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}`, { credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not load this student.');
      setStudent(body); setNotes(body.notes || ''); setError('');
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the server. Is the Flask app running?' : err.message);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNotes = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}/notes`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ notes }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) throw new Error(body.error || 'Could not save note.');
      setToast({ message: 'Note saved', isError: false });
    } catch (err) { setToast({ message: err.message, isError: true }); } finally { setBusy(false); }
  };
  const rerun = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}/predict`, { method: 'POST', credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) throw new Error(body.error || 'Unable to re-run analysis.');
      await load(); setToast({ message: 'Risk analysis updated', isError: false });
    } catch (err) { setToast({ message: err.message === 'Failed to fetch' ? 'Could not reach the prediction service.' : err.message, isError: true }); } finally { setBusy(false); }
  };

  const probabilities = (() => {
    try {
      const raw = student?.risk_probabilities;
      return typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch { return {}; }
  })();
  const risk = statusRaw(student);

  return <AppShell active="/students"><Toast message={toast.message} isError={toast.isError} onDone={() => setToast({ message: '', isError: false })} /><Link to="/students" className="row-link" style={{ display: 'inline-block', marginBottom: '1.2rem' }}>← Back to Student Directory</Link>{loading ? <PanelLoader label="Loading student profile…" /> : error ? <div className="wizard-error">{error}</div> : <><div className="detail-head"><div className="detail-avatar">{initials(student.name)}</div><div><h1 style={{ fontSize: '1.4rem' }}>{student.name}</h1><div className="detail-meta">{student.roll_no} · {student.course || 'No course recorded'}</div></div><div style={{ marginLeft: 'auto' }}><span className={`rag-pill ${riskClass[risk] || 'grey'}`}><span className="dot" />{riskLabel[risk] || risk}</span></div></div><div className="detail-grid" style={{ display: 'grid' }}><div><div className="card"><h2>Academic overview</h2><div className="metric-row"><span className="k">GPA</span><span className="v">{student.gpa ?? '—'}</span></div><div className="metric-row"><span className="k">Attendance</span><span className="v">{student.attendance_percentage == null ? '—' : `${student.attendance_percentage}%`}</span></div><div className="metric-row"><span className="k">Admission grade</span><span className="v">{student.admission_grade == null ? '—' : `${student.admission_grade} / 200`}</span></div><div className="metric-row"><span className="k">1st-semester units</span><span className="v">{student.units_1st_sem_approved ?? 0} of {student.units_1st_sem_enrolled ?? 0} approved</span></div><div className="metric-row"><span className="k">2nd-semester units</span><span className="v">{student.units_2nd_sem_approved ?? 0} of {student.units_2nd_sem_enrolled ?? 0} approved</span></div></div><div className="card"><h2>Teacher notes</h2><textarea className="note-input" placeholder="Add an observation or intervention note…" value={notes} onChange={(event) => setNotes(event.target.value)} /><button className="btn btn-primary" disabled={busy} style={{ marginTop: '.8rem' }} onClick={saveNotes}>Save note</button></div></div><div><div className="card"><h2>Latest risk analysis</h2><div className="metric-row"><span className="k">Prediction</span><span className="v">{riskLabel[risk] || risk}</span></div><div className="metric-row"><span className="k">Dropout risk</span><span className="v">{asPercent(probabilities.Dropout)}</span></div><div className="metric-row"><span className="k">Model confidence</span><span className="v">{asPercent(student.risk_confidence)}</span></div><div className="metric-row"><span className="k">Last analysed</span><span className="v">{student.risk_analyzed_at ? new Date(student.risk_analyzed_at).toLocaleString() : '—'}</span></div><p className="chart-note" style={{ margin: '0.2rem 0 0.4rem' }}>Class probabilities</p>{Object.entries(probabilities).map(([label, value]) => <div className="metric-row" key={label}><span className="k">{label}</span><span className="v">{asPercent(value)}</span></div>)}<button className="btn btn-primary" disabled={busy} style={{ marginTop: '1rem' }} onClick={rerun}>{busy ? 'Re-running…' : 'Re-run Analysis'}</button></div><div className="card"><h2>Enrollment</h2><div className="metric-row"><span className="k">Scholarship holder</span><span className="v">{student.scholarship_holder ? 'Yes' : 'No'}</span></div><div className="metric-row"><span className="k">Debtor</span><span className="v">{student.debtor ? 'Yes' : 'No'}</span></div><div className="metric-row"><span className="k">Tuition up to date</span><span className="v">{student.tuition_up_to_date ? 'Yes' : 'No'}</span></div></div></div></div></>}</AppShell>;
}
