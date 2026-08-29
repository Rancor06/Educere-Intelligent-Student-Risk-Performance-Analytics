/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import Toast from '../components/Toast';
import PanelLoader from '../components/PanelLoader';
import { API_BASE } from '../apiBase';
import { statusRaw } from '../riskLabel';
import { PREDICTION_SECTIONS, PREDICTION_TOGGLES, PredictionField } from '../PredictionForm';
import './StudentIntelligence.css';

const blankModel = () => Object.fromEntries([
  ...PREDICTION_SECTIONS.flatMap((section) => section.fields.map((field) => [field.key, ''])),
  ...PREDICTION_TOGGLES.map((toggle) => [toggle.key, false]),
]);
// The model's "Course" field (a code from the COURSE options list) and the
// plain-text "Course / department" field represent the same real-world
// course but in different, non-interchangeable representations — a coded
// value vs. free text an admin can type for a course outside that fixed
// list. blankModel() above defines `course` as one of the 36 model keys;
// StudentWizard/EditStudent keep that model value under `course_code`
// instead (see PredictionFields and EditStudent below) so it never
// overwrites the free-text `course` field they also use for the same key —
// which previously crashed on `.trim()` once a model Course was selected.
const blankStudent = () => ({ name: '', roll_no: '', course: '', course_code: '', attendance_percentage: '', gpa: '', ...blankModel() });
// Same two label vocabularies used on the dashboard and the detail page:
// raw model classes (Dropout/Enrolled/Graduate) and the already-translated
// demo-seeded labels (At risk/Watch/On track). Normalize to one before styling.
const RISK_LABEL = { Dropout: 'At risk', Enrolled: 'Watch', Graduate: 'On track' };
const RISK_STYLE = { 'At risk': 'high', Watch: 'medium', 'On track': 'low' };

function initials(name = '') { return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'ST'; }
function percent(value) { return value == null ? '—' : `${Math.round(Number(value) * 100)}%`; }

// Risk score = the model's Dropout class probability, NOT model confidence
// (confidence is how sure the model is in whichever class it picked, which
// for a confidently-Graduate student is a *high* number that has nothing to
// do with dropout risk). Same definition used on Student Detail and Reports.
function parseProbabilities(student) {
  const raw = student?.risk_probabilities;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    return parsed || {};
  } catch { return {}; }
}
function dropoutRisk(student) {
  const probabilities = parseProbabilities(student);
  return probabilities.Dropout ?? null;
}

function RiskBadge({ student, result }) {
  const raw = result?.prediction || statusRaw(student);
  const label = RISK_LABEL[raw] || raw;
  return <span className={`intelligence-risk ${RISK_STYLE[label] || 'pending'}`}><span />{label}</span>;
}

function PredictionFields({ form, onChange }) {
  // See the blankStudent note above — the model's Course field reads/writes
  // course_code here, not course, to avoid clobbering the free-text field.
  const fieldValue = (key) => (key === 'course' ? form.course_code : form[key]);
  const fieldChange = (key, value) => onChange(key === 'course' ? 'course_code' : key, value);
  return <>
    {PREDICTION_SECTIONS.map((section) => <fieldset className="wizard-section" key={section.title}>
      <legend>{section.title}</legend>
      <div className="wizard-grid">
        {section.fields.map((field) => <label key={field.key}>{field.label}
          <PredictionField field={field} value={fieldValue(field.key)} onChange={(value) => fieldChange(field.key, value)} />
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
  const [credentials, setCredentials] = useState(null);
  const change = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };
  // Built from the real 36 model keys rather than filtering `form`, so
  // `course` (the model's coded field) is read from course_code, not the
  // free-text course name that shares the object with it — see the
  // blankStudent note above.
  const modelPayload = () => Object.fromEntries(MODEL_FIELD_KEYS.map((key) => {
    const raw = key === 'course' ? form.course_code : form[key];
    return [key, typeof raw === 'boolean' ? (raw ? 1 : 0) : raw];
  }));
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
      // Shown once — the temporary password isn't retrievable after this,
      // since only its hash is stored. Directory list refreshes now
      // (onSaved), but the modal stays open on a credentials step so the
      // admin can actually see/copy it before closing.
      window.dispatchEvent(new Event('educere:students-changed'));
      onSaved();
      setCredentials({ username: body.login_username, password: body.temporary_password });
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Unable to reach the server. Check that the backend is running.' : err.message); }
    finally { setBusy(false); }
  };
  if (credentials) {
    return <div className="modal-overlay open"><div className="modal-card wizard-card">
      <h2>Student account created</h2>
      <p className="chart-note">Save this password now — it can't be shown again. Share it with the student through a secure channel.</p>
      <div className="analysis-result"><div className="metric-row"><span className="k">Username</span><span className="v">{credentials.username}</span></div><div className="metric-row"><span className="k">Temporary password</span><span className="v">{credentials.password}</span></div></div>
      <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
    </div></div>;
  }
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

function EditStudent({ student, onClose, onSaved, onRefresh }) {
  const hasPrediction = statusRaw(student) !== 'Not analysed';
  const savedInputs = useMemo(() => {
    const raw = typeof student.prediction_inputs === 'string' ? JSON.parse(student.prediction_inputs || '{}') : (student.prediction_inputs || {});
    const merged = { ...raw };
    PREDICTION_TOGGLES.forEach(({ key }) => { if (key in merged) merged[key] = Boolean(Number(merged[key])); });
    return merged;
  }, [student]);
  // The full 36-field model-input section is always shown and always
  // pre-populated from savedInputs when present — never hidden just
  // because the student already has a prediction (an admin improving a
  // struggling student's numbers needs to see and edit the real values,
  // not re-enter them from scratch).
  const [form, setForm] = useState(() => ({
    ...blankModel(), ...student, ...savedInputs,
    // Explicit last — see the blankStudent note above: keep the free-text
    // course name and the model's coded course value in separate keys so
    // neither overwrites the other (this previously crashed Save with
    // "course.trim is not a function" once a model Course was touched).
    course: student.course ?? '',
    course_code: savedInputs.course ?? '',
  }));
  const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  // Tracks the latest known prediction for this student — starts from
  // whatever was already saved, and is replaced (not merged) by whatever
  // Run/Re-run Prediction returns, so the "Current prediction" panel
  // always reflects the most recent real model output.
  const [prediction, setPrediction] = useState(() => {
    if (!hasPrediction) return null;
    let probabilities;
    try { probabilities = typeof student.risk_probabilities === 'string' ? JSON.parse(student.risk_probabilities || '{}') : (student.risk_probabilities || {}); } catch { probabilities = {}; }
    return { prediction: statusRaw(student), confidence: Number(student.risk_confidence), probabilities, analyzedAt: student.risk_analyzed_at };
  });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  // Normal field edits — never touches the ML prediction.
  const saveStudent = async (event) => {
    event.preventDefault(); setBusy('save'); setError('');
    try {
      const body = { name: form.name.trim(), course: form.course.trim(), attendance_percentage: form.attendance_percentage, gpa: form.gpa, admission_grade: form.admission_grade, units_1st_sem_enrolled: form.units_1st_sem_enrolled, units_1st_sem_approved: form.units_1st_sem_approved, units_2nd_sem_enrolled: form.units_2nd_sem_enrolled, units_2nd_sem_approved: form.units_2nd_sem_approved };
      const response = await fetch(`${API_BASE}/admin/students/${student.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok || !responseBody.success) throw new Error(responseBody.error || 'Unable to update student.');
      window.dispatchEvent(new Event('educere:students-changed'));
      onSaved('Student updated.'); onClose();
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Unable to reach the server.' : err.message); } finally { setBusy(''); }
  };

  // Explicit action: sends the (possibly just-edited) model inputs to the
  // real trained model and persists whatever it returns. Never triggered
  // automatically by opening or saving the form.
  const runPrediction = async () => {
    setBusy('predict'); setError('');
    try {
      const prediction_input = Object.fromEntries(MODEL_FIELD_KEYS.map((key) => {
        const raw = key === 'course' ? form.course_code : form[key];
        return [key, PREDICTION_TOGGLES.some((t) => t.key === key) ? (raw ? 1 : 0) : raw];
      }));
      const body = { name: form.name.trim(), course: form.course.trim(), attendance_percentage: form.attendance_percentage, gpa: form.gpa, admission_grade: form.admission_grade, units_1st_sem_enrolled: form.units_1st_sem_enrolled, units_1st_sem_approved: form.units_1st_sem_approved, units_2nd_sem_enrolled: form.units_2nd_sem_enrolled, units_2nd_sem_approved: form.units_2nd_sem_approved, prediction_input };
      const response = await fetch(`${API_BASE}/admin/students/${student.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok || !responseBody.success) throw new Error(responseBody.error || 'Unable to run the prediction.');
      setPrediction({ ...responseBody.risk_analysis, analyzedAt: new Date().toISOString() });
      // The backend just resolved course_code -> the canonical course name
      // and persisted it (see course_name_from_code in ml/model.py). Sync
      // form.course to that same value now — otherwise a later Save
      // Student (which doesn't send prediction_input) would overwrite the
      // just-synced course with this form's stale pre-prediction name.
      // form.course_code (the numeric model input) is untouched.
      if (responseBody.course) set('course', responseBody.course);
      window.dispatchEvent(new Event('educere:students-changed'));
      onRefresh?.();
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Unable to reach the prediction service.' : err.message); } finally { setBusy(''); }
  };

  const predictionLabel = prediction ? (RISK_LABEL[prediction.prediction] || prediction.prediction) : null;
  const dropoutPct = prediction ? percent(prediction.probabilities?.Dropout) : '—';

  return <div className="modal-overlay open" onClick={(event) => event.target === event.currentTarget && onClose()}><div className="modal-card wizard-card"><button className="modal-close" onClick={onClose}>×</button><h2>Edit student</h2>

    {prediction ? <div className="analysis-result" style={{ marginBottom: '1rem' }}>
      <span className={`intelligence-risk ${RISK_STYLE[predictionLabel] || 'pending'}`}><span />{predictionLabel}</span>
      <div className="metric-row"><span className="k">Dropout risk</span><span className="v">{dropoutPct}</span></div>
      <div className="metric-row"><span className="k">Model confidence</span><span className="v">{percent(prediction.confidence)}</span></div>
      <div className="metric-row"><span className="k">Last analysed</span><span className="v">{prediction.analyzedAt ? new Date(prediction.analyzedAt).toLocaleString() : '—'}</span></div>
    </div> : <p className="chart-note" style={{ marginBottom: '1rem' }}>No prediction available yet — fill in the model inputs below and run one.</p>}

    <form onSubmit={saveStudent}><div className="wizard-grid"><label>Full name<input required value={form.name || ''} onChange={(event) => set('name', event.target.value)} /></label><label>Attendance %<input type="number" min="0" max="100" step="0.1" value={form.attendance_percentage ?? ''} onChange={(event) => set('attendance_percentage', event.target.value)} /></label><label>GPA<input type="number" min="0" max="10" step="0.01" value={form.gpa ?? ''} onChange={(event) => set('gpa', event.target.value)} /></label></div>
    {/* Course, Admission grade, and semester unit counts stay removed from here —
        they duplicated fields already in "Risk analysis model data" below. Attendance
        and GPA were restored per request: they have no equivalent in that section, so
        this is their only editable slot. Values still round-trip unchanged for the
        fields that remain removed (see saveStudent/runPrediction). */}

    <fieldset className="wizard-section"><legend>Risk analysis model data</legend>
      {PREDICTION_SECTIONS.map((section) => <fieldset className="wizard-section" key={section.title}>
        <legend>{section.title}</legend>
        <div className="wizard-grid">
          {section.fields.map((field) => <label key={field.key}>{field.label}
            <PredictionField field={field} value={field.key === 'course' ? form.course_code : form[field.key]} onChange={(value) => set(field.key === 'course' ? 'course_code' : field.key, value)} />
          </label>)}
        </div>
      </fieldset>)}
      <div className="wizard-toggles">
        {PREDICTION_TOGGLES.map((toggle) => <label key={toggle.key}><input type="checkbox" checked={form[toggle.key]} onChange={(event) => set(toggle.key, event.target.checked)} />{toggle.label}</label>)}
      </div>
    </fieldset>

    {error && <p className="wizard-error">{error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-ghost" disabled={Boolean(busy)} onClick={runPrediction}>{busy === 'predict' ? 'Running…' : (hasPrediction || prediction ? 'Re-run Prediction' : 'Run Prediction')}</button><button className="btn btn-primary" disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save Student'}</button></div></form></div></div>;
}

// Which normalized RAG label a student currently falls under, for the
// "All status" filter — same normalization used by RiskBadge above.
function studentStatus(student) {
  const raw = statusRaw(student);
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
    if (sortBy === 'risk-desc') list.sort((a, b) => (Number(dropoutRisk(b)) || 0) - (Number(dropoutRisk(a)) || 0));
    else if (sortBy === 'risk-asc') list.sort((a, b) => (Number(dropoutRisk(a)) || 0) - (Number(dropoutRisk(b)) || 0));
    else if (sortBy === 'name') list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return list;
  }, [students, search, statusFilter, sortBy]);
  const remove = async (student) => { if (!window.confirm(`Delete ${student.name}? This also removes their login account.`)) return; try { const response = await fetch(`${API_BASE}/admin/students/${student.id}`, { method: 'DELETE', credentials: 'include' }); const body = await response.json().catch(() => ({})); if (!response.ok || !body.success) throw new Error(body.error || 'Unable to delete student.'); setToast({ message: 'Student deleted.', isError: false }); load(); } catch (err) { setToast({ message: err.message, isError: true }); } };
  return <AppShell active="/students"><Toast message={toast.message} isError={toast.isError} onDone={() => setToast({ message: '', isError: false })} />{adding && <StudentWizard onClose={() => setAdding(false)} onSaved={() => { setToast({ message: 'Student and risk analysis saved.', isError: false }); load(); }} />}{editing && <EditStudent student={editing} onClose={() => setEditing(null)} onSaved={(message) => { setToast({ message: message || 'Student updated.', isError: false }); load(); }} onRefresh={() => { setToast({ message: 'Prediction updated.', isError: false }); load(); }} />}<div className="topbar"><div><span className="eyebrow">Student intelligence</span><h1>Student Directory</h1><p className="sub">Manage each student and their latest trained-model analysis in one place.</p></div><button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Student</button></div><div className="directory-tools"><input placeholder="Search by student, ID, or course…" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="dt-filters"><select className="dir-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All status</option><option value="At risk">At risk</option><option value="Watch">Watch</option><option value="On track">On track</option></select><select className="dir-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="risk-desc">Sort: Risk (high to low)</option><option value="risk-asc">Sort: Risk (low to high)</option><option value="name">Sort: Name</option></select><span>{filtered.length} students</span></div></div>{loading ? <PanelLoader label="Loading student directory…" /> : error ? <p className="wizard-error">{error}</p> : <div className="intelligence-grid">{filtered.map((student) => <article className="intelligence-card" key={student.id}><div className="card-title"><div className="student-avatar">{initials(student.name)}</div><div><h2>{student.name}</h2><p>{student.roll_no} · {student.course || 'No course'}</p></div><RiskBadge student={student} /></div><div className="student-metrics"><span><small>GPA</small><b>{student.gpa ?? '—'}</b></span><span><small>Attendance</small><b>{student.attendance_percentage == null ? '—' : `${student.attendance_percentage}%`}</b></span><span><small>Risk score</small><b>{percent(dropoutRisk(student))}</b></span></div><div className="card-actions"><button onClick={() => navigate(`/student-detail?id=${student.id}`)}>View Profile</button><button onClick={() => setEditing(student)}>Edit</button><button className="danger" onClick={() => remove(student)}>Delete</button></div></article>)}</div>}{!loading && !error && filtered.length === 0 && <div className="empty-directory">No students match this search.</div>}</AppShell>;
}
