"""
Dropout risk prediction — isolated from the rest of the app so the real
trained model can be dropped in here later without touching CRUD, auth,
or any other route in app.py.

Conceptual future pipeline:
    student record -> feature extraction -> preprocessing ->
    trained model -> dropout probability/class -> risk status

None of that exists yet. This module currently returns None, meaning
"no prediction available" — callers must NOT invent a fallback risk
label (e.g. from attendance thresholds). The UI should show
"Prediction Pending" whenever this returns None.
"""


def predict_dropout_risk(student: dict):
    """
    Args:
        student: dict of a single student's fields, as returned by
                 `SELECT * FROM students WHERE id = %s`.

    Returns:
        A risk label string (e.g. "On track" / "Watch" / "At risk") once
        a real trained model is wired in here, or None if no model is
        available yet. Currently always returns None — do not replace
        this with a rule-based/threshold heuristic; that would silently
        misrepresent itself as a model prediction.
    """
    # TODO (future ML integration):
    #   1. Extract/derive the same features the trained model expects
    #      from `student` (admission_grade, attendance_percentage, gpa,
    #      units enrolled/approved, scholarship_holder, debtor,
    #      tuition_up_to_date, etc.)
    #   2. Apply the same preprocessing/scaling used at training time.
    #   3. Load the trained .pkl model and call model.predict(...).
    #   4. Map the model's output class/probability to a risk label.
    #   5. Return that label.
    return None
