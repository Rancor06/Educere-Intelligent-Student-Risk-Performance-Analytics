import { useMemo, useState } from 'react';
import AppShell from '../layout/AppShell';
import { API_BASE } from '../apiBase';
import './AssignmentReview.css';

const DEFAULT_RUBRIC = `Conceptual Understanding — 40%
Technical Correctness — 30%
Completeness — 20%
Visual Representation — 10%`;

function ScoreRing({ score }) {
  const numeric = Number(score) || 0;
  const pct = Math.max(0, Math.min(100, numeric * 10));
  return (
    <div className="ar-score-ring" style={{ '--score-pct': `${pct}%` }}>
      <div className="ar-score-ring-inner">
        <strong>{numeric.toFixed(1)}</strong>
        <span>/ 10</span>
      </div>
    </div>
  );
}

function ResultList({ title, items, tone = '' }) {
  if (!items?.length) return null;
  return (
    <div className={`ar-result-list ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}

export default function AssignmentReviewPage() {
  const [question, setQuestion] = useState('Explain the architecture of a Convolutional Neural Network and draw a suitable diagram.');
  const [referenceAnswer, setReferenceAnswer] = useState('A CNN typically contains convolutional layers that learn spatial features, activation functions such as ReLU, pooling layers that reduce spatial dimensions, and fully connected layers for final classification. The architecture processes an image through progressively learned feature maps before producing predictions.');
  const [rubric, setRubric] = useState(DEFAULT_RUBRIC);
  const [studentAnswer, setStudentAnswer] = useState('A convolutional neural network has convolution and pooling layers followed by fully connected layers. Convolution extracts features from the image and pooling reduces the size. The final layers classify the image.');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fileLabel = useMemo(() => file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : 'No file selected', [file]);

  const review = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);

    try {
      const form = new FormData();
      form.append('question', question);
      form.append('reference_answer', referenceAnswer);
      form.append('rubric', rubric);
      form.append('student_answer', studentAnswer);
      if (file) form.append('file', file);

      const response = await fetch(`${API_BASE}/api/assignments/review`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to review the assignment.');
      setResult(data.review);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell active="/assignment-review">
      <div className="topbar ar-topbar">
        <div>
          <span className="eyebrow">AI-assisted evaluation</span>
          <h1>Assignment Review</h1>
          <p className="sub">Evaluate student responses against a question, reference answer and rubric — with support for PDF/image submissions.</p>
        </div>
        <div className="ar-badge"><span className="ar-badge-dot" /> Multimodal-ready</div>
      </div>

      <div className="ar-layout">
        <form className="card ar-form" onSubmit={review}>
          <div className="ar-section-head">
            <div><h2>Evaluation setup</h2><p>Give the reviewer enough context to make the score defensible.</p></div>
            <span className="ar-step">01</span>
          </div>

          <label className="ar-field">
            <span>Question / prompt</span>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} required />
          </label>
          <label className="ar-field">
            <span>Reference answer</span>
            <textarea value={referenceAnswer} onChange={(e) => setReferenceAnswer(e.target.value)} rows={6} placeholder="Expected answer or key concepts…" />
          </label>
          <label className="ar-field">
            <span>Rubric</span>
            <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={5} />
          </label>
          <label className="ar-field">
            <span>Student answer</span>
            <textarea value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} rows={8} placeholder="Paste the student's response…" />
          </label>

          <div className="ar-upload">
            <div className="ar-upload-copy">
              <strong>Assignment file <em>optional</em></strong>
              <span>PDF, PNG, JPG or TXT · used for extraction / visual analysis</span>
              <small>{fileLabel}</small>
            </div>
            <label className="btn btn-ghost ar-file-btn">
              Choose file
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          {error ? <div className="ar-error">{error}</div> : null}

          <button className="btn btn-primary ar-submit" disabled={busy} type="submit">
            {busy ? 'Analyzing assignment…' : 'Review assignment'}
          </button>
        </form>

        <section className="ar-results-column">
          {!result && !busy ? (
            <div className="card ar-empty">
              <div className="ar-empty-icon">AI</div>
              <h2>Your evaluation appears here</h2>
              <p>Submit a response to see the score breakdown, strengths, missing concepts and actionable feedback.</p>
              <div className="ar-mini-flow"><span>Answer</span><i>→</i><span>Analyze</span><i>→</i><span>Feedback</span></div>
            </div>
          ) : null}

          {busy ? (
            <div className="card ar-empty ar-loading">
              <div className="ar-loader" />
              <h2>Analyzing response</h2>
              <p>Comparing the submission with the reference answer and rubric.</p>
            </div>
          ) : null}

          {result ? (
            <div className="card ar-results">
              <div className="ar-results-head">
                <div><span className="eyebrow">Review complete</span><h2>Evaluation summary</h2></div>
                <ScoreRing score={result.score} />
              </div>

              <div className="ar-metrics">
                {Object.entries(result.criteria || {}).map(([key, value]) => (
                  <div className="ar-metric" key={key}>
                    <div><span>{key.replaceAll('_', ' ')}</span><strong>{Number(value.score).toFixed(1)} / {value.max ?? 10}</strong></div>
                    <div className="ar-progress"><span style={{ width: `${Math.max(0, Math.min(100, (Number(value.score) / Number(value.max || 10)) * 100))}%` }} /></div>
                  </div>
                ))}
              </div>

              <ResultList title="Strengths" items={result.strengths} tone="positive" />
              <ResultList title="Areas to improve" items={result.weaknesses} tone="warning" />

              {result.missing_concepts?.length ? (
                <div className="ar-concepts"><h3>Missing / underdeveloped concepts</h3><div>{result.missing_concepts.map((concept) => <span key={concept}>{concept}</span>)}</div></div>
              ) : null}

              <div className="ar-feedback"><span>Personalized feedback</span><p>{result.feedback}</p></div>
              <div className="ar-source-note">{result.source_used || 'Evaluation generated from the submitted answer and rubric.'}</div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
