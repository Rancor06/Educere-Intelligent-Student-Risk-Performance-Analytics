// Shared "what should we call this student's status" logic — used
// anywhere a card/badge/table needs a human-readable risk status.
//
// risk_prediction is the model's own predicted class ("Dropout" /
// "Enrolled" / "Graduate") and is always safe to use as a status.
//
// dropout_risk is a legacy column: for students seeded before the Day 49
// risk-analysis columns existed, it holds a status string ("On track" /
// "Watch" / "At risk" / "Prediction Pending"). Going forward the backend
// stores the NUMERIC dropout probability there instead (see app.py) — a
// value that must never be shown or matched as if it were a label.
export function isNumericDropoutRisk(value) {
  return value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value));
}

export function statusRaw(student) {
  if (student?.risk_prediction) return student.risk_prediction;
  if (student?.dropout_risk && !isNumericDropoutRisk(student.dropout_risk) && student.dropout_risk !== 'Prediction Pending') {
    return student.dropout_risk;
  }
  return 'Not analysed';
}
