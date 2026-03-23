import React from "react";
import { Link } from "react-router-dom";
import { BubbleGame } from "./BubbleGame";

export const BubbleGamePage: React.FC = () => {
  return (
    <div className="bubble-terminal-page">
      <header className="bubble-page-topbar">
        <div className="bubble-page-brand">NEON_PRECISION</div>
        <nav className="bubble-page-nav">
          <Link to="/" className="bubble-page-nav-link active">
            ARENA
          </Link>
          <Link to="/dashboard" className="bubble-page-nav-link">
            RANKINGS
          </Link>
          <Link to="/modes" className="bubble-page-nav-link">
            CIRCUITS
          </Link>
        </nav>
        <div className="bubble-page-user">SYS</div>
      </header>

      <aside className="bubble-page-sidebar">
        <div className="bubble-page-sidehead">
          <div className="bubble-side-icon">OS</div>
          <div>
            <strong>NEON_OS</strong>
            <span>v4.0.2-ALPHA</span>
          </div>
        </div>
        <div className="bubble-page-sidelinks">
          <Link to="/practice">TECH_LAB</Link>
          <Link to="/bubbles" className="active">
            DATA_STREAM
          </Link>
          <Link to="/practice">OVERCLOCK</Link>
          <Link to="/dashboard">SYSTEM_LOG</Link>
        </div>
        <Link to="/bubbles" className="bubble-page-sidebutton">
          INITIALIZE_SESSION
        </Link>
      </aside>

      <main className="bubble-page-main">
        <div className="bubble-page-header">
          <div className="bubble-page-title">
            <span />
            <h1>
              ARENA_SUBSYSTEM: <em>LETTER_BUBBLES</em>
            </h1>
          </div>
          <div className="bubble-page-live">
            <i />
            LIVE_FEED_ACTIVE
          </div>
        </div>

        <BubbleGame terminal />
      </main>
    </div>
  );
};
