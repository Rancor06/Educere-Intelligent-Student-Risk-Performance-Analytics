/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { API_BASE } from './apiBase';
import {
  MARITAL_STATUS, APPLICATION_MODE, COURSE, PREVIOUS_QUALIFICATION, NATIONALITY,
  MOTHERS_QUALIFICATION, FATHERS_QUALIFICATION, MOTHERS_OCCUPATION, FATHERS_OCCUPATION,
} from './datasetCodes';

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

const STATUS_STYLES = {
  Dropout: { bg: '#FBEAE9', fg: '#C4433F', dot: '#C4433F' },
  Enrolled: { bg: '#FBF0DD', fg: '#B9781E', dot: '#B9781E' },
  Graduate: { bg: '#E7F4ED', fg: '#2F8558', dot: '#2F8558' },
};

function PredictionForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
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

  const style = result ? STATUS_STYLES[result.prediction] : null;

  return (
    <div className="prediction-form-wrap">
      <div className="qrc-intro">
        <h1>Independent risk prediction</h1>
        <p>
          This is for a one-off model check. The prediction is returned by the trained model and is not saved to a student record.
        </p>
      </div>

      <form className="student-form prediction-model-form" onSubmit={handleSubmit}>
        {PREDICTION_SECTIONS.map((section) => (
          <fieldset className="pf-section" key={section.title}>
            <legend>{section.title}</legend>
            {section.fields.map(({ key, label, ...field }) => (
              <label key={key}>
                {label}
                <PredictionField field={field} value={form[key]} onChange={(value) => setField(key, value)} />
              </label>
            ))}
          </fieldset>
        ))}

        <fieldset className="pf-section">
          <legend>Yes / no</legend>
          <div className="pf-toggles">
            {PREDICTION_TOGGLES.map(({ key, label }) => (
              <label key={key} className="pf-toggle">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setField(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Generating prediction…
            </>
          ) : (
            'Predict'
          )}
        </button>

        {error && <p className="sf-message sf-message-error">{error}</p>}
      </form>

      {result && style && (
        <div className="risk-card">
          <div className="risk-card-head">
            <span className="risk-card-label">Model prediction</span>
            <span className="risk-pill" style={{ background: style.bg, color: style.fg }}>
              <span className="risk-pill-dot" style={{ background: style.dot }} />
              {result.prediction}
            </span>
          </div>
          <div className="risk-metric-row">
            <span className="k">Confidence</span>
            <span className="v">{Math.round(result.confidence * 100)}%</span>
          </div>
          {Object.entries(result.probabilities).map(([label, p]) => (
            <div className="risk-metric-row" key={label}>
              <span className="k">{label}</span>
              <span className="v">{Math.round(p * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PredictionForm;
