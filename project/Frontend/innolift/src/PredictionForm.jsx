/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { API_BASE } from './apiBase';
import {
  MARITAL_STATUS, APPLICATION_MODE, COURSE, PREVIOUS_QUALIFICATION, NATIONALITY,
  MOTHERS_QUALIFICATION, FATHERS_QUALIFICATION, MOTHERS_OCCUPATION, FATHERS_OCCUPATION,
} from './datasetCodes';
import './pages/StudentIntelligence.css';

// Day 47: unlike QuickRiskCheck (a local, rule-based "live preview" — see
// that file's own comments), this form sends real input to the actual
// Phase 2 model (DecisionTreeClassifier, all 36 raw dataset columns)
// behind POST /api/predict and displays whatever comes back. Nothing
// here is computed client-side. Grouped into sections since 36 raw
// fields in one flat form would be unusable.
//
// Categorical fields (marital status, course, qualifications, occupations,
// ...) still send the exact numeric code the model was trained on — see
// datasetCodes.js — but are now picked from a searchable list instead of
// typed as a bare number, via <CodeCombobox> below.

export const PREDICTION_SECTIONS = [
  {
    title: 'Enrollment details',
    fields: [
      { key: 'marital_status', label: 'Marital status', options: MARITAL_STATUS },
      { key: 'application_mode', label: 'Application mode', options: APPLICATION_MODE },
      { key: 'application_order', label: 'Application order (0 = first choice)' },
      { key: 'course', label: 'Course', options: COURSE },
      { key: 'previous_qualification', label: 'Previous qualification', options: PREVIOUS_QUALIFICATION },
      { key: 'previous_qualification_grade', label: 'Previous qualification grade', step: 0.1 },
      { key: 'nationality', label: 'Nationality', options: NATIONALITY },
      { key: 'admission_grade', label: 'Admission grade', step: 0.1 },
      { key: 'age_at_enrollment', label: 'Age at enrollment' },
    ],
  },
  {
    title: 'Family background',
    fields: [
      { key: 'mothers_qualification', label: "Mother's qualification", options: MOTHERS_QUALIFICATION },
      { key: 'fathers_qualification', label: "Father's qualification", options: FATHERS_QUALIFICATION },
      { key: 'mothers_occupation', label: "Mother's occupation", options: MOTHERS_OCCUPATION },
      { key: 'fathers_occupation', label: "Father's occupation", options: FATHERS_OCCUPATION },
    ],
  },
  {
    title: 'Semester 1',
    fields: [
      { key: 'units_credited_sem1', label: 'Units credited' },
      { key: 'units_enrolled_sem1', label: 'Units enrolled' },
      { key: 'units_evaluations_sem1', label: 'Units evaluations' },
      { key: 'units_approved_sem1', label: 'Units approved' },
      { key: 'grade_sem1', label: 'Average grade', step: 0.1 },
      { key: 'units_without_eval_sem1', label: 'Units without evaluation' },
    ],
  },
  {
    title: 'Semester 2',
    fields: [
      { key: 'units_credited_sem2', label: 'Units credited' },
      { key: 'units_enrolled_sem2', label: 'Units enrolled' },
      { key: 'units_evaluations_sem2', label: 'Units evaluations' },
      { key: 'units_approved_sem2', label: 'Units approved' },
      { key: 'grade_sem2', label: 'Average grade', step: 0.1 },
      { key: 'units_without_eval_sem2', label: 'Units without evaluation' },
    ],
  },
  {
    title: 'Macroeconomic indicators (at enrollment)',
    fields: [
      { key: 'unemployment_rate', label: 'Unemployment rate (%)', step: 0.1 },
      { key: 'inflation_rate', label: 'Inflation rate (%)', step: 0.1 },
      { key: 'gdp', label: 'GDP', step: 0.01 },
    ],
  },
];

export const PREDICTION_TOGGLES = [
  { key: 'daytime_evening_attendance', label: 'Daytime attendance (unchecked = evening)' },
  { key: 'displaced', label: 'Displaced' },
  { key: 'educational_special_needs', label: 'Educational special needs' },
  { key: 'debtor', label: 'Debtor' },
  { key: 'tuition_up_to_date', label: 'Tuition fees up to date' },
  { key: 'gender', label: 'Gender (checked = male, per dataset coding)' },
  { key: 'scholarship_holder', label: 'Scholarship holder' },
  { key: 'international', label: 'International student' },
];

// A text input that behaves like a searchable dropdown: shows the current
// selection's label, filters the option list as the person types, and
// resolves back to the underlying numeric code on selection (or on blur,
// if what was typed is an exact label match). The field's value/onChange
// always deal in the code — same contract as a plain number input — so
// nothing downstream (validation, payload building) needs to change.
export function CodeCombobox({ value, onChange, options, placeholder }) {
  const [query, setQuery] = useState(null); // null = not editing; string = editing
  const wrapRef = useRef(null);
  const selected = options.find((o) => String(o.code) === String(value));
  const editing = query !== null;
  const displayValue = editing ? query : (selected ? selected.label : '');
  const filtered = editing && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!editing) return undefined;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        const exact = options.find((o) => o.label.toLowerCase() === query.trim().toLowerCase());
        if (exact) onChange(String(exact.code));
        setQuery(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, query, options]);

  const pick = (option) => { onChange(String(option.code)); setQuery(null); };

  return (
    <div className="code-combobox" ref={wrapRef}>
      <input
        type="text"
        value={displayValue}
        placeholder={placeholder || 'Type to search…'}
        onFocus={() => setQuery(selected ? '' : '')}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        required
      />
      {editing && filtered.length > 0 && (
        <ul className="code-combobox-list">
          {filtered.slice(0, 60).map((option) => (
            <li key={option.code} onMouseDown={() => pick(option)}>{option.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Renders one field — a searchable combobox for categorical fields (those
// with `options`), a plain number input otherwise. Shared by this form and
// the "Add student" wizard's Model data step so both stay in sync.
export function PredictionField({ field, value, onChange }) {
  if (field.options) {
    return <CodeCombobox value={value} onChange={onChange} options={field.options} />;
  }
  return <input type="number" step={field.step || 1} value={value} onChange={(e) => onChange(e.target.value)} required />;
}

const ALL_FIELD_KEYS = [
  ...PREDICTION_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)),
  ...PREDICTION_TOGGLES.map((t) => t.key),
];

const EMPTY_FORM = Object.fromEntries(
  ALL_FIELD_KEYS.map((key) => [key, PREDICTION_TOGGLES.some((t) => t.key === key) ? false : ''])
);

// Result box + "AT RISK" style label for each raw model class.
const RESULT_BOX_CLASS = { Dropout: '', Enrolled: 'medium', Graduate: 'low' };
const RESULT_HEADLINE = { Dropout: 'AT RISK', Enrolled: 'WATCH', Graduate: 'ON TRACK' };

// Groups the 4-step wizard around the same PREDICTION_SECTIONS used
// everywhere else in the app (see the "Add Student" wizard in
// StudentIntelligence.jsx) — no fields added or removed, just organized
// into digestible steps instead of one long scroll.
const STEPS = [
  { num: 1, label: 'Enrollment details', sub: 'Basic academic and admission info' },
  { num: 2, label: 'Academic performance', sub: 'Semester-wise performance' },
  { num: 3, label: 'Background', sub: 'Family & personal background' },
  { num: 4, label: 'Review & predict', sub: 'See inputs and get prediction' },
];

// Global feature importance from the real trained model
// (model.feature_importances_ — see GET /api/model-info), fetched once
// below. This model doesn't expose a per-prediction breakdown, so the
// preview panel shows what drives risk across the cohort generally
// rather than claiming a per-student figure — labeled accordingly.
function driverLevel(importance, max) {
  const ratio = max ? importance / max : 0;
  if (ratio >= 0.6) return 'High';
  if (ratio >= 0.25) return 'Moderate';
  return 'Low';
}
const DRIVER_COLOR = { High: 'var(--rag-red)', Moderate: 'var(--rag-amber)', Low: 'var(--rag-green)' };

function sectionByTitle(title) {
  return PREDICTION_SECTIONS.find((s) => s.title === title);
}

function PredictionForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/model-info?top=5`)
      .then((res) => (res.ok ? res.json() : { feature_importances: [] }))
      .then((body) => { if (active) setDrivers(body.feature_importances || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step < 4) { setStep((s) => Math.min(4, s + 1)); return; }
    setLoading(true);
    setError(null);
    setResult(null);

    const body = { ...form };
    PREDICTION_TOGGLES.forEach(({ key }) => {
      body[key] = form[key] ? 1 : 0;
    });

    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let responseBody = {};
      try {
        responseBody = await res.json();
      } catch {
        responseBody = {};
      }

      if (!res.ok || !responseBody.success) {
        throw new Error(responseBody.error || 'Prediction failed.');
      }

      setResult(responseBody);
    } catch (err) {
      // Covers both "backend returned an error" and "backend unreachable"
      // (fetch() throws "Failed to fetch" for the latter, before res.json()).
      setError(err.message === 'Failed to fetch' ? 'Unable to reach the prediction service.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFields = (fields) => fields.map(({ key, label, ...field }) => (
    <label key={key}>
      {label}
      <PredictionField field={field} value={form[key]} onChange={(value) => setField(key, value)} />
    </label>
  ));

  const enrollment = sectionByTitle('Enrollment details');
  const semester1 = sectionByTitle('Semester 1');
  const semester2 = sectionByTitle('Semester 2');
  const family = sectionByTitle('Family background');
  const macro = sectionByTitle('Macroeconomic indicators (at enrollment)');

  const resultKey = result ? RESULT_BOX_CLASS[result.prediction] : null;

  return (
    <div className="prediction-wizard">
      <div className="stepper">
        {STEPS.map((s) => (
          <button
            type="button"
            key={s.num}
            className={`step-chip${step === s.num ? ' active' : ''}`}
            onClick={() => setStep(s.num)}
          >
            <span className="step-num">{s.num}</span>
            <span className="step-text">
              <span className="step-label">{s.label}</span>
              <span className="step-sub">{s.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <form className="predictor-grid" onSubmit={handleSubmit}>
        <div className="panel chart-panel">
          <div className="panel-body">
            {step === 1 && <div className="predictor-fields">{renderFields(enrollment.fields)}</div>}
            {step === 2 && (
              <>
                <h3 className="pf-subhead">Semester 1</h3>
                <div className="predictor-fields">{renderFields(semester1.fields)}</div>
                <h3 className="pf-subhead">Semester 2</h3>
                <div className="predictor-fields">{renderFields(semester2.fields)}</div>
              </>
            )}
            {step === 3 && (
              <>
                <h3 className="pf-subhead">Family background</h3>
                <div className="predictor-fields">{renderFields(family.fields)}</div>
                <h3 className="pf-subhead">Macroeconomic indicators</h3>
                <div className="predictor-fields">{renderFields(macro.fields)}</div>
                <h3 className="pf-subhead">Student status</h3>
                <div className="predictor-toggles">
                  {PREDICTION_TOGGLES.map(({ key, label }) => (
                    <label key={key}>
                      <input type="checkbox" checked={form[key]} onChange={(e) => setField(key, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <h3 className="pf-subhead">Review &amp; predict</h3>
                <p className="chart-note">
                  Double-check the details entered across the previous steps, then run the trained model.
                  Nothing here is saved — to keep a student record along with their prediction, use the Student Directory instead.
                </p>
              </>
            )}
          </div>
          <div className="predict-actions">
            {step > 1 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</button>}
            {step < 4
              ? <button type="submit" className="btn btn-primary">Next →</button>
              : <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Generating prediction…' : 'Run prediction'}</button>}
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-body shield-wrap">
            <h3 className="panel-title">What happens next?</h3>
            <div className="shield">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div className="whatnext-item"><span className="whatnext-num">1</span>We analyze the inputs using the trained model.</div>
            <div className="whatnext-item"><span className="whatnext-num">2</span>You&rsquo;ll get a risk level and key contributing factors.</div>
            <div className="whatnext-item"><span className="whatnext-num">3</span>No student record will be created or saved.</div>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-body">
            <h3 className="panel-title" style={{ marginBottom: '0.9rem' }}>Prediction preview</h3>
            {error && <p className="wizard-error">{error}</p>}
            {!result && !error && <p className="chart-note">Work through the steps and run the model to see a result here.</p>}
            {result && (
              <>
                <div className={`risk-result ${resultKey}`}>
                  <div className="risk-result-label">{RESULT_HEADLINE[result.prediction] || result.prediction}</div>
                  <p className="chart-note" style={{ margin: '0.4rem 0 0' }}>Dropout risk</p>
                  <div className="risk-result-pct">{Math.round((result.probabilities?.Dropout ?? 0) * 100)}%</div>
                  <p className="chart-note" style={{ margin: '0.6rem 0 0' }}>Model confidence: {Math.round(result.confidence * 100)}%</p>
                </div>
                <h3 className="pf-subhead" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Key contributing factors <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--ink-faint)' }}>(global feature importance, cohort-wide)</span>
                </h3>
                {drivers.map((driver) => {
                  const level = driverLevel(driver.importance, drivers[0]?.importance);
                  return (
                    <div className="factor" key={driver.feature}>
                      <div className="factor-label"><span className="name">{driver.label}</span><span className="weight" style={{ color: DRIVER_COLOR[level] }}>{level}</span></div>
                      <div className="factor-bar"><span style={{ width: `${Math.round((driver.importance / (drivers[0]?.importance || 1)) * 100)}%`, background: DRIVER_COLOR[level] }}></span></div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.print()}>&#8595; Download PDF</button>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default PredictionForm;
