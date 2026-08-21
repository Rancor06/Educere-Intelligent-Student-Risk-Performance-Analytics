import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';
import { Footer } from '../layout/AppShell';
import Logo from '../components/Logo';

// Converted from index.html. Structure, classes, and visuals unchanged —
// only the brand text/glyph and the login-dropdown interaction (was
// vanilla JS classList.toggle, now React state) changed.

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing" onClick={() => menuOpen && setMenuOpen(false)}>
      <nav className="navbar">
        <div className="brand">
          <div className="brand-mark"><Logo size={16} /></div>
          Educere
        </div>
        <div className="login-dropdown">
          <button
            className="signin-btn"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            Sign in
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <div className={`login-menu${menuOpen ? ' open' : ''}`}>
            <Link to="/login?role=student">Student</Link>
            <Link to="/login?role=admin">Admin</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">&#128640; INNOLIFT VENTURES &ndash; CAPSTONE PROJECT</span>
            <h1 className="headline">Catch dropout risk<br />before it becomes<br /><span className="accent">a dropout.</span></h1>
            <svg className="underline-svg" width="250" height="18" viewBox="0 0 250 18" fill="none">
              <path d="M2 12 C 60 2, 190 2, 248 10" stroke="#5b4ee0" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p className="hero-copy">
              Educere tracks student attendance, grades, and engagement to flag who's on track, who needs watching, and who's at risk — early enough for a teacher to actually step in.
              Built on a machine learning model trained on real academic outcome data.
            </p>
            <div className="hero-buttons">
              <Link to="/login?role=student" className="btn-mock btn-mock-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Student login
              </Link>
              <Link to="/login?role=admin" className="btn-mock btn-mock-outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Admin login
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="blob"></div>
            <div className="dot-grid"></div>
            <div className="dashed-arc"></div>
            <div className="dot-lone"></div>

            <div className="float-chip">
              <div className="ic">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></svg>
              </div>
              <div className="label">ML Model<br />Active <span className="status-dot"></span></div>
            </div>

            <div className="risk-card">
              <h3>Training data distribution</h3>
              <p className="risk-sub">4,424 real student records — UCI Dropout &amp; Academic Success dataset</p>
              <div className="risk-row">
                <div className="donut-wrap">
                  <svg width="150" height="150" viewBox="0 0 150 150">
                    <circle cx="75" cy="75" r="58" fill="none" stroke="#eee9fc" strokeWidth="16" />
                    <circle cx="75" cy="75" r="58" fill="none" stroke="#22c55e" strokeWidth="16"
                      strokeDasharray="181.9 364.4" strokeDashoffset="0" transform="rotate(-90 75 75)" strokeLinecap="round" />
                    <circle cx="75" cy="75" r="58" fill="none" stroke="#f59e0b" strokeWidth="16"
                      strokeDasharray="65.2 364.4" strokeDashoffset="-181.9" transform="rotate(-90 75 75)" strokeLinecap="round" />
                    <circle cx="75" cy="75" r="58" fill="none" stroke="#ef4444" strokeWidth="16"
                      strokeDasharray="117.0 364.4" strokeDashoffset="-247.1" transform="rotate(-90 75 75)" strokeLinecap="round" />
                  </svg>
                  <div className="donut-center">
                    <div className="num">4,424</div>
                    <div className="lbl">Records</div>
                  </div>
                </div>
                <div className="legend">
                  <div className="legend-item"><span className="sw" style={{ background: '#22c55e' }}></span><span className="name">Graduate</span><span className="val">2,209 (49.9%)</span></div>
                  <div className="legend-item"><span className="sw" style={{ background: '#f59e0b' }}></span><span className="name">Enrolled</span><span className="val">794 (17.9%)</span></div>
                  <div className="legend-item"><span className="sw" style={{ background: '#ef4444' }}></span><span className="name">Dropout</span><span className="val">1,421 (32.1%)</span></div>
                </div>
              </div>

              <div className="dataset-note">
                <div className="ic">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                </div>
                <div><strong>Source:</strong> UCI "Predict Students' Dropout and Academic Success" dataset — the same real-world records Educere's risk model is trained on.</div>
              </div>
            </div>

            <div className="float-btn bell">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </div>
            <div className="float-btn chart">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18.7 8 12 14.7l-3.5-3.5L3 16.5" /></svg>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-ic green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="feature-eyebrow green">For admins</div>
          <h4>Manage the roster</h4>
          <p>Add and update student academic records — attendance, grades, tuition status — and run risk predictions per student.</p>
          <div className="feature-arrow green">&rsaquo;</div>
        </div>

        <div className="feature-card">
          <div className="feature-ic blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
          </div>
          <div className="feature-eyebrow blue">For students</div>
          <h4>See your own progress</h4>
          <p>Log in to a personal dashboard showing your attendance, GPA, and semester unit progress — always up to date.</p>
          <div className="feature-arrow blue">&rsaquo;</div>
        </div>

        <div className="feature-card">
          <div className="feature-ic violet">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" /></svg>
          </div>
          <div className="feature-eyebrow violet">Behind the scenes</div>
          <h4>ML-driven risk scoring</h4>
          <p>A trained model reads each student's academic profile and classifies risk — visible only to admins to guide support, not to label students.</p>
          <div className="feature-arrow violet">&rsaquo;</div>
        </div>
      </section>

      <section className="status-band">
        <div className="status-inner">
          <div className="status-visual">
            <div className="ring r1"></div>
            <div className="ring r2"></div>
            <div className="status-shield">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" /><path d="M9 12l2 2 4-4" /></svg>
            </div>
            <div className="dot" style={{ background: '#22c55e', top: '14px', left: '14px' }}></div>
            <div className="dot" style={{ background: '#ef4444', top: '6px', right: '22px' }}></div>
            <div className="dot" style={{ background: '#f59e0b', bottom: '10px', left: '40px' }}></div>
            <div className="dot" style={{ background: '#c9c3ee', bottom: '30px', right: '4px', width: '8px', height: '8px' }}></div>
          </div>

          <div>
            <h3 className="status-title">How risk status works</h3>
            <div className="status-cols">
              <div className="status-col">
                <div className="head"><span className="dot" style={{ background: '#22c55e' }}></span>On track</div>
                <p>Meeting attendance and academic benchmarks.</p>
              </div>
              <div className="status-col">
                <div className="head"><span className="dot" style={{ background: '#f59e0b' }}></span>Watch</div>
                <p>Early signs worth monitoring.</p>
              </div>
              <div className="status-col">
                <div className="head"><span className="dot" style={{ background: '#ef4444' }}></span>At risk</div>
                <p>Needs intervention soon.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="note-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
        Already have an account? Use the Sign in menu above to continue as a student or admin.
      </div>

      <Footer />
    </div>
  );
}

export default LandingPage;
