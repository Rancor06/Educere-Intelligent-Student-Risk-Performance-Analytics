import { useState } from 'react';
import StudentRiskCard from './StudentRiskCard';

// Thresholds intentionally match the sliders on EduTrack's own Settings page
// ("Watch" = 80% attendance, "At risk" = 65% attendance) so this widget reads
// as the same model, not a different one.
function classifyAttendance(pct) {
  if (pct === '' || isNaN(pct)) return 0;
  if (pct < 65) return 2;
  if (pct < 80) return 1;
  return 0;
}

// GPA is on the same 0.00-10.00 scale as the Day 26 registration form.
function classifyGpa(gpa) {
  if (gpa === '' || isNaN(gpa)) return 0;
  if (gpa < 5) return 2;
  if (gpa < 6.5) return 1;
  return 0;
}

const LABELS = ['On track', 'Watch', 'At risk'];

function QuickRiskCheck() {
  const [attendance, setAttendance] = useState('');
  const [gpa, setGpa] = useState('');

  const severity = Math.max(classifyAttendance(attendance), classifyGpa(gpa));
  const status = LABELS[severity];

  return (
    <div className="quick-risk-check">
      <div className="qrc-intro">
        <h1>Quick risk check</h1>
        <p>
          A live preview of what re-assessing a student's risk status could
          look like once EduTrack moves to React — type in updated figures
          and the status recalculates as you go.
        </p>
      </div>

      <div className="qrc-body">
        <div className="qrc-inputs">
          <label className="qrc-field">
            <span>Attendance %</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0–100"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
            />
          </label>

          <label className="qrc-field">
            <span>Previous GPA</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.01"
              placeholder="0.00–10.00"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
            />
          </label>
        </div>

        <StudentRiskCard attendance={attendance} gpa={gpa} status={status} />
      </div>
    </div>
  );
}

export default QuickRiskCheck;
