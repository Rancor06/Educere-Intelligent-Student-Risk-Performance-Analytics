"""
Day 46 — Dropout risk prediction module.

Keeps ML logic (loading, preprocessing, inference) completely separate
from Flask routes in app.py. app.py should only ever call predict_risk().

Model: the actual Phase 2 model (Module 2, Days 19-20) —
DecisionTreeClassifier(max_depth=8, class_weight="balanced",
random_state=42), trained in Colab on the UCI "Predict students' dropout
and academic success" dataset, all 36 raw feature columns, no scaling
(trees split on raw values regardless of whether a number represents a
category or a quantity — see that project's README). Target encoded at
training time as Dropout=0, Enrolled=1, Graduate=2; decoded back to the
label strings before this module returns anything.

Pipeline:
    raw input dict -> validate -> order into the 36-value feature vector
    (same column order as feature_names_in_) -> DecisionTreeClassifier
    -> decode 0/1/2 back to Dropout/Enrolled/Graduate
"""

import os
import pickle

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "dropout_model.pkl")

_model = None  # loaded once at import time, not per-request


def _load_model():
    global _model
    if _model is None:
        with open(_MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
    return _model


# Load immediately when this module is imported (i.e. once, at Flask
# startup when app.py does `from ml.model import predict_risk`), not on
# every request.
_load_model()

# Exact column order the model was trained on (df.drop("Target", axis=1)).
FEATURE_ORDER = [
    "Marital status",
    "Application mode",
    "Application order",
    "Course",
    "Daytime/evening attendance\t",
    "Previous qualification",
    "Previous qualification (grade)",
    "Nacionality",
    "Mother's qualification",
    "Father's qualification",
    "Mother's occupation",
    "Father's occupation",
    "Admission grade",
    "Displaced",
    "Educational special needs",
    "Debtor",
    "Tuition fees up to date",
    "Gender",
    "Scholarship holder",
    "Age at enrollment",
    "International",
    "Curricular units 1st sem (credited)",
    "Curricular units 1st sem (enrolled)",
    "Curricular units 1st sem (evaluations)",
    "Curricular units 1st sem (approved)",
    "Curricular units 1st sem (grade)",
    "Curricular units 1st sem (without evaluations)",
    "Curricular units 2nd sem (credited)",
    "Curricular units 2nd sem (enrolled)",
    "Curricular units 2nd sem (evaluations)",
    "Curricular units 2nd sem (approved)",
    "Curricular units 2nd sem (grade)",
    "Curricular units 2nd sem (without evaluations)",
    "Unemployment rate",
    "Inflation rate",
    "GDP",
]

# The JSON field the API accepts for each model column. Only differs from
# FEATURE_ORDER where the raw column name is awkward as a JSON key (the
# trailing tab in "Daytime/evening attendance\t" being the obvious one).
FIELD_TO_FEATURE = {
    "marital_status": "Marital status",
    "application_mode": "Application mode",
    "application_order": "Application order",
    "course": "Course",
    "daytime_evening_attendance": "Daytime/evening attendance\t",
    "previous_qualification": "Previous qualification",
    "previous_qualification_grade": "Previous qualification (grade)",
    "nationality": "Nacionality",
    "mothers_qualification": "Mother's qualification",
    "fathers_qualification": "Father's qualification",
    "mothers_occupation": "Mother's occupation",
    "fathers_occupation": "Father's occupation",
    "admission_grade": "Admission grade",
    "displaced": "Displaced",
    "educational_special_needs": "Educational special needs",
    "debtor": "Debtor",
    "tuition_up_to_date": "Tuition fees up to date",
    "gender": "Gender",
    "scholarship_holder": "Scholarship holder",
    "age_at_enrollment": "Age at enrollment",
    "international": "International",
    "units_credited_sem1": "Curricular units 1st sem (credited)",
    "units_enrolled_sem1": "Curricular units 1st sem (enrolled)",
    "units_evaluations_sem1": "Curricular units 1st sem (evaluations)",
    "units_approved_sem1": "Curricular units 1st sem (approved)",
    "grade_sem1": "Curricular units 1st sem (grade)",
    "units_without_eval_sem1": "Curricular units 1st sem (without evaluations)",
    "units_credited_sem2": "Curricular units 2nd sem (credited)",
    "units_enrolled_sem2": "Curricular units 2nd sem (enrolled)",
    "units_evaluations_sem2": "Curricular units 2nd sem (evaluations)",
    "units_approved_sem2": "Curricular units 2nd sem (approved)",
    "grade_sem2": "Curricular units 2nd sem (grade)",
    "units_without_eval_sem2": "Curricular units 2nd sem (without evaluations)",
    "unemployment_rate": "Unemployment rate",
    "inflation_rate": "Inflation rate",
    "gdp": "GDP",
}

REQUIRED_FIELDS = list(FIELD_TO_FEATURE.keys())

# Binary (0/1) coded fields — every other numeric field just needs to be
# a number; the dataset's categorical codes (Course, Application mode,
# Nacionality, qualification/occupation codes, ...) span wide, dataset-
# specific ranges (see the UCI documentation), so those are validated as
# "must be numeric" only, not clamped to a fabricated range.
_BINARY_FIELDS = {
    "daytime_evening_attendance",
    "displaced",
    "educational_special_needs",
    "debtor",
    "tuition_up_to_date",
    "gender",
    "scholarship_holder",
    "international",
}

_LABEL_MAP = {0: "Dropout", 1: "Enrolled", 2: "Graduate"}


class InvalidPredictionInput(ValueError):
    """Raised for any input problem the route should turn into a 400."""


def validate_input(data):
    """
    Args:
        data: parsed JSON body (dict) or None.

    Raises:
        InvalidPredictionInput with a human-readable message if anything
        is missing, the wrong type, or (for the binary fields) not 0/1.

    Returns:
        dict of field -> float, cleaned and ready for predict_risk().
    """
    if not isinstance(data, dict) or not data:
        raise InvalidPredictionInput("Request body must be a non-empty JSON object")

    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        raise InvalidPredictionInput(f"Missing required field(s): {', '.join(missing)}")

    cleaned = {}
    for field in REQUIRED_FIELDS:
        value = data[field]
        if value is None or value == "":
            raise InvalidPredictionInput(f"'{field}' cannot be empty")
        try:
            value = float(value)
        except (TypeError, ValueError):
            raise InvalidPredictionInput(f"'{field}' must be a number")

        if field in _BINARY_FIELDS and value not in (0, 1):
            raise InvalidPredictionInput(f"'{field}' must be 0 or 1")

        cleaned[field] = value

    return cleaned


# Human-readable labels for FEATURE_ORDER entries, for display only (e.g.
# global feature importance) — never used for prediction input/output.
FEATURE_LABELS = {feature: feature.strip() for feature in FEATURE_ORDER}
FEATURE_LABELS["Nacionality"] = "Nationality"
FEATURE_LABELS["Daytime/evening attendance\t"] = "Daytime/evening attendance"

# Course code -> human-readable name, matching the dropdown options the
# frontend's PredictionForm.jsx/datasetCodes.js COURSE list already shows
# an admin when picking a course for the risk-analysis model data. This is
# the single source of truth app.py uses to keep a student's displayed
# `course` in sync with whatever course code was actually used for their
# latest prediction (see course_name_from_code below).
COURSE_NAMES = {
    33: "Biofuel Production Technologies",
    171: "Animation and Multimedia Design",
    8014: "Social Service (evening attendance)",
    9003: "Agronomy",
    9070: "Communication Design",
    9085: "Veterinary Nursing",
    9119: "Informatics Engineering",
    9130: "Equinculture",
    9147: "Management",
    9238: "Social Service",
    9254: "Tourism",
    9500: "Nursing",
    9556: "Oral Hygiene",
    9670: "Advertising and Marketing Management",
    9773: "Journalism and Communication",
    9853: "Basic Education",
    9991: "Management (evening attendance)",
}


def course_name_from_code(course_code):
    """Human-readable course name for a validated numeric course code, or
    None if it's not one of the known codes (e.g. a value outside the
    dropdown's list) — callers should fall back to leaving the existing
    course name untouched in that case rather than overwriting it with
    something meaningless."""
    try:
        return COURSE_NAMES.get(int(round(float(course_code))))
    except (TypeError, ValueError):
        return None



def get_feature_importances(top_n=None):
    """
    Returns the trained model's global `feature_importances_`, sorted
    descending, as a list of {"feature": <FEATURE_ORDER name>,
    "label": <display name>, "importance": float}.

    This is a cohort-wide (global) measure of how much each input
    contributed to the model's split decisions across all of training —
    NOT a per-student explanation. Callers must label it accordingly
    (e.g. "Global feature importance") rather than presenting it as
    "why this student was flagged".
    """
    model = _load_model()
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return []
    ranked = sorted(
        zip(FEATURE_ORDER, importances),
        key=lambda pair: pair[1],
        reverse=True,
    )
    if top_n:
        ranked = ranked[:top_n]
    return [
        {"feature": feature, "label": FEATURE_LABELS.get(feature, feature), "importance": round(float(value), 4)}
        for feature, value in ranked
    ]


def predict_risk(cleaned_input: dict):
    """
    Args:
        cleaned_input: output of validate_input() — every required field
                        present and numeric.

    Returns:
        dict: {"prediction": "Dropout" | "Enrolled" | "Graduate",
               "confidence": float 0-1,
               "probabilities": {label: float, ...}}
    """
    import pandas as pd

    model = _load_model()

    row = pd.DataFrame(
        [[cleaned_input[field] for field in FIELD_TO_FEATURE]],
        columns=FEATURE_ORDER,
    )

    encoded_label = model.predict(row)[0]
    proba = model.predict_proba(row)[0]
    classes = model.classes_  # [0, 1, 2]

    probabilities = {_LABEL_MAP[int(cls)]: round(float(p), 4) for cls, p in zip(classes, proba)}
    confidence = round(float(max(proba)), 4)

    return {
        "prediction": _LABEL_MAP[int(encoded_label)],
        "confidence": confidence,
        "probabilities": probabilities,
    }
