import AppShell from '../layout/AppShell';
import PredictionForm from '../PredictionForm';
import '../App.css';

// A deliberately separate workspace for predictions that should not be
// saved as a permanent student record. Student management lives in Students.

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

      <div className="app-shell-stacked predictor-workspace">
        <PredictionForm />
      </div>
    </AppShell>
  );
}

export default PredictorPage;
