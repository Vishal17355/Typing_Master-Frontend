import React from "react";
import { Link } from "react-router-dom";
import { BubbleGame } from "./BubbleGame";

export const BubbleGamePage: React.FC = () => {
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <h1>Letter bubbles</h1>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          </nav>
        </div>
      </header>
      <BubbleGame />
      <footer className="footer">
        <Link to="/" className="nav-link">Home</Link>
      </footer>
    </div>
  );
};
