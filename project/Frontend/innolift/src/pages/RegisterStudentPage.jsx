import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import { API_BASE } from '../apiBase';
import './RegisterStudent.css';

const RE = { name: /^[A-Za-z][A-Za-z\s]{2,49}$/, rollNo: /^[A-Za-z0-9\-/]{4,20}$/ };

const EMPTY_FORM = {
  fullName: '', course: '', rollNo: '', attendance: '', gpa: '',
  admissionGrade: '', units1Enrolled: '', units1Approved: '', units2Enrolled: '', units2Approved: '',
};

// Converted from register-student.html — same field-by-field regex/range
// validation on submit, same POST /admin/students payload shape, same
// toast copy (including the login credentials shown back on success).

function RegisterStudentPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', isError: false });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!RE.name.test(form.fullName.trim())) newErrors.fullName = 'Enter a valid name';
    if (!form.course) newErrors.course = 'Select a course';
    if (!RE.rollNo.test(form.rollNo.trim())) newErrors.rollNo = 'Enter a valid roll number';

    const attVal = parseFloat(form.attendance);
    if (form.attendance === '' || isNaN(attVal) || attVal < 0 || attVal > 100) newErrors.attendance = 'Enter 0–100';

    const gpaVal = parseFloat(form.gpa);
    if (form.gpa === '' || isNaN(gpaVal) || gpaVal < 0 || gpaVal > 10) newErrors.gpa = 'Enter 0.00–10.00';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload = {
      name: form.fullName.trim(),
      course: form.course,
      roll_no: form.rollNo.trim(),
      attendance_percentage: attVal,
      gpa: gpaVal,
      admission_grade: parseFloat(form.admissionGrade) || null,
      units_1st_sem_enrolled: parseInt(form.units1Enrolled) || 0,
      units_1st_sem_approved: parseInt(form.units1Approved) || 0,
      units_2nd_sem_enrolled: parseInt(form.units2Enrolled) || 0,
      units_2nd_sem_approved: parseInt(form.units2Approved) || 0,
    };

    try {
      const res = await fetch(`${API_BASE}/admin/students`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setToast({ message: data.error || 'Could not register student', isError: true });
        setTimeout(() => setToast({ message: '', isError: false }), 3200);
        return;
      }
      setToast({ message: `Registered! Login: ${data.login_username} / ${data.default_password}`, isError: false });
      setTimeout(() => setToast({ message: '', isError: false }), 4500);
      setForm(EMPTY_FORM);
      setErrors({});
    } catch {
      setToast({ message: 'Could not reach the server. Is the Flask app running?', isError: true });
      setTimeout(() => setToast({ message: '', isError: false }), 3200);
    }
  };

  return (
    <AppShell active="/students">
      <div className={`toast${toast.message ? ' show' : ''}`} style={toast.isError ? { background: 'var(--rag-red)' } : undefined}>
        {toast.message || 'Student registered successfully!'}
      </div>

      <div className="topbar">
        <div>
          <span className="eyebrow">Students</span>
          <h1>Add a student</h1>
          <p className="sub">Creates a student record and a linked login account (default password = roll number).</p>
        </div>
        <Link to="/students" className="btn btn-ghost">&larr; Back to register</Link>
      </div>

      <div className="panel">
        <div style={{ padding: '1.6rem 1.8rem' }}>
          <form noValidate onSubmit={handleSubmit}>
            <div className="reg-section">
              <h2>Personal information</h2>
              <div className="reg-grid">
                <div className="field">
                  <label htmlFor="fullName">Full name</label>
                  <input type="text" id="fullName" placeholder="Letters and spaces only" className={errors.fullName ? 'error' : ''}
                    value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
                  {errors.fullName && <span className="err-msg show">{errors.fullName}</span>}
                </div>
                <div className="field">
                  <label htmlFor="course">Course / department</label>
                  <select id="course" style={{ height: 44, borderRadius: 'var(--radius)', border: '1px solid var(--line)', padding: '0 12px', background: 'var(--paper-raised)' }}
                    value={form.course} onChange={(e) => setField('course', e.target.value)}>
                    <option value="" disabled>Select…</option>
                    <option>Computer Science</option>
                    <option>Informatics Engineering</option>
                    <option>Management</option>
                    <option>Nursing</option>
                    <option>Tourism</option>
                    <option>Social Service</option>
                    <option>Basic Education</option>
                  </select>
                  {errors.course && <span className="err-msg show">{errors.course}</span>}
                </div>
              </div>
            </div>

            <div className="reg-section">
              <h2>Academic details</h2>
              <div className="reg-grid">
                <div className="field">
                  <label htmlFor="rollNo">Roll number</label>
                  <input type="text" id="rollNo" placeholder="e.g. STU-20261031" className={errors.rollNo ? 'error' : ''}
                    value={form.rollNo} onChange={(e) => setField('rollNo', e.target.value)} />
                  {errors.rollNo && <span className="err-msg show">{errors.rollNo}</span>}
                </div>
                <div className="field">
                  <label htmlFor="attendance">Attendance %</label>
                  <input type="number" id="attendance" min="0" max="100" step="0.1" placeholder="0–100" className={errors.attendance ? 'error' : ''}
                    value={form.attendance} onChange={(e) => setField('attendance', e.target.value)} />
                  {errors.attendance && <span className="err-msg show">{errors.attendance}</span>}
                </div>
                <div className="field">
                  <label htmlFor="gpa">GPA (0–10)</label>
                  <input type="number" id="gpa" min="0" max="10" step="0.01" placeholder="0.00–10.00" className={errors.gpa ? 'error' : ''}
                    value={form.gpa} onChange={(e) => setField('gpa', e.target.value)} />
                  {errors.gpa && <span className="err-msg show">{errors.gpa}</span>}
                </div>
                <div className="field">
                  <label htmlFor="admissionGrade">Admission grade (0–200)</label>
                  <input type="number" id="admissionGrade" min="0" max="200" step="0.1" placeholder="0–200"
                    value={form.admissionGrade} onChange={(e) => setField('admissionGrade', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="units1Enrolled">1st sem. units enrolled</label>
                  <input type="number" id="units1Enrolled" min="0" step="1" placeholder="0"
                    value={form.units1Enrolled} onChange={(e) => setField('units1Enrolled', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="units1Approved">1st sem. units approved</label>
                  <input type="number" id="units1Approved" min="0" step="1" placeholder="0"
                    value={form.units1Approved} onChange={(e) => setField('units1Approved', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="units2Enrolled">2nd sem. units enrolled</label>
                  <input type="number" id="units2Enrolled" min="0" step="1" placeholder="0"
                    value={form.units2Enrolled} onChange={(e) => setField('units2Enrolled', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="units2Approved">2nd sem. units approved</label>
                  <input type="number" id="units2Approved" min="0" step="1" placeholder="0"
                    value={form.units2Approved} onChange={(e) => setField('units2Approved', e.target.value)} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.85em' }}>Register student record</button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

export default RegisterStudentPage;
