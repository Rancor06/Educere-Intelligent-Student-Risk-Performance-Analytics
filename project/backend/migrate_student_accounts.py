"""
One-time migration: creates a login account for every existing student who
doesn't already have one.

This does NOT touch the schema, does NOT modify existing student records,
and does NOT overwrite any user account that already exists — it only
INSERTs new rows into `users` for students currently missing one, using
the same shape admin_create_student() already writes (username = roll_no,
role='student', student_id = the linked student, password stored only as
a hash).

Safe to re-run: students that already have a 'student'-role account are
skipped every time, so running this twice does not create duplicates.

Usage:
    python migrate_student_accounts.py

Produces a plaintext credential report at
    backend/student_credentials_TIMESTAMP.csv
containing each newly-created account's one-time temporary password. This
file is NOT committed to git (see backend/.gitignore) and should be shared
with students through a secure channel and deleted once distributed — the
plaintext password is never stored anywhere else, including in this
script's own output after this run.
"""
import csv
import secrets
import string
import sys
from datetime import datetime, timezone

from werkzeug.security import generate_password_hash

from db import get_connection


def generate_temp_password(length=12):
    """Same algorithm as app.py's generate_temp_password() — duplicated
    here (like seed_students.py already duplicates dropout_probability_str)
    so this script stays a standalone script and doesn't import the Flask
    app (which enforces production env vars at import time)."""
    alphabet = string.ascii_letters + string.digits
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(c.isdigit() for c in pwd) and any(c.isalpha() for c in pwd):
            return pwd


def unique_username(base, taken):
    """roll_no is already UNIQUE on `students`, so its lowercase form should
    already be unique too — this is just a safety net against an unexpected
    collision (e.g. differing only by case, or a pre-existing manual
    account) rather than the primary uniqueness mechanism."""
    if base not in taken:
        return base
    n = 2
    while f"{base}{n}" in taken:
        n += 1
    return f"{base}{n}"


def main():
    conn = get_connection()
    if not conn:
        print("Could not connect to the database. Check your .env / DB_* variables.")
        sys.exit(1)

    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name, roll_no FROM students ORDER BY id")
    all_students = cursor.fetchall()

    cursor.execute("SELECT student_id, username FROM users WHERE role = 'student'")
    existing = cursor.fetchall()
    already_has_account = {row["student_id"] for row in existing}
    taken_usernames = {row["username"] for row in existing}
    cursor.execute("SELECT username FROM users")
    taken_usernames |= {row["username"] for row in cursor.fetchall()}

    to_create = [s for s in all_students if s["id"] not in already_has_account]

    print(f"{len(all_students)} students total, {len(already_has_account)} already have "
          f"a login account, {len(to_create)} need one created.")

    if not to_create:
        cursor.close()
        conn.close()
        print("Nothing to do.")
        return

    report_rows = []
    created = 0
    failed = []
    insert_cursor = conn.cursor()
    for student in to_create:
        base_username = (student["roll_no"] or f"student{student['id']}").strip().lower()
        username = unique_username(base_username, taken_usernames)
        temp_password = generate_temp_password()
        try:
            insert_cursor.execute(
                "INSERT INTO users (username, password_hash, role, student_id) VALUES (%s, %s, 'student', %s)",
                (username, generate_password_hash(temp_password), student["id"]),
            )
            conn.commit()  # commit per-student so one failure doesn't roll back prior successes
            taken_usernames.add(username)
            created += 1
            report_rows.append({
                "name": student["name"],
                "roll_no": student["roll_no"],
                "username": username,
                "temporary_password": temp_password,
            })
        except Exception as e:
            conn.rollback()
            failed.append((student["roll_no"], str(e)))

    insert_cursor.close()
    cursor.close()
    conn.close()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    report_path = f"student_credentials_{timestamp}.csv"
    with open(report_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "roll_no", "username", "temporary_password"])
        writer.writeheader()
        writer.writerows(report_rows)

    print(f"\nCreated {created} new student login account(s).")
    if failed:
        print(f"Failed for {len(failed)} student(s): {failed}")
    print(f"\nOne-time credential report written to: backend/{report_path}")
    print("This file contains PLAINTEXT temporary passwords.")
    print("- Do NOT commit it to git (already covered by backend/.gitignore's *credentials*.csv rule).")
    print("- Distribute it to students through a secure channel, then delete it.")
    print("- The plaintext passwords are not stored anywhere else — only their hashes are in the database.")


if __name__ == "__main__":
    main()
