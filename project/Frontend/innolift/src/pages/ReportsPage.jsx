import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '../layout/AppShell';
import PanelLoader from '../components/PanelLoader';
import { API_BASE } from '../apiBase';
import { statusRaw } from '../riskLabel';

// Converted from reports.html + the attendance-trend SVG builder that
// used to live in app.js — same 6-week illustrative series, same line
// chart, just rendered directly as JSX instead of injected via
// innerHTML on window load. Left as illustrative (see panel-head note
// below) because the source dataset is a single end-of-semester
// snapshot with no weekly records to chart for real.

function TrendChart() {
  const data = [88, 85, 83, 80, 79, 81];
  const labels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'];
  const w = 460, h = 160, pad = 28;
  const min = 70, max = 95;
  const x = (i) => pad + (i * (w - pad * 2)) / (data.length - 1);
  const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const points = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  return (
    <svg className="trend-svg" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#E1E5EC" />
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E1E5EC" />
      <polyline points={points} fill="none" stroke="#33415C" strokeWidth="2" />
      {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#33415C" />)}
      {labels.map((l, i) => (
        <text key={l} x={x(i)} y={h - 6} fontSize="10" fill="#8B93A6" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">{l}</text>
      ))}
    </svg>
  );
}

const RISK_LABEL = { Dropout: 'At risk', Enrolled: 'Watch', Graduate: 'On track' };

// These legacy/miscellaneous course labels are intentionally hidden from
// the cohort's By course breakdown. Student records remain untouched.
const HIDDEN_COURSES = new Set([
  'AI & DS',
  'CSE',
  'Computer Science',
  'Social Service (evening)',
]);

function ReportsPage() {
  const [students, setStudents] = useState([]);
  const [importances, setImportances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReportData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [rosterResponse, modelResponse] = await Promise.all([
        fetch(`${API_BASE}/admin/students`, { credentials: 'include', cache: 'no-store' }),
        fetch(`${API_BASE}/api/model-info?top=5`, { cache: 'no-store' }),
      ]);
      if (!rosterResponse.ok) throw new Error('roster');
      const roster = await rosterResponse.json();
      const modelInfo = modelResponse.ok ? await modelResponse.json() : { feature_importances: [] };
      setStudents(Array.isArray(roster) ? roster : []);
      setImportances(Array.isArray(modelInfo.feature_importances) ? modelInfo.feature_importances : []);
      setError('');
    } catch {
      setError('Could not load live cohort data — is the Flask app running and are you logged in as admin?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportData(true);

    // Refresh whenever the admin returns to this page/window. This keeps the
    // report tied to the database rather than to a stale in-memory roster.
    const refresh = () => loadReportData(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('educere:students-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('educere:students-changed', refresh);
    };
  }, [loadReportData]);

  // Real risk distribution — counted from each student's actual saved
  // prediction (risk_prediction), not a static mock split.
  const distribution = useMemo(() => {
    const tally = { 'On track': 0, Watch: 0, 'At risk': 0, 'Not analysed': 0 };
    students.forEach((student) => {
      const raw = statusRaw(student);
      const label = RISK_LABEL[raw] || (raw !== 'Not analysed' ? raw : null);
      tally[label && tally[label] !== undefined ? label : 'Not analysed'] += 1;
    });
    return tally;
  }, [students]);
  const analysedTotal = students.length - distribution['Not analysed'];
  const pct = (n) => (analysedTotal ? Math.round((n / analysedTotal) * 100) : 0);

  // Real per-course rollup — grouped from live student records rather
  // than a hardcoded course table.
  const courseRows = useMemo(() => {
    const byCourse = new Map();
    students.forEach((student) => {
      const course = student.course || 'No course recorded';
      if (HIDDEN_COURSES.has(course)) return;
      if (!byCourse.has(course)) byCourse.set(course, []);
      byCourse.get(course).push(student);
    });
    return [...byCourse.entries()].map(([course, list]) => {
      const enrolled = list.reduce((sum, s) => sum + (Number(s.units_1st_sem_enrolled) || 0) + (Number(s.units_2nd_sem_enrolled) || 0), 0);
      const approved = list.reduce((sum, s) => sum + (Number(s.units_1st_sem_approved) || 0) + (Number(s.units_2nd_sem_approved) || 0), 0);
      const completion = enrolled ? `${Math.round((approved / enrolled) * 100)}%` : '—';
      const gpaValues = list.map((s) => Number(s.gpa)).filter((v) => !Number.isNaN(v) && v > 0);
      // GPA is stored on a 0-10 scale (see seed_students.py); shown here
      // on the dataset's native 0-20 grade scale for consistency with
      // "Curricular units (grade)", which is what the model was trained on.
      const avgGrade = gpaValues.length ? (gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length * 2).toFixed(1) : '—';
      const atRisk = list.filter((s) => (RISK_LABEL[s.risk_prediction] || s.risk_prediction) === 'At risk').length;
      return [course, list.length, completion, avgGrade, atRisk];
    }).sort((a, b) => b[1] - a[1]);
  }, [students]);

  const downloadCsv = () => {
    const rows = [['Course', 'Students', 'Avg. completion', 'Avg. grade (0-20)', 'At risk'],
      ...courseRows.map((r) => r.map(String))];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `educere-cohort-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxImportance = importances.length ? importances[0].importance : 1;

  return (
    <AppShell active="/reports">
      <div className="topbar">
        <div>
          <span className="eyebrow">Cohort</span>
          <h1>Reports</h1>
          <p className="sub">Cohort-level patterns behind the individual risk scores.</p>
        </div>
        <button className="btn btn-primary" onClick={downloadCsv} disabled={!courseRows.length}>&#8595; Download cohort report</button>
      </div>

      {loading ? <PanelLoader label="Loading cohort report…" /> : error ? <p className="wizard-error">{error}</p> : <>
        <div className="panel chart-panel">
          <div className="panel-head"><h2>Risk distribution</h2></div>
          <div className="panel-body">
            <p className="chart-note">Based on the {students.length} students currently in the Student Directory{distribution['Not analysed'] ? ` (${distribution['Not analysed']} not yet analysed)` : ''}.</p>
            <div className="distribution-bar">
              <span className="seg-green" style={{ width: `${pct(distribution['On track'])}%` }}></span>
              <span className="seg-amber" style={{ width: `${pct(distribution.Watch)}%` }}></span>
              <span className="seg-red" style={{ width: `${pct(distribution['At risk'])}%` }}></span>
            </div>
            <div className="legend">
              <span><span className="dot green"></span>On track — <strong>{distribution['On track']}</strong></span>
              <span><span className="dot amber"></span>Watch — <strong>{distribution.Watch}</strong></span>
              <span><span className="dot red"></span>At risk — <strong>{distribution['At risk']}</strong></span>
            </div>
          </div>
        </div>

        <div className="reports-grid">
          <div className="panel chart-panel">
            <div className="panel-head">
              <h2>Engagement trend <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', fontWeight: 400 }}>(illustrative)</span></h2>
            </div>
            <div className="panel-body">
              <p className="chart-note">The source dataset is a single end-of-semester snapshot, not weekly records — this chart shows the shape a real trend view would take once attendance/engagement tracking is wired in.</p>
              <TrendChart />
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-head"><h2>Cohort risk drivers</h2></div>
            <div className="panel-body">
              <p className="chart-note">Global feature importance from the trained Decision Tree (model.feature_importances_) — how much each input drove split decisions across the whole model, not a per-student explanation.</p>
              {importances.map((driver) => (
                <div className="factor" key={driver.feature}>
                  <div className="factor-label"><span className="name">{driver.label}</span><span className="weight">{driver.importance.toFixed(2)}</span></div>
                  <div className="factor-bar"><span style={{ width: `${Math.round((driver.importance / maxImportance) * 100)}%` }}></span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-head"><h2>By course</h2><button className="btn btn-ghost" type="button" onClick={() => loadReportData(false)}>Refresh data</button></div>
          <table className="course-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Students</th>
                <th>Avg. completion</th>
                <th>Avg. grade (0–20)</th>
                <th>At risk</th>
              </tr>
            </thead>
            <tbody>
              {courseRows.map(([course, count, completion, grade, atRisk]) => (
                <tr key={course}>
                  <td>{course}</td>
                  <td>{count}</td>
                  <td>{completion}</td>
                  <td>{grade}</td>
                  <td><span className={`rag-pill ${atRisk ? 'red' : 'green'}`}><span className="dot"></span>{atRisk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </AppShell>
  );
}

export default ReportsPage;
