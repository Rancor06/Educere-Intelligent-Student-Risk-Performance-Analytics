import AppShell from '../layout/AppShell';
import PredictionForm from '../PredictionForm';

// A deliberately separate workspace for predictions that should not be
// saved as a permanent student record. Student management lives in Students.
// PredictionForm renders its own themed panels (edutrack.css), so — unlike
// before — this page no longer wraps it in the standalone quick-risk-check
// widget's .app-shell-stacked shell, which pinned its own light-only color
// variables and would otherwise break dark mode here.

function PredictorPage() {
  return (
    <AppShell active="/predictor">
      <div className="topbar">
        <div>
          <span className="eyebrow">Standalone model check</span>
          <h1>Risk Predictor</h1>
          <p className="sub">Run the trained model for an unregistered student or a one-off scenario. To save a student and their result, use Student Directory.</p>
        </div>
      </div>

      <PredictionForm />
    </AppShell>
  );
}

export default PredictorPage;
