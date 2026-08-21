import { useEffect } from 'react';

// Matches the .toast/.toast.show/.toast.error styling in edutrack.css,
// which was previously duplicated (with manual classList.add/remove +
// setTimeout) in students.html, settings.html, student-detail.html, and
// register-student.html.
function Toast({ message, isError, onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <div className={`toast${message ? ' show' : ''}${isError ? ' error' : ''}`}>
      <span className="toast-dot"></span>
      <span>{message}</span>
    </div>
  );
}

export default Toast;
