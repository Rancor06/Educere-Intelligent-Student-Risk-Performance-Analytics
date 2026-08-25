/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import Toast from '../components/Toast';
import PanelLoader from '../components/PanelLoader';
import { API_BASE } from '../apiBase';
import { PREDICTION_SECTIONS, PREDICTION_TOGGLES, PredictionField } from '../PredictionForm';
import './StudentIntelligence.css';

const blankModel = () => Object.fromEntries([
  ...PREDICTION_SECTIONS.flatMap((section) => section.fields.map((field) => [field.key, ''])),
  ...PREDICTION_TOGGLES.map((toggle) => [toggle.key, false]),
]);
const blankStudent = () => ({ name: '', roll_no: '', course: '', attendance_percentage: '', gpa: '', ...blankModel() });
// Same two label vocabularies used on the dashboard and the detail page:
// raw model classes (Dropout/Enrolled/Graduate) and the already-translated
// demo-seeded labels (At risk/Watch/On track). Normalize to one before styling.
const RISK_LABEL = { Dropout: 'At risk', Enrolled: 'Watch', Graduate: 'On track' };
const RISK_STYLE = { 'At risk': 'high', Watch: 'medium', 'On track': 'low' };

function initials(name = '') { return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'ST'; }
function percent(value) { return value == null ? '—' : `${Math.round(Number(value) * 100)}%`; }

function RiskBadge({ student, result }) {
  const raw = result?.prediction || student?.risk_prediction || student?.dropout_risk || 'Prediction Pending';
  const label = RISK_LABEL[raw] || raw;
  return <span className={`intelligence-risk ${RISK_STYLE[label] || 'pending'}`}><span />{label}</span>;
}

function PredictionFields({ form, onChange }) {
  return <>
    {PREDICTION_SECTIONS.map((section) => <fieldset className="wizard-section" key={section.title}>
      <legend>{section.title}</legend>
      <div className="wizard-grid">
        {section.fields.map((field) => <label key={field.key}>{field.label}
          <PredictionField field={field} value={form[field.key]} onChange={(value) => onChange(field.key, value)} />
        </label>)}
      </div>
    </fieldset>)}
    <fieldset className="wizard-section"><legend>Student status</legend><div className="wizard-toggles">
      {PREDICTION_TOGGLES.map((toggle) => <label key={toggle.key}><input type="checkbox" checked={form[toggle.key]} onChange={(e) => onChange(toggle.key, e.target.checked)} />{toggle.label}</label>)}
    </div></fieldset>
  </>;
}

function StudentWizard({ onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(blankStudent);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };
  const modelPayload = () => Object.fromEntries(Object.entries(form).filter(([key]) => !(key === 'name' || key === 'roll_no' || key === 'attendance_percentage' || key === 'gpa')).map(([key, value]) => [key, typeof value === 'boolean' ? (value ? 1 : 0) : value]));
  const next = () => {
    if (step === 1 && (!form.name.trim() || !form.roll_no.trim() || !form.course.trim())) return setError('Name, student ID, and course are required.');
    setError(''); setStep((value) => Math.min(value + 1, 4));
  };
  const analyse = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modelPayload()) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) throw new Error(body.error || 'The prediction request could not be completed.');
      setResult(body); setStep(4);
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Unable to reach the prediction service. Check that the backend is running.' : err.message); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!result) return;
    setBusy(true); setError('');
    const payload = {
      name: form.name.trim(), roll_no: form.roll_no.trim(), course: form.course.trim(),
      attendance_percentage: Number(form.attendance_percentage) || null, gpa: Number(form.gpa) || null,
      admission_grade: Number(form.admission_grade) || null,
      units_1st_sem_enrolled: Number(form.units_enrolled_sem1) || 0, units_1st_sem_approved: Number(form.units_approved_sem1) || 0,
      units_2nd_sem_enrolled: Number(form.units_enrolled_sem2) || 0, units_2nd_sem_approved: Number(form.units_approved_sem2) || 0,
      scholarship_holder: form.scholarship_holder ? 1 : 0, debtor: form.debtor ? 1 : 0, tuition_up_to_date: form.tuition_up_to_date ? 1 : 0,
      prediction_input: modelPayload(),
    };
    try {
      const response = await fetch(`${API_BASE}/admin/students`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) throw new Error(body.error || 'Unable to save the student.');
      onSaved(); onClose();
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Unable to reach the server. Check that the backend is running.' : err.message); }
    finally { setBusy(false); }
  };
  return <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal-card wizard-card">
    <button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="wizard-head"><span>New student</span><h2>Add student with risk analysis</h2><p>Student details and the trained model result are saved together.</p></div>
    <div className="wizard-steps">{['Student', 'Model data', 'Analysis', 'Review'].map((label, index) => <span className={step >= index + 1 ? 'done' : ''} key={label}><b>{index + 1}</b>{label}</span>)}</div>
    {step === 1 && <div className="wizard-grid personal-grid">
      <label>Full name<input required value={form.name} onChange={(e) => change('name', e.target.value)} /></label>
      <label>Student ID<input required value={form.roll_no} onChange={(e) => change('roll_no', e.target.value)} /></label>
      <label>Course / department<input required value={form.course} onChange={(e) => change('course', e.target.value)} /></label>
      <label>Attendance %<input type="number" min="0" max="100" step="0.1" value={form.attendance_percentage} onChange={(e) => change('attendance_percentage', e.target.value)} /></label>
      <label>GPA (0–10)<input type="number" min="0" max="10" step="0.01" value={form.gpa} onChange={(e) => change('gpa', e.target.value)} /></label>
    </div>}
    {step === 2 && <PredictionFields form={form} onChange={change} />}
    {step === 3 && <div className="analysis-stage"><h3>Generate risk analysis</h3><p>The request is sent to Educere’s trained dropout model. No risk score is calculated in the browser.</p><button className="btn btn-primary" disabled={busy} onClick={analyse}>{busy ? 'Generating analysis…' : 'Generate Risk Analysis'}</button></div>}
    {step === 4 && result && <div className="review-stage"><div><span className="section-kicker">Student</span><h3>{form.name}</h3><p>{form.roll_no} · {form.course}</p></div><div className="analysis-result"><RiskBadge result={result} /><strong>{percent(result.confidence)} confidence</strong><p>Prediction date: just now</p>{Object.entries(result.probabilities || {}).map(([label, value]) => <div className="probability" key={label}><span>{label}</span><b>{percent(value)}</b></div>)}</div></div>}
    {error && <p className="wizard-error">{error}</p>}
    <div className="modal-actions"><button className="btn btn-ghost" onClick={() => step === 1 ? onClose() : setStep(step - 1)}>{step === 1 ? 'Cancel' : 'Back'}</button>{step < 3 && <button className="btn btn-primary" onClick={next}>Continue</button>}{step === 4 && <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Student'}</button>}</div>
  </div></div>;
}

const MODEL_FIELD_KEYS = [
  ...PREDICTION_SECTIONS.flatMap((section) => section.fields.map((field) => field.key)),
  ...PREDICTION_TOGGLES.map((toggle) => toggle.key),
];

function EditStudent({ student, onClose, onSaved }) {
  // Directory-added students (e.g. via a quick add without model data) can
  // have no prediction yet. For those, the edit panel also offers the full
  // model-input form inline — saving both updates the student and runs the
  // trained model in one step, so the card picks up a real risk badge
  // instead of staying on "Prediction Pending".
  const hasPrediction = Boolean(student.risk_prediction) || Boolean(student.dropout_risk) && student.dropout_risk !== 'Prediction Pending';
  const savedInputs = useMemo(() => {
    const raw = typeof student.prediction_inputs === 'string' ? JSON.parse(student.prediction_inputs || '{}') : (student.prediction_inputs || {});
    const merged = { ...raw };
    PREDICTION_TOGGLES.forEach(({ key }) => { if (key in merged) merged[key] = Boolean(Number(merged[key])); });
    return merged;
  }, [student]);
  const [form, setForm] = useState({ ...blankModel(), ...student, ...savedInputs });
  const [runAnalysis, setRunAnalysis] = useState(!hasPrediction);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = { ...form, name: form.name.trim(), course: form.course.trim() };
      if (runAnalysis) {
        body.prediction_input = Object.fromEntries(MODEL_FIELD_KEYS.map((key) => [key, PREDICTION_TOGGLES.some((t) => t.key === key) ? (form[key] ? 1 : 0) : form[key]]));
      }
      const response = await fetch(`${API_BASE}/admin/students/${student.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok || !responseBody.success) throw new Error(responseBody.error || 'Unable to update student.');
      onSaved(runAnalysis ? 'Student updated — risk analysis generated.' : 'Student updated.'); onClose();
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Unable to reach the server.' : err.message); } finally { setBusy(false); }
  };
  return <div className="modal-overlay open" onClick={(event) => event.target === event.currentTarget && onClose()}><div className="modal-card wizard-card"><button className="modal-close" onClick={onClose}>×</button><h2>Edit student</h2><form onSubmit={save}><div className="wizard-grid"><label>Full name<input required value={form.name || ''} onChange={(event) => set('name', event.target.value)} /></label><label>Course<input value={form.course || ''} onChange={(event) => set('course', event.target.value)} /></label><label>Attendance %<input type="number" min="0" max="100" step="0.1" value={form.attendance_percentage ?? ''} onChange={(event) => set('attendance_percentage', event.target.value)} /></label><label>GPA<input type="number" min="0" max="10" step="0.01" value={form.gpa ?? ''} onChange={(event) => set('gpa', event.target.value)} /></label><label>Admission grade<input type="number" value={form.admission_grade ?? ''} onChange={(event) => set('admission_grade', event.target.value)} /></label><label>1st-semester units enrolled<input type="number" value={form.units_1st_sem_enrolled ?? ''} onChange={(event) => set('units_1st_sem_enrolled', event.target.value)} /></label><label>1st-semester units approved<input type="number" value={form.units_1st_sem_approved ?? ''} onChange={(event) => set('units_1st_sem_approved', event.target.value)} /></label><label>2nd-semester units enrolled<input type="number" value={form.units_2nd_sem_enrolled ?? ''} onChange={(event) => set('units_2nd_sem_enrolled', event.target.value)} /></label><label>2nd-semester units approved<input type="number" value={form.units_2nd_sem_approved ?? ''} onChange={(event) => set('units_2nd_sem_approved', event.target.value)} /></label></div>

    {!hasPrediction && <div className="edit-analysis-toggle"><label><input type="checkbox" checked={runAnalysis} onChange={(event) => setRunAnalysis(event.target.checked)} /> Generate a risk analysis for this student when I save</label></div>}

    {runAnalysis && <fieldset className="wizard-section"><legend>Risk analysis model data</legend>
      {PREDICTION_SECTIONS.map((section) => <fieldset className="wizard-section" key={section.title}>
        <legend>{section.title}</legend>
        <div className="wizard-grid">
          {section.fields.map((field) => <label key={field.key}>{field.label}
            <PredictionField field={field} value={form[field.key]} onChange={(value) => set(field.key, value)} />
          </label>)}
        </div>
      </fieldset>)}
      <div className="wizard-toggles">
        {PREDICTION_TOGGLES.map((toggle) => <label key={toggle.key}><input type="checkbox" checked={form[toggle.key]} onChange={(event) => set(toggle.key, event.target.checked)} />{toggle.label}</label>)}
      </div>
    </fieldset>}

    {error && <p className="wizard-error">{error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? (runAnalysis ? 'Saving & analysing…' : 'Saving…') : 'Save changes'}</button></div></form></div></div>;
}

// Which normalized RAG label a student currently falls under, for the
// "All status" filter — same normalization used by RiskBadge above.
function studentStatus(student) {
  const raw = student.risk_prediction || student.dropout_risk || 'Prediction Pending';
  return RISK_LABEL[raw] || raw;
}

export default function StudentIntelligence() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState(''); const [sortBy, setSortBy] = useState('risk-desc'); const [adding, setAdding] = useState(false); const [editing, setEditing] = useState(null); const [toast, setToast] = useState({ message: '', isError: false });
  const load = async () => { setLoading(true); try { const response = await fetch(`${API_BASE}/admin/students`, { credentials: 'include' }); const body = await response.json().catch(() => []); if (!response.ok) throw new Error(body.error || 'Could not load students — are you logged in as admin?'); setStudents(body); setError(''); } catch (err) { setError(err.message === 'Failed to fetch' ? 'Could not reach the server. Is the Flask app running?' : err.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  // Deep link from the dashboard's "+ Add Student" button (/students?add=1)
  // opens the wizard immediately instead of landing on a bare directory.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('add') === '1') setAdding(true);
  }, []);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = students.filter((student) => {
      const matchesQuery = !query || [student.name, student.roll_no, student.course].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = !statusFilter || studentStatus(student) === statusFilter;
      return matchesQuery && matchesStatus;
    });
    list = [...list];
    if (sortBy === 'risk-desc') list.sort((a, b) => (Number(b.risk_confidence) || 0) - (Number(a.risk_confidence) || 0));
    else if (sortBy === 'risk-asc') list.sort((a, b) => (Number(a.risk_confidence) || 0) - (Number(b.risk_confidence) || 0));
    else if (sortBy === 'name') list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return list;
  }, [students, search, statusFilter, sortBy]);
  const remove = async (student) => { if (!window.confirm(`Delete ${student.name}? This also removes their login account.`)) return; try { const response = await fetch(`${API_BASE}/admin/students/${student.id}`, { method: 'DELETE', credentials: 'include' }); const body = await response.json().catch(() => ({})); if (!response.ok || !body.success) throw new Error(body.error || 'Unable to delete student.'); setToast({ message: 'Student deleted.', isError: false }); load(); } catch (err) { setToast({ message: err.message, isError: true }); } };
  return <AppShell active="/students"><Toast message={toast.message} isError={toast.isError} onDone={() => setToast({ message: '', isError: false })} />{adding && <StudentWizard onClose={() => setAdding(false)} onSaved={() => { setToast({ message: 'Student and risk analysis saved.', isError: false }); load(); }} />}{editing && <EditStudent student={editing} onClose={() => setEditing(null)} onSaved={(message) => { setToast({ message: message || 'Student updated.', isError: false }); load(); }} />}<div className="topbar"><div><span className="eyebrow">Student intelligence</span><h1>Student Directory</h1><p className="sub">Manage each student and their latest trained-model analysis in one place.</p></div><button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Student</button></div><div className="directory-tools"><input placeholder="Search by student, ID, or course…" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="dt-filters"><select className="dir-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All status</option><option value="At risk">At risk</option><option value="Watch">Watch</option><option value="On track">On track</option></select><select className="dir-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="risk-desc">Sort: Risk (high to low)</option><option value="risk-asc">Sort: Risk (low to high)</option><option value="name">Sort: Name</option></select><span>{filtered.length} students</span></div></div>{loading ? <PanelLoader label="Loading student directory…" /> : error ? <p className="wizard-error">{error}</p> : <div className="intelligence-grid">{filtered.map((student) => <article className="intelligence-card" key={student.id}><div className="card-title"><div className="student-avatar">{initials(student.name)}</div><div><h2>{student.name}</h2><p>{student.roll_no} · {student.course || 'No course'}</p></div><RiskBadge student={student} /></div><div className="student-metrics"><span><small>GPA</small><b>{student.gpa ?? '—'}</b></span><span><small>Attendance</small><b>{student.attendance_percentage == null ? '—' : `${student.attendance_percentage}%`}</b></span><span><small>Risk score</small><b>{percent(student.risk_confidence)}</b></span></div><div className="card-actions"><button onClick={() => navigate(`/student-detail?id=${student.id}`)}>View Profile</button><button onClick={() => setEditing(student)}>Edit</button><button className="danger" onClick={() => remove(student)}>Delete</button></div></article>)}</div>}{!loading && !error && filtered.length === 0 && <div className="empty-directory">No students match this search.</div>}</AppShell>;
}
