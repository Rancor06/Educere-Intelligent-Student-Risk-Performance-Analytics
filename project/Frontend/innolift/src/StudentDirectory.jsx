import { useState, useEffect } from 'react';
import StudentForm from './StudentForm';
import { API_BASE } from './apiBase';

// Day 41 task: fetch student data from the Flask backend and display it.
// Day 42 task: add a student via a form and update this list live.
// Day 43 task: handle request failures and the "success but empty" case.
// No student data is hardcoded — everything comes from GET/POST /api/students.
function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Day 43 Task 01: explicit try/catch + response.ok check.
    // - try/catch here catches NETWORK-level failures (Flask unreachable,
    //   connection refused) — fetch() itself throws in that case.
    // - response.ok catches HTTP-level failures (Flask running, but
    //   returning a 4xx/5xx status) — fetch() does NOT throw for those,
    //   so it has to be checked manually.
    // Either path ends up showing the same message, and `finally` makes
    // sure loading always resolves to false no matter which path is hit.
    async function loadStudents() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/students`);
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const data = await res.json();
        setStudents(data);
    } catch {
        setError('Unable to load students.');
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, []); // empty dependency array = runs once when the component mounts

  // Day 42 Task 05: append the newly created student to state directly —
  // no re-fetch, no page reload, list just re-renders with the new card.
  const handleNewStudent = (newStudent) => {
    setStudents((prev) => [...prev, newStudent]);
  };

  const initials = (name) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="student-directory">
      <div className="sd-intro">
        <h1>Student directory</h1>
        <p>Live data pulled from the Flask API at <code>/api/students</code>.</p>
      </div>

      <StudentForm onCreated={handleNewStudent} />

      {loading && <p className="sd-status">Loading students…</p>}
      {!loading && error && <p className="sd-status sd-status-error">{error}</p>}

      {/* Day 43 Task 02: "success + no data" is its own state — not an
          error, and not something a bare empty grid should silently show. */}
      {!loading && !error && students.length === 0 && (
        <p className="sd-status">No students found.</p>
      )}

      {!loading && !error && students.length > 0 && (
        <div className="sd-grid">
          {students.map((student) => (
            <div className="student-card" key={student.id}>
              <div className="student-card-avatar">{initials(student.name)}</div>
              <div className="student-card-body">
                <h2>{student.name}</h2>
                <p className="student-card-course">{student.course}</p>
                <div className="student-card-row">
                  <span className="k">ID</span>
                  <span className="v">{student.id}</span>
                </div>
                <div className="student-card-row">
                  <span className="k">Email</span>
                  <span className="v">{student.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentDirectory;
