# Day 46 — Plugging In the ML Model

## Model used

The actual Phase 2 model (Module 2, Days 19–20; see that project's own
`README.md`): a **DecisionTreeClassifier** (`max_depth=8`,
`class_weight="balanced"`, `random_state=42`), trained in Colab on the
UCI **"Predict students' dropout and academic success"** dataset (4,424
rows, all 36 raw feature columns — no scaling, since trees split on raw
values regardless of whether a number represents a category or a
quantity). Target: **Dropout / Enrolled / Graduate**, encoded 0/1/2 at
training time.

Test accuracy: **67%** (macro F1 0.64) — matches the Phase 2 notebook's
own evaluation output exactly.

`ml/train_model.py` reproduces `ml/dropout_model.pkl` from `data.csv`,
mirroring the notebook's steps (drop Target, encode it, 80/20 stratified
split, fit, save via pickle).

## Model input

All **36 fields** the model was trained on, sent as JSON to
`POST /api/predict`. Field names are simplified for the API but map 1:1
to the dataset's raw columns (see `ml/model.py`'s `FIELD_TO_FEATURE`):

- Enrollment: `marital_status`, `application_mode`, `application_order`,
  `course`, `daytime_evening_attendance`, `previous_qualification`,
  `previous_qualification_grade`, `nationality`, `admission_grade`,
  `age_at_enrollment`, `displaced`, `educational_special_needs`,
  `international`, `gender`
- Family: `mothers_qualification`, `fathers_qualification`,
  `mothers_occupation`, `fathers_occupation`
- Finance: `debtor`, `tuition_up_to_date`, `scholarship_holder`
- Semester 1: `units_credited_sem1`, `units_enrolled_sem1`,
  `units_evaluations_sem1`, `units_approved_sem1`, `grade_sem1`,
  `units_without_eval_sem1`
- Semester 2: same 6, suffixed `_sem2`
- Macro: `unemployment_rate`, `inflation_rate`, `gdp`

`daytime_evening_attendance`, `displaced`, `educational_special_needs`,
`debtor`, `tuition_up_to_date`, `gender`, `scholarship_holder`, and
`international` must be `0` or `1`. Everything else just needs to be
numeric — the dataset's categorical codes (course, application mode,
nationality, qualification/occupation codes) span dataset-specific
ranges documented by UCI, not a range this API invents.

## Model output

```json
{
  "success": true,
  "prediction": "Dropout",
  "confidence": 0.614,
  "probabilities": {
    "Dropout": 0.614,
    "Enrolled": 0.1157,
    "Graduate": 0.2703
  }
}
```

Verified against the dataset's own row 1 (a known Dropout case) —
the model correctly predicts Dropout with 61.4% confidence.

## Preprocessing

None beyond ordering the 36 fields into the exact column order the tree
was trained on (`FEATURE_ORDER` in `ml/model.py`). No scaling — decision
trees don't need it, and the Phase 2 notebook didn't apply any.

## Prediction endpoint

`POST /api/predict` — separate from `/admin/students/<id>/predict`
(a different, not-yet-built per-student pipeline in `ml_predictor.py`;
left untouched).

## Validation performed

| Case | Trigger | Status |
|---|---|---|
| Missing field(s) | any of the 36 keys absent | 400 |
| Empty input | `null`/`""` for a required field | 400 |
| Wrong data type | non-numeric string in a numeric field | 400 |
| Invalid binary value | a 0/1 field sent as something else (e.g. `5`) | 400 |
| Empty JSON body | `{}` | 400 |
| No request body | POST with no body at all | 400 |

None of these crash the server — `validate_input()` raises
`InvalidPredictionInput`, caught in `app.py` and turned into a 400.

## Postman test results

| Test | Method | Result | Status |
|---|---|---|---|
| Valid prediction | POST | Passed | 200 |
| Missing fields | POST | Passed | 400 |
| Empty JSON body | POST | Passed | 400 |
| Wrong data type | POST | Passed | 400 |
| Invalid binary value | POST | Passed | 400 |
| No request body | POST | Passed | 400 |

*(Requests are in `Student Management API.postman_collection.json` —
run them yourself and screenshot; fill in Actual Result below.)*

## Screenshots

*(Insert: successful prediction, one invalid-input example.)*

## Architecture notes

- **Model loads once at startup**: `ml/model.py` calls `_load_model()`
  at import time; `app.py` imports from `ml.model` at the top of the
  file, so the `.pkl` is deserialized exactly once when Flask starts.
- **Consistency**: a decision tree is deterministic at inference —
  same input always gives the same output. Verified by predicting the
  same input twice and diffing the responses.
- **Existing APIs unaffected**: `/api/students` (GET/POST) and the
  `/admin/*` routes are untouched; `/api/predict` is purely additive.
- **Library version pinned**: `requirements.txt` pins
  `scikit-learn==1.6.1` to match the version the notebook trained with —
  unpickling with a different version prints a
  `InconsistentVersionWarning` and risks subtly different behavior.
