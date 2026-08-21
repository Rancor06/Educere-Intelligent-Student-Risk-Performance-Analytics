import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import PredictorPage from './pages/PredictorPage';

// Each route below replaces one static .html page. Paths mirror the old
// filenames (students.html -> /students) so nothing about the site's
// shape changed, just how it's served.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/student-detail" element={<StudentDetailPage />} />
        <Route path="/register-student" element={<Navigate to="/students" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/student-dashboard" element={<StudentDashboardPage />} />
        <Route path="/predictor" element={<PredictorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
