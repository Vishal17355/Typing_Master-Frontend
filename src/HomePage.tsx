import React from "react";
import { Link } from "react-router-dom";

export const HomePage: React.FC = () => {
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Typing Master</h1>
            <p>Choose a mode to start.</p>
          </div>
          <nav className="app-nav">
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="home-links">
        <Link to="/duel" className="home-card card">
          <h2>Realtime duel</h2>
          <p className="hint">Race a friend in real time. Share a room ID and type the same passage.</p>
        </Link>
        <Link to="/practice" className="home-card card">
          <h2>Solo practice</h2>
          <p className="hint">Timed typing test with 100 passages. See your WPM and accuracy.</p>
        </Link>
        <Link to="/bubbles" className="home-card card">
          <h2>Letter bubbles</h2>
          <p className="hint">Bubbles rise from the bottom. Type the letter to pop them. Miss 20 = game over.</p>
        </Link>
        <Link to="/word-sprint" className="home-card card">
          <h2>Word Sprint</h2>
          <p className="hint">Rapid-fire common words. Type a word and press space to submit.</p>
        </Link>
        <Link to="/falling-words" className="home-card card">
          <h2>Falling Words</h2>
          <p className="hint">Words fall down. Type the full word and press space/enter to clear it.</p>
        </Link>
        <Link to="/key-drill" className="home-card card">
          <h2>Key Drill</h2>
          <p className="hint">2–3 letter combos to build finger speed and rhythm.</p>
        </Link>
      </div>

      <footer className="footer">
        <Link to="/" className="nav-link">Home</Link>
      </footer>
    </div>
  );
};
