// Presentational component — same props pattern as Day 27's StudentProfileCard.jsx.
// Takes data in, renders it out. No state of its own.

const STATUS_STYLES = {
  'On track': { bg: '#E7F4ED', fg: '#2F8558', dot: '#2F8558' },
  'Watch':    { bg: '#FBF0DD', fg: '#B9781E', dot: '#B9781E' },
  'At risk':  { bg: '#FBEAE9', fg: '#C4433F', dot: '#C4433F' },
};

function StudentRiskCard({ attendance, gpa, status }) {
  const style = STATUS_STYLES[status];

  return (
    <div className="risk-card">
      <div className="risk-card-head">
        <span className="risk-card-label">Live preview</span>
        <span
          className="risk-pill"
          style={{ background: style.bg, color: style.fg }}
        >
          <span className="risk-pill-dot" style={{ background: style.dot }} />
          {status}
        </span>
      </div>

      <div className="risk-metric-row">
        <span className="k">Attendance</span>
        <span className="v">{attendance === '' ? '—' : `${attendance}%`}</span>
      </div>
      <div className="risk-metric-row">
        <span className="k">Previous GPA</span>
        <span className="v">{gpa === '' ? '—' : `${gpa} / 10`}</span>
      </div>
    </div>
  );
}

export default StudentRiskCard;
