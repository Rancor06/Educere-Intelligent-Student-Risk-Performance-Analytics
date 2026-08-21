import { useMemo } from 'react';
import AppShell from '../layout/AppShell';

const COURSE_ROWS = [
  ['Nursing', 2, '87%', '12.1', 0],
  ['Management', 1, '100%', '11.2', 0],
  ['Veterinary Nursing', 1, '100%', '14.4', 0],
  ['Advertising & Marketing Mgmt', 1, '80%', '12.2', 0],
  ['Social Service', 1, '83%', '11.8', 0],
  ['Basic Education', 1, '86%', '12.3', 0],
  ['Informatics Engineering', 1, '20%', '11.3', 1],
  ['Tourism', 1, '0%', '—', 1],
  ['Equinculture', 1, '0%', '—', 1],
];

// Converted from reports.html + the attendance-trend SVG builder that
// used to live in app.js — same 6-week illustrative series, same line
// chart, just rendered directly as JSX instead of injected via
// innerHTML on window load.

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

function ReportsPage() {
  const downloadCsv = useMemo(() => () => {
    const rows = [['Course', 'Students', 'Avg. completion', 'Avg. grade (0-20)', 'At risk'],
      ...COURSE_ROWS.map((r) => r.map(String))];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `educere-cohort-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <AppShell active="/reports">
      <div className="topbar">
        <div>
          <span className="eyebrow">Cohort · CS-2026-A</span>
          <h1>Reports</h1>
          <p className="sub">Cohort-level patterns behind the individual risk scores.</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={downloadCsv}>&#8595; Download cohort report</button>
      </div>

      <div className="panel chart-panel">
        <div className="panel-head"><h2>Risk distribution</h2></div>
        <div className="panel-body">
          <p className="chart-note">Based on the 10 students sampled from the real UCI dropout-risk dataset.</p>
          <div className="distribution-bar">
            <span className="seg-green" style={{ width: '50%' }}></span>
            <span className="seg-amber" style={{ width: '20%' }}></span>
            <span className="seg-red" style={{ width: '30%' }}></span>
          </div>
          <div className="legend">
            <span><span className="dot green"></span>On track — <strong>5</strong></span>
            <span><span className="dot amber"></span>Watch — <strong>2</strong></span>
            <span><span className="dot red"></span>At risk — <strong>3</strong></span>
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
            <p className="chart-note">Feature importance from the dropout-risk model, averaged across the cohort.</p>
            {[
              ['1st sem. units approved', '0.31', 31],
              ['Admission grade', '0.24', 24],
              ['Attendance rate', '0.19', 19],
              ['Tuition fees up to date', '0.14', 14],
              ['Scholarship holder', '0.08', 8],
            ].map(([name, weight, pct]) => (
              <div className="factor" key={name}>
                <div className="factor-label"><span className="name">{name}</span><span className="weight">{weight}</span></div>
                <div className="factor-bar"><span style={{ width: `${pct}%` }}></span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="panel-head"><h2>By course</h2></div>
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
            {COURSE_ROWS.map(([course, students, completion, grade, atRisk]) => (
              <tr key={course}>
                <td>{course}</td>
                <td>{students}</td>
                <td>{completion}</td>
                <td>{grade}</td>
                <td><span className={`rag-pill ${atRisk ? 'red' : 'green'}`}><span className="dot"></span>{atRisk}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export default ReportsPage;
