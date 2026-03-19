import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PRACTICE_RESULTS_STORAGE_KEY = "typing-practice-results";

type PracticeResult = {
  id: string;
  timestamp: string;
  durationSeconds: number;
  wpm: number;
  accuracy: number;
  charactersTyped: number;
  textSample: string;
};

export const Dashboard: React.FC = () => {
  const [results, setResults] = useState<PracticeResult[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRACTICE_RESULTS_STORAGE_KEY);
      if (!raw) return;
      const parsed: PracticeResult[] = JSON.parse(raw);
      setResults(parsed);
    } catch {
      setResults([]);
    }
  }, []);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Typing Dashboard</h1>
            <p>Review your previous timed solo tests and track your accuracy.</p>
          </div>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Home</Link>
          </nav>
        </div>
      </header>

      <section className="card">
        <h2>Recent solo practice sessions</h2>
        {results.length === 0 && (
          <p className="hint">
            No results yet. Run a timed Solo practice session to see your history here.
          </p>
        )}
        {results.length > 0 && (
          <div className="results-list">
            {results.map((r) => {
              const date = new Date(r.timestamp);
              return (
                <div key={r.id} className="result-row">
                  <div className="result-main">
                    <div className="result-meta">
                      <span>
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                      </span>
                      <span>· {r.durationSeconds}s</span>
                    </div>
                    <div className="stats-row small">
                      <span>WPM: {r.wpm.toFixed(1)}</span>
                      <span>Accuracy: {r.accuracy.toFixed(1)}%</span>
                      <span>Chars: {r.charactersTyped}</span>
                    </div>
                  </div>
                  <p className="sample-text">
                    {r.textSample}
                    {r.textSample.length === 200 ? "…" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

