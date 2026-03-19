import React from "react";
import { Link } from "react-router-dom";

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-brand">
          <span className="landing-logo">⌨</span>
          <span className="landing-title">Typing Master</span>
        </div>
        <nav className="landing-nav">
          <Link to="/modes" className="nav-link">Modes</Link>
          <Link to="/duel" className="nav-link">Race a friend</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero card">
          <h1>Turn typing into a game.</h1>
          <p>
            Practice, race friends, and play mini‑games that train speed, accuracy, and control. One
            place for everything typing.
          </p>
          <div className="landing-cta-row">
            <Link to="/modes" className="mode-button active">
              Start typing now
            </Link>
            <Link to="/duel" className="mode-button">
              Create a duel room
            </Link>
          </div>
          <div className="landing-meta">
            <span>⚡ Timed tests</span>
            <span>🎮 Bubble & racing games</span>
            <span>📈 Progress dashboard</span>
          </div>
        </section>

        <section className="landing-grid">
          <article className="landing-card">
            <h2>Practice that feels like play</h2>
            <p className="hint">
              Solo tests, word sprints, key drills, and paragraph practice help you build muscle
              memory without boredom.
            </p>
          </article>
          <article className="landing-card">
            <h2>Race your friends</h2>
            <p className="hint">
              Share a room ID, pick a time limit, and watch live progress bars while you sprint to
              the finish line.
            </p>
          </article>
          <article className="landing-card">
            <h2>Track your progress</h2>
            <p className="hint">
              Your solo results are saved locally so you can watch your WPM and accuracy climb over
              time.
            </p>
          </article>
        </section>
      </main>

      <footer className="footer">
        <span>Made for keyboard addicts.</span>
      </footer>
    </div>
  );
};

