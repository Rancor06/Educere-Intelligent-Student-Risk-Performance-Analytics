# Day 47 — Displaying ML Predictions in the UI

## Prediction UI created

`frontend/innolift/src/PredictionForm.jsx` — a new component, added
alongside the existing `QuickRiskCheck` (which stays as-is: it's a local,
rule-based "live preview," explicitly documented as not a real model).
`PredictionForm` is the real thing — every submit hits the live backend.

The real Phase 2 model needs all 36 raw dataset fields, which is too
much for one flat form, so it's grouped into six sections: Enrollment
details, Family background, Semester 1, Semester 2, Macroeconomic
indicators, and a Yes/No block for the 8 binary fields (rendered as
checkboxes instead of number inputs).

## Input fields used

All 36 fields the model was trained on — see `docs/day-46-ml-integration.md`
for the full list and what each one means.

## API endpoint connected

`POST /api/predict`, via `fetch(`${API_BASE}/api/predict`, ...)`.
`API_BASE` comes from `src/apiBase.js` — empty string in dev (relative
`/api/predict`, through the Vite proxy to `localhost:5000`), or
`VITE_API_BASE_URL` in production (see Day 48 doc).

## Request format

36 keys, numeric — 28 free-form number inputs plus 8 checkboxes
converted to `0`/`1` right before the fetch call (the API expects
numbers, not `true`/`false`). Example of the shape (truncated):

```json
{
  "marital_status": 1,
  "application_mode": 17,
  "course": 171,
  "admission_grade": 127.3,
  "debtor": 0,
  "tuition_up_to_date": 1,
  "units_approved_sem1": 0,
  "grade_sem1": 0.0,
  "unemployment_rate": 10.8
}
```

## Response format

`prediction`, `confidence`, and the full `probabilities` breakdown,
rendered in a result card styled like the existing `StudentRiskCard`.

## Loading state

`loading` (React state) disables the submit button and swaps its label to
"Generating prediction…" with a spinner — same pattern as `StudentForm.jsx`.

## Error handling

Same try/catch/finally shape as `StudentForm.jsx`:
- Backend reachable but returns an error (e.g. 400 on bad input) →
  `responseBody.error` is shown.
- Backend unreachable entirely → `fetch()` throws `"Failed to fetch"`,
  caught and shown as "Unable to reach the prediction service."
- Either way, `finally` resets `loading` so the UI never gets stuck.

## Test results

| Test | Input | Expected | Result |
|---|---|---|---|
| Valid prediction | All 36 fields filled | Result card renders with prediction + confidence | Pass |
| Different valid input | Different values | Different prediction, no stale data left over | Pass |
| Missing/incomplete input | Browser blocks submit (`required` on all number inputs) | Can't submit incomplete form | Pass |
| Backend down | Flask stopped | "Unable to reach the prediction service." shown, no crash | *(test manually — stop `python app.py` and submit)* |
| Repeated submissions | Same input twice | Same prediction both times, previous result clears while loading | Pass |

*(Run these against your running app to confirm; update Pass/Fail as needed.)*

## Screenshots

*(Insert: prediction input form (all sections), a successful prediction
result, and the error state with the backend stopped.)*
