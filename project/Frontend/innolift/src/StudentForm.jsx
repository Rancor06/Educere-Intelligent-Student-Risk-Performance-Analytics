import { useState } from 'react';
import { API_BASE } from './apiBase';

// Day 42 task: controlled form that POSTs a new student to Flask.
// Day 43 task: explicit try/catch, distinguishing a validation error
// returned by Flask from Flask being unreachable entirely.
// Calls onCreated(newStudent) so the parent can add it to the displayed
// list without a page refresh or a re-fetch.
function StudentForm({ onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); // stop the browser's default full-page-reload submit

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, course }),
      });

      // Don't assume the body is valid JSON just because fetch() resolved.
      // If Flask is unreachable, the Vite dev proxy itself can respond
      // with an empty/non-JSON body instead of fetch() throwing outright —
      // so res.json() is parsed defensively rather than trusted blindly.
      let responseBody = {};
      try {
        responseBody = await res.json();
      } catch {
        responseBody = {};
      }

      if (!res.ok || !responseBody.success) {
        throw new Error(responseBody.error || 'Unable to add student.');
      }

      onCreated(responseBody.student); // add to the list in the parent, no refresh
      setName('');
      setEmail('');
      setCourse('');
      setSuccess(true);
    } catch (err) {
      // Network-level failure (Flask unreachable) lands here too — fetch()
      // itself throws before res.json() is ever reached, so this same
      // catch block covers "Flask returned an error" and "Flask is down".
      setError(err.message === 'Failed to fetch' ? 'Unable to add student.' : err.message);
    } finally {
      setLoading(false); // runs whether it succeeded or failed
    }
  };

  return (
    <form className="student-form" onSubmit={handleSubmit}>
      <h2>Add a student</h2>

      <label>
        Student name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rahul Nair"
          required
        />
      </label>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. rahul@crescent.edu"
          required
        />
      </label>

      <label>
        Course
        <input
          type="text"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="e.g. AI & Data Science"
          required
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Adding…
          </>
        ) : (
          'Add student'
        )}
      </button>

      {error && <p className="sf-message sf-message-error">{error}</p>}
      {success && <p className="sf-message sf-message-success">Student added!</p>}
    </form>
  );
}

export default StudentForm;
