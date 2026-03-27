import React, { useEffect, useMemo, useState } from "react";
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

const formatSessionTime = (timestamp: string) =>
  new Date(timestamp).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const buildLinePath = (values: number[], width: number, height: number, padding = 18) => {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
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

  const recentResults = useMemo(() => [...results].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)), [results]);
  const chartResults = recentResults.slice(0, 8).reverse();

  const bestWpm = recentResults.length ? Math.max(...recentResults.map((r) => r.wpm)) : 0;
  const avgAccuracy = recentResults.length
    ? recentResults.reduce((sum, r) => sum + r.accuracy, 0) / recentResults.length
    : 0;
  const totalChars = recentResults.reduce((sum, r) => sum + r.charactersTyped, 0);
  const avgDuration = recentResults.length
    ? recentResults.reduce((sum, r) => sum + r.durationSeconds, 0) / recentResults.length
    : 0;

  const wpmValues = chartResults.map((r) => r.wpm);
  const accuracyValues = chartResults.map((r) => r.accuracy);
  const wpmPath = buildLinePath(wpmValues, 560, 220);
  const accuracyPath = buildLinePath(accuracyValues, 560, 220);

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div>
          <span className="dashboard-kicker">Performance Overview</span>
          <h1>Typing Dashboard</h1>
          <p>See how your speed, accuracy, and consistency are changing across recent solo practice sessions.</p>
        </div>
        <div className="dashboard-hero-actions">
          <Link to="/practice" className="dashboard-primary-link">
            Start Practice
          </Link>
          <Link to="/modes" className="dashboard-secondary-link">
            Back to Modes
          </Link>
        </div>
      </header>

      {recentResults.length === 0 ? (
        <section className="dashboard-empty-state">
          <strong>No practice sessions yet</strong>
          <p>Complete a timed solo practice session and your visual stats will appear here.</p>
          <Link to="/practice" className="dashboard-primary-link">
            Run First Session
          </Link>
        </section>
      ) : (
        <>
          <section className="dashboard-metric-grid">
            <article className="dashboard-metric-card">
              <span>Best WPM</span>
              <strong>{bestWpm.toFixed(1)}</strong>
              <small>Top speed from all saved solo runs</small>
            </article>
            <article className="dashboard-metric-card">
              <span>Average Accuracy</span>
              <strong>{avgAccuracy.toFixed(1)}%</strong>
              <small>Based on {recentResults.length} recorded sessions</small>
            </article>
            <article className="dashboard-metric-card">
              <span>Total Characters</span>
              <strong>{totalChars}</strong>
              <small>Useful measure of total practice volume</small>
            </article>
            <article className="dashboard-metric-card">
              <span>Average Duration</span>
              <strong>{Math.round(avgDuration)}s</strong>
              <small>Typical test length across your saved runs</small>
            </article>
          </section>

          <section className="dashboard-visual-grid">
            <article className="dashboard-chart-card dashboard-chart-wide">
              <div className="dashboard-chart-head">
                <div>
                  <span>Speed Trend</span>
                  <h2>Recent WPM progression</h2>
                </div>
                <small>Last {chartResults.length} sessions</small>
              </div>
              <svg viewBox="0 0 560 220" className="dashboard-line-chart" role="img" aria-label="WPM trend chart">
                <defs>
                  <linearGradient id="dashboardWpmStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00cffc" />
                    <stop offset="100%" stopColor="#bd9dff" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((line) => (
                  <line
                    key={line}
                    x1="16"
                    x2="544"
                    y1={32 + line * 48}
                    y2={32 + line * 48}
                    className="dashboard-grid-line"
                  />
                ))}
                <path d={wpmPath} className="dashboard-line-path" stroke="url(#dashboardWpmStroke)" />
                {chartResults.map((result, index) => {
                  const max = Math.max(...wpmValues, 1);
                  const min = Math.min(...wpmValues, 0);
                  const range = Math.max(max - min, 1);
                  const step = chartResults.length === 1 ? 0 : (560 - 36) / (chartResults.length - 1);
                  const x = 18 + index * step;
                  const y = 220 - 18 - ((result.wpm - min) / range) * (220 - 36);
                  return <circle key={result.id} cx={x} cy={y} r="4.5" className="dashboard-line-point" />;
                })}
              </svg>
            </article>

            <article className="dashboard-chart-card">
              <div className="dashboard-chart-head">
                <div>
                  <span>Accuracy</span>
                  <h2>Precision curve</h2>
                </div>
                <small>Live quality view</small>
              </div>
              <svg viewBox="0 0 560 220" className="dashboard-line-chart" role="img" aria-label="Accuracy chart">
                {[0, 1, 2, 3].map((line) => (
                  <line
                    key={line}
                    x1="16"
                    x2="544"
                    y1={32 + line * 48}
                    y2={32 + line * 48}
                    className="dashboard-grid-line"
                  />
                ))}
                <path d={accuracyPath} className="dashboard-line-path is-accuracy" />
              </svg>
            </article>

            <article className="dashboard-chart-card">
              <div className="dashboard-chart-head">
                <div>
                  <span>Session Pulse</span>
                  <h2>Recent snapshot</h2>
                </div>
                <small>Fast read</small>
              </div>
              <div className="dashboard-bar-row">
                {chartResults.map((result) => (
                  <div key={result.id} className="dashboard-bar-column">
                    <small>{Math.round(result.wpm)}</small>
                    <div
                      className="dashboard-bar"
                      style={{ height: `${Math.max(18, Math.min(100, result.wpm))}%` }}
                      title={`${result.wpm.toFixed(1)} WPM`}
                    />
                    <span>{new Date(result.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-history-card">
            <div className="dashboard-chart-head">
              <div>
                <span>History</span>
                <h2>Recent solo practice sessions</h2>
              </div>
              <small>{recentResults.length} saved sessions</small>
            </div>

            <div className="dashboard-session-list">
              {recentResults.map((result) => (
                <article key={result.id} className="dashboard-session-row">
                  <div className="dashboard-session-main">
                    <div className="dashboard-session-topline">
                      <strong>{formatSessionTime(result.timestamp)}</strong>
                      <span>{result.durationSeconds}s run</span>
                    </div>
                    <p>{result.textSample}{result.textSample.length >= 200 ? "..." : ""}</p>
                  </div>
                  <div className="dashboard-session-stats">
                    <div>
                      <span>WPM</span>
                      <strong>{result.wpm.toFixed(1)}</strong>
                    </div>
                    <div>
                      <span>Accuracy</span>
                      <strong>{result.accuracy.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span>Chars</span>
                      <strong>{result.charactersTyped}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
