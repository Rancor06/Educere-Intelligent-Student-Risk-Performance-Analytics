// A larger, branded loading state for whole-panel data fetches (student
// roster, student detail, student dashboard) — distinct from the small
// white spinner in StudentDirectory.css, which is sized for sitting
// inside a button, not a panel.
function PanelLoader({ label = 'Loading…' }) {
  return (
    <div className="panel-loader">
      <span className="panel-loader-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default PanelLoader;
