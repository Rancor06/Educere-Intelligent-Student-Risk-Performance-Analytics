import time
import os
import json
import secrets
import string
from functools import wraps
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from mysql.connector import Error
from db import get_connection
from ml.model import (
    predict_risk as run_dropout_prediction,
    validate_input as validate_prediction_input,
    get_feature_importances,
    course_name_from_code,
    InvalidPredictionInput,
    REQUIRED_FIELDS as PREDICTION_FIELDS,
)

app = Flask(__name__)

# Shared "is this a local development run" signal — same convention the
# bottom of this file already uses for Flask's debug reloader (FLASK_DEBUG
# defaults to "1"/on for local dev; set FLASK_DEBUG=0 for any non-dev run,
# including the actual gunicorn/Render deployment). Reused below so a
# missing FLASK_SECRET_KEY or CORS_ALLOWED_ORIGINS fails loudly outside
# local dev instead of silently falling back to an insecure default.
_is_dev = os.getenv("FLASK_DEBUG", "1") == "1"

_secret_key = os.getenv("FLASK_SECRET_KEY")
if not _secret_key:
    if _is_dev:
        _secret_key = "dev-secret-key"  # local development only
    else:
        raise RuntimeError(
            "FLASK_SECRET_KEY must be set in the environment for any non-local run "
            "(FLASK_DEBUG=0). Refusing to start with a predictable fallback secret — "
            "set FLASK_SECRET_KEY in the deployment environment (see .env.example)."
        )
app.secret_key = _secret_key

app.config.update(
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=True,
)

# Comma-separated list of allowed frontend origins, e.g.
#   CORS_ALLOWED_ORIGINS=https://educere.vercel.app,http://localhost:5173
# Required outside local dev — an unset value would otherwise silently
# allow any origin to make credentialed requests to this API.
_cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
_cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
if not _cors_origins:
    if _is_dev:
        _cors_origins = "*"  # local development only
    else:
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS must be set in the environment for any non-local run "
            "(FLASK_DEBUG=0). Refusing to start with an unrestricted '*' CORS origin — "
            "set CORS_ALLOWED_ORIGINS to the deployed frontend URL(s) (see .env.example)."
        )
CORS(app, supports_credentials=True, origins=_cors_origins)


# ---------- Auth helpers ----------

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "error": "Please log in first"}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "error": "Please log in first"}), 401
        if session.get("role") != "admin":
            return jsonify({"success": False, "error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


def student_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "error": "Please log in first"}), 401
        if session.get("role") != "student":
            return jsonify({"success": False, "error": "Student access required"}), 403
        return f(*args, **kwargs)
    return decorated


# ---------- Health check ----------

@app.route("/")
def home():
    return jsonify({"status": "EduTrack API is running"})


# ---------- Day 41/42 task: public students API ----------

@app.route("/api/students", methods=["GET"])
def api_students():
    """
    Public endpoint for the Day 41-44 frontend-backend integration tasks.
    Separate from /admin/students (which requires admin login) — this one
    is intentionally unauthenticated per the task requirements.

    Reads live from MySQL (edutrack_db.students) — no in-memory/temporary
    data at any point. Uses the real `email` column (added via the Day 42
    migration); falls back to a roll_no-derived placeholder for any older
    rows that predate that column being populated.

    Day 44 Task 06: connection failure and query failure are handled as
    two distinct cases, each returning a clear JSON error instead of
    letting Flask crash with a raw traceback.
    """
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "Unable to reach the database. Please try again shortly."}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, roll_no, course, email FROM students ORDER BY id")
        rows = cursor.fetchall()
    except Error as e:
        return jsonify({"success": False, "error": "Unable to load students right now."}), 500
    finally:
        cursor.close()
        conn.close()

    students = [
        {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"] or f"{row['roll_no'].lower()}@crescent.edu",
            "course": row["course"],
        }
        for row in rows
    ]
    return jsonify(students)


@app.route("/api/students", methods=["POST"])
def create_student():
    """
    Day 42 task: create a new student from the React form.
    Day 44 Task 06: distinguishes missing fields, duplicate email, and
    general database failures, each with its own clear message.

    Expects JSON body: { "name": ..., "email": ..., "course": ... }
    `roll_no` isn't collected from the form (it's a system detail, not
    something a student-signup form should ask for) — it's generated here
    since the DB column is UNIQUE NOT NULL.
    """
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    course = (data.get("course") or "").strip()

    if not name or not email or not course:
        return jsonify({
            "success": False,
            "error": "name, email, and course are all required"
        }), 400

    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "Unable to reach the database. Please try again shortly."}), 500

    cursor = conn.cursor()
    generated_roll_no = f"NEW-{int(time.time() * 1000)}"

    try:
        cursor.execute(
            """INSERT INTO students (name, roll_no, course, email)
               VALUES (%s, %s, %s, %s)""",
            (name, generated_roll_no, course, email),
        )
        conn.commit()
        new_id = cursor.lastrowid
    except Error as e:
        conn.rollback()
        # MySQL error 1062 = duplicate entry on a UNIQUE column (email, here).
        # Checked by errno rather than string-matching e's message, since
        # the message text isn't guaranteed stable across MySQL versions.
        if e.errno == 1062:
            message = "A student with that email already exists."
        else:
            message = "Unable to save student."
        return jsonify({"success": False, "error": message}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "success": True,
        "student": {
            "id": new_id,
            "name": name,
            "email": email,
            "course": course,
        }
    }), 201


# ---------- Auth routes ----------

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    requested_role = data.get("role")  # "admin" or "student", from the dropdown

    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    if requested_role and user["role"] != requested_role:
        return jsonify({"success": False, "error": f"This account is not registered as {requested_role}"}), 403

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["role"] = user["role"]
    session["student_id"] = user["student_id"]

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['username']}!",
        "role": user["role"]
    })


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})


@app.route("/profile", methods=["GET"])
@login_required
def profile():
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT username, role, full_name, email, department FROM users WHERE id = %s",
        (session["user_id"],)
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user:
        return jsonify({"success": False, "error": "Not found"}), 404
    return jsonify(user)


@app.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.get_json()
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET full_name=%s, email=%s, department=%s WHERE id=%s",
        (data.get("full_name"), data.get("email"), data.get("department"), session["user_id"])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "Profile updated"})


# ---------- Admin: student management ----------

@app.route("/admin/students", methods=["GET"])
@admin_required
def list_students():
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM students ORDER BY id")
    students = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(students)


@app.route("/admin/students/<int:student_id>", methods=["GET"])
@admin_required
def get_student(student_id):
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    # LEFT JOIN adds the linked login username for the admin detail view
    # (Part 13) without changing any existing `students` column.
    cursor.execute(
        """SELECT s.*, u.username AS login_username
           FROM students s LEFT JOIN users u ON u.student_id = s.id AND u.role = 'student'
           WHERE s.id = %s""",
        (student_id,)
    )
    student = cursor.fetchone()
    cursor.close()
    conn.close()
    if not student:
        return jsonify({"success": False, "error": "Not found"}), 404
    return jsonify(student)


@app.route("/admin/students/<int:student_id>/reset-password", methods=["POST"])
@admin_required
def reset_student_password(student_id):
    """Generates a fresh temporary password for a student's login account,
    stores only its hash (replacing the old one), and returns the plaintext
    exactly once. The old password stops working immediately since its hash
    is overwritten, not just supplemented."""
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, username FROM users WHERE student_id = %s AND role = 'student'", (student_id,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": "This student has no login account yet"}), 404

    temp_password = generate_temp_password()
    update_cursor = conn.cursor()
    update_cursor.execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (generate_password_hash(temp_password), user["id"])
    )
    conn.commit()
    update_cursor.close()
    cursor.close()
    conn.close()
    return jsonify({
        "success": True,
        "message": "Password reset successfully",
        "login_username": user["username"],
        "temporary_password": temp_password
    })


def generate_temp_password(length=12):
    """
    Cryptographically secure one-time temporary password (uses `secrets`,
    not `random`) — for new student accounts and password resets. Never
    derived from a public identifier like roll_no, and never stored
    anywhere except returned once in the API response; only its hash is
    persisted.
    """
    alphabet = string.ascii_letters + string.digits
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(c.isdigit() for c in pwd) and any(c.isalpha() for c in pwd):
            return pwd


def dropout_probability_str(prediction_result):
    """
    The `dropout_risk` column historically held a human-readable label
    (see schema.sql's DEFAULT 'Prediction Pending' and the legacy
    full_setup.sql demo rows). Every prediction-persisting code path below
    now writes the actual numeric Dropout-class probability there instead
    — formatted as a fixed-precision string so it fits the column's
    existing VARCHAR(20) type without a schema change. risk_prediction is
    the place for the human-readable label going forward; the frontend's
    statusRaw() helper knows to treat a numeric-looking dropout_risk as
    "no legacy label" rather than displaying it as one.
    """
    return f"{prediction_result['probabilities']['Dropout']:.4f}"


@app.route("/admin/students", methods=["POST"])
@admin_required
def admin_create_student():
    """Adds a student record AND a linked login account (username = roll_no,
    a fresh cryptographically random temporary password each time)."""
    data = request.get_json(silent=True) or {}
    missing = [key for key in ("name", "roll_no") if not str(data.get(key, "")).strip()]
    if missing:
        return jsonify({"success": False, "error": f"Missing required field(s): {', '.join(missing)}"}), 400

    # Save only after the real model validates and evaluates the feature set.
    try:
        prediction_input = validate_prediction_input(data.get("prediction_input"))
        prediction = run_dropout_prediction(prediction_input)
    except InvalidPredictionInput as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Prediction failed: {e}"}), 500

    # The course selected for the analysis becomes the student's one
    # canonical displayed course name (Change 2) — falls back to whatever
    # was submitted only if the code isn't one of the known course codes.
    course = course_name_from_code(prediction_input.get("course")) or data.get("course")

    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO students
               (name, roll_no, course, admission_grade, attendance_percentage, gpa,
                units_1st_sem_enrolled, units_1st_sem_approved,
                units_2nd_sem_enrolled, units_2nd_sem_approved,
                scholarship_holder, debtor, tuition_up_to_date, dropout_risk,
                risk_prediction, risk_confidence, risk_probabilities,
                prediction_inputs, risk_analyzed_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())""",
            (
                data["name"], data["roll_no"], course,
                data.get("admission_grade"), data.get("attendance_percentage"),
                data.get("gpa"), data.get("units_1st_sem_enrolled"),
                data.get("units_1st_sem_approved"), data.get("units_2nd_sem_enrolled"),
                data.get("units_2nd_sem_approved"), data.get("scholarship_holder", 0),
                data.get("debtor", 0), data.get("tuition_up_to_date", 1),
                dropout_probability_str(prediction), prediction["prediction"], prediction["confidence"],
                json.dumps(prediction["probabilities"]), json.dumps(prediction_input),
            )
        )
        new_student_id = cursor.lastrowid

        username = data["roll_no"].lower()
        temp_password = generate_temp_password()
        password_hash = generate_password_hash(temp_password)
        cursor.execute(
            "INSERT INTO users (username, password_hash, role, student_id) VALUES (%s,%s,'student',%s)",
            (username, password_hash, new_student_id)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": f"Could not create student: {str(e)}"}), 400
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "success": True,
        "id": new_student_id,
        "message": "Student added successfully",
        "risk_analysis": prediction,
        "login_username": username,
        # Returned exactly once — never stored in plaintext anywhere,
        # including here on any subsequent request.
        "temporary_password": temp_password
    }), 201


@app.route("/admin/students/<int:student_id>", methods=["PUT"])
@admin_required
def update_student(student_id):
    data = request.get_json()
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500

    # Optional: when the edit form includes a full set of model inputs (used
    # for students that don't have a prediction yet — see the Student
    # Directory's Edit panel), run the trained model and persist the result
    # alongside the basic field update, in the same request.
    prediction = None
    prediction_input = None
    if data.get("prediction_input"):
        try:
            prediction_input = validate_prediction_input(data.get("prediction_input"))
            prediction = run_dropout_prediction(prediction_input)
        except InvalidPredictionInput as e:
            conn.close()
            return jsonify({"success": False, "error": str(e)}), 400
        except Exception as e:
            conn.close()
            return jsonify({"success": False, "error": f"Prediction failed: {e}"}), 500

    cursor = conn.cursor()
    # Verify the student exists BEFORE updating — cursor.rowcount alone is
    # not a valid existence check: MySQL reports 0 rows changed both when
    # the row doesn't exist AND when it exists but every submitted value
    # already matches what's stored (e.g. Save Student with no edits).
    # That previously produced a false "Not found" on an unmodified save.
    cursor.execute("SELECT id FROM students WHERE id = %s", (student_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": "Not found"}), 404

    if prediction:
        # The course selected for this analysis becomes the student's one
        # canonical displayed course name (Change 2) — falls back to
        # whatever was submitted only if the code isn't a known course.
        course = course_name_from_code(prediction_input.get("course")) or data.get("course")
        cursor.execute(
            """UPDATE students SET
                 name=%s, course=%s, admission_grade=%s, attendance_percentage=%s, gpa=%s,
                 units_1st_sem_enrolled=%s, units_1st_sem_approved=%s,
                 units_2nd_sem_enrolled=%s, units_2nd_sem_approved=%s,
                 scholarship_holder=%s, debtor=%s, tuition_up_to_date=%s,
                 dropout_risk=%s, risk_prediction=%s, risk_confidence=%s,
                 risk_probabilities=%s, prediction_inputs=%s, risk_analyzed_at=NOW()
               WHERE id=%s""",
            (
                data.get("name"), course, data.get("admission_grade"),
                data.get("attendance_percentage"), data.get("gpa"),
                data.get("units_1st_sem_enrolled"), data.get("units_1st_sem_approved"),
                data.get("units_2nd_sem_enrolled"), data.get("units_2nd_sem_approved"),
                data.get("scholarship_holder"), data.get("debtor"), data.get("tuition_up_to_date"),
                dropout_probability_str(prediction), prediction["prediction"], prediction["confidence"],
                json.dumps(prediction["probabilities"]), json.dumps(prediction_input),
                student_id
            )
        )
    else:
        cursor.execute(
            """UPDATE students SET
                 name=%s, course=%s, admission_grade=%s, attendance_percentage=%s, gpa=%s,
                 units_1st_sem_enrolled=%s, units_1st_sem_approved=%s,
                 units_2nd_sem_enrolled=%s, units_2nd_sem_approved=%s,
                 scholarship_holder=%s, debtor=%s, tuition_up_to_date=%s
               WHERE id=%s""",
            (
                data.get("name"), data.get("course"), data.get("admission_grade"),
                data.get("attendance_percentage"), data.get("gpa"),
                data.get("units_1st_sem_enrolled"), data.get("units_1st_sem_approved"),
                data.get("units_2nd_sem_enrolled"), data.get("units_2nd_sem_approved"),
                data.get("scholarship_holder"), data.get("debtor"), data.get("tuition_up_to_date"),
                student_id
            )
        )
    conn.commit()
    cursor.close()
    conn.close()
    # The existence check above already ran, so getting here always means
    # the student exists — 200 regardless of whether any value actually
    # changed (see the comment above).
    response = {"success": True, "message": "Student updated successfully"}
    if prediction:
        response["risk_analysis"] = prediction
        # Lets the frontend sync its own form.course to the canonical value
        # that was just persisted, instead of re-deriving/guessing it —
        # fixes Save Student (which doesn't send prediction_input) reverting
        # the course back to whatever the form's stale course field held.
        response["course"] = course
    return jsonify(response)


@app.route("/admin/students/<int:student_id>", methods=["DELETE"])
@admin_required
def delete_student(student_id):
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))
    conn.commit()
    deleted = cursor.rowcount
    cursor.close()
    conn.close()
    if not deleted:
        return jsonify({"success": False, "error": "Not found"}), 404
    return jsonify({"success": True, "message": "Student deleted successfully"})


@app.route("/admin/students/<int:student_id>/notes", methods=["PUT"])
@admin_required
def update_student_notes(student_id):
    data = request.get_json()
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor()
    # Same existence-check fix as update_student() above — rowcount == 0
    # also happens when the submitted note text already matches what's
    # stored, which isn't a "not found" case.
    cursor.execute("SELECT id FROM students WHERE id = %s", (student_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": "Not found"}), 404
    cursor.execute(
        "UPDATE students SET notes = %s WHERE id = %s",
        (data.get("notes", ""), student_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "Note saved"})


@app.route("/admin/students/<int:student_id>/predict", methods=["POST"])
@admin_required
def predict_risk(student_id):
    """
    Re-runs the trained dropout model against a student's already-saved
    model inputs (prediction_inputs) and persists the refreshed result.
    Used by the "Re-run Prediction" action for a student who already has
    saved model inputs but no newly-edited ones in the request body —
    the Student Directory's Edit panel instead sends edited inputs
    straight to PUT /admin/students/<id> (see update_student above),
    which validates+predicts+persists them in one step.
    """
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
    student = cursor.fetchone()
    if not student:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": "Not found"}), 404

    stored_input = student.get("prediction_inputs")
    if isinstance(stored_input, str):
        try:
            stored_input = json.loads(stored_input)
        except json.JSONDecodeError:
            stored_input = None
    if not stored_input:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": "This student has no saved model inputs to re-analyse."}), 400
    try:
        result = run_dropout_prediction(validate_prediction_input(stored_input))
    except (InvalidPredictionInput, Exception) as e:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": f"Prediction failed: {e}"}), 500

    update_cursor = conn.cursor()
    update_cursor.execute(
        """UPDATE students SET dropout_risk=%s, risk_prediction=%s,
           risk_confidence=%s, risk_probabilities=%s, risk_analyzed_at=NOW()
           WHERE id=%s""",
        (dropout_probability_str(result), result["prediction"], result["confidence"],
         json.dumps(result["probabilities"]), student_id),
    )
    conn.commit()
    update_cursor.close()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "student_id": student_id, "risk_analysis": result})


# ---------- Student: own dashboard ----------

@app.route("/student/dashboard", methods=["GET"])
@student_required
def student_dashboard():
    conn = get_connection()
    if not conn:
        return jsonify({"success": False, "error": "DB connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """SELECT name, roll_no, course, admission_grade, attendance_percentage, gpa,
                  units_1st_sem_enrolled, units_1st_sem_approved,
                  units_2nd_sem_enrolled, units_2nd_sem_approved,
                  risk_prediction, risk_analyzed_at, notes
           FROM students WHERE id = %s""",
        (session["student_id"],)
    )
    student = cursor.fetchone()
    cursor.close()
    conn.close()
    if not student:
        return jsonify({"success": False, "error": "Student record not found"}), 404
    # dropout_risk (the numeric probability), risk_confidence and
    # risk_probabilities intentionally excluded — admin-only info.
    # risk_prediction (the plain label — "Graduate"/"Watch"/"At risk" once
    # mapped by the frontend) is student-facing status, not a detailed score.
    return jsonify(student)


# ---------- Day 46: ML prediction endpoint ----------
# Separate from /admin/students/<id>/predict above, which is the older,
# not-yet-implemented per-student pipeline (ml_predictor.py). This is the
# real, trained model (ml/model.py), taking its input directly from the
# client rather than a stored student record.

@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Body (all fields required, numeric):
        admission_grade        0-200
        units_approved_sem1    0-30
        grade_sem1             0-20
        units_approved_sem2    0-30
        grade_sem2             0-20
        debtor                 0 or 1
        tuition_up_to_date     0 or 1
        scholarship_holder     0 or 1
        age_at_enrollment      15-90

    Returns 200 with {"prediction", "confidence", "probabilities"} on
    success, or 400 with {"error": "..."} if the input is missing,
    the wrong type, or out of range. Never crashes on bad input.
    """
    data = request.get_json(silent=True)

    try:
        cleaned = validate_prediction_input(data)
    except InvalidPredictionInput as e:
        return jsonify({"success": False, "error": str(e)}), 400

    try:
        result = run_dropout_prediction(cleaned)
    except Exception as e:
        # Model itself failed (shouldn't happen with valid input, but the
        # endpoint must not crash regardless of the cause)
        return jsonify({"success": False, "error": f"Prediction failed: {e}"}), 500

    return jsonify({"success": True, **result}), 200


# ---------- Global feature importance (real model.feature_importances_) ----------
# Used by the Risk Predictor's "Key contributing factors" panel and the
# Reports page's cohort risk drivers card, replacing the hardcoded lists
# that used to live in those components. This is cohort-level (global)
# importance, not a per-student explanation — see get_feature_importances().

@app.route("/api/model-info", methods=["GET"])
def model_info():
    top = request.args.get("top", type=int)
    return jsonify({"success": True, "feature_importances": get_feature_importances(top or None)})


# ---------- Day 45 Task 06: JSON error responses for invalid endpoints/methods ----------
# Without these, Flask's default 404/405 pages are HTML, not JSON, which is
# inconsistent with every other response this API returns.

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "error": "Method not allowed on this endpoint"}), 405


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500


# ---------- Day 48: production-ready startup ----------
# Render/Railway set the PORT env var and expect the app to bind
# 0.0.0.0, not 127.0.0.1. This only matters when app.py is run directly
# (`python app.py`) — the actual deployed process uses gunicorn instead
# (see Procfile), which ignores this block entirely and binds via its
# own -b flag. debug stays on locally by default, off if FLASK_DEBUG=0.
if __name__ == "__main__":
    import os as _os
    port = int(_os.environ.get("PORT", 5000))
    debug = _os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
