"""
Seeds edutrack_db with real student records sampled from the UCI
'Predict Students Dropout and Academic Success' dataset (data.csv).

Each student gets:
  - a placeholder name (the dataset is anonymized, no real names exist)
  - a roll number, used as their login username
  - a default password equal to their roll number (must be changed on
    first login in a real deployment — fine for this internship demo)

Run:
    python seed_students.py
Produces:
    seed_data.sql — INSERT statements ready to run after schema.sql
"""

import csv
import random
from werkzeug.security import generate_password_hash

random.seed(42)  # reproducible sample

DATA_CSV = "data.csv"          # path to the extracted UCI dataset CSV
OUTPUT_SQL = "seed_data.sql"
SAMPLE_SIZE = 30               # how many students to seed (demo scale)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin@2026"   # change after first login

COURSE_NAMES = {
    "33": "Biofuel Production Technologies",
    "171": "Animation and Multimedia Design",
    "8014": "Social Service (evening)",
    "9003": "Agronomy",
    "9070": "Communication Design",
    "9085": "Veterinary Nursing",
    "9119": "Informatics Engineering",
    "9130": "Equinculture",
    "9147": "Management",
    "9238": "Social Service",
    "9254": "Tourism",
    "9500": "Nursing",
    "9556": "Oral Hygiene",
    "9670": "Advertising and Marketing Management",
    "9773": "Journalism and Communication",
    "9853": "Basic Education",
    "9991": "Management (evening)",
}

FIRST_NAMES = [
    "Ananya", "Meera", "Kavya", "Diya", "Sneha", "Priya", "Dev", "Rohan",
    "Sana", "Arjun", "Rahul", "Neha", "Aditya", "Ishita", "Karan", "Pooja",
    "Vikram", "Anjali", "Siddharth", "Nisha", "Aman", "Riya", "Manish",
    "Tanvi", "Suresh", "Divya", "Nikhil", "Shreya", "Yash", "Kritika",
]
LAST_NAMES = [
    "Iyer", "Pillai", "Menon", "Kapoor", "Reddy", "Sharma", "Varma",
    "Kulkarni", "Nair", "Das", "Gupta", "Verma", "Rao", "Joshi", "Singh",
    "Mehta", "Chatterjee", "Bose", "Nambiar", "Krishnan",
]


def esc(v):
    """Escape a value for direct SQL string embedding."""
    if v is None:
        return "NULL"
    if isinstance(v, str):
        return "'" + v.replace("'", "''") + "'"
    return str(v)


def load_rows():
    with open(DATA_CSV, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        return list(reader)


def risk_from_target(target):
    return {"Dropout": "At risk", "Enrolled": "Watch", "Graduate": "On track"}.get(target, "Not assessed")


def build():
    rows = load_rows()
    sample = random.sample(rows, SAMPLE_SIZE)

    used_names = set()
    lines = []

    lines.append("USE edutrack_db;\n")
    lines.append("-- Admin account\n")
    admin_hash = generate_password_hash(ADMIN_PASSWORD)
    lines.append(
        f"INSERT INTO users (username, password_hash, role, student_id, full_name, email, department) "
        f"VALUES ({esc(ADMIN_USERNAME)}, {esc(admin_hash)}, 'admin', NULL, "
        f"{esc('Ms. Rao')}, {esc('rao@crescent.edu')}, {esc('Computer Science')});\n\n"
    )

    lines.append("-- Students (sampled from the real UCI dropout dataset)\n")
    for i, row in enumerate(sample, start=1):
        # pick a unique display name
        while True:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            if name not in used_names:
                used_names.add(name)
                break

        roll_no = f"STU-{2026}{str(1000 + i)}"
        course = COURSE_NAMES.get(row["Course"], f"Course {row['Course']}")
        admission_grade = float(row["Admission grade"])

        enrolled1 = int(float(row["Curricular units 1st sem (enrolled)"]))
        approved1 = int(float(row["Curricular units 1st sem (approved)"]))
        enrolled2 = int(float(row["Curricular units 2nd sem (enrolled)"]))
        approved2 = int(float(row["Curricular units 2nd sem (approved)"]))

        # derive an attendance-style percentage from units approved / enrolled
        total_enrolled = enrolled1 + enrolled2
        total_approved = approved1 + approved2
        attendance = round((total_approved / total_enrolled) * 100, 1) if total_enrolled else 0.0

        grade1 = float(row["Curricular units 1st sem (grade)"])
        grade2 = float(row["Curricular units 2nd sem (grade)"])
        avg_grade_20 = (grade1 + grade2) / 2 if (grade1 or grade2) else 0.0
        gpa_10 = round(avg_grade_20 / 2, 2)  # convert 0-20 scale to 0-10 GPA

        scholarship = 1 if row["Scholarship holder"] == "1" else 0
        debtor = 1 if row["Debtor"] == "1" else 0
        tuition_ok = 1 if row["Tuition fees up to date"] == "1" else 0
        dropout_risk = risk_from_target(row["Target"])

        username = roll_no.lower()
        default_password = roll_no  # demo only — force change in a real deployment
        pw_hash = generate_password_hash(default_password)

        lines.append(
            "INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, "
            "gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, "
            "units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ("
            f"{esc(name)}, {esc(roll_no)}, {esc(course)}, {admission_grade}, {attendance}, {gpa_10}, "
            f"{enrolled1}, {approved1}, {enrolled2}, {approved2}, {scholarship}, {debtor}, {tuition_ok}, "
            f"{esc(dropout_risk)});\n"
        )
        lines.append(
            f"INSERT INTO users (username, password_hash, role, student_id) VALUES "
            f"({esc(username)}, {esc(pw_hash)}, 'student', LAST_INSERT_ID());\n\n"
        )

    with open(OUTPUT_SQL, "w") as f:
        f.writelines(lines)

    print(f"Wrote {OUTPUT_SQL} — {SAMPLE_SIZE} students + 1 admin account.")
    print(f"Admin login -> username: {ADMIN_USERNAME}  password: {ADMIN_PASSWORD}")
    print("Each student's default password equals their roll number (e.g. STU-20261001).")


if __name__ == "__main__":
    build()
