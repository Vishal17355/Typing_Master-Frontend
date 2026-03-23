import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { COMMON_WORDS } from "./games/wordLists";

const DURATIONS = [15, 30, 60, 120] as const;

const pickWords = (count: number) => {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]);
  }
  return out;
};

export const WordSprintPage: React.FC = () => {
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [typedWords, setTypedWords] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const words = useMemo(() => pickWords(220), []);
  const targetIndex = typedWords;
  const targetWord = words[targetIndex] ?? "";
  const previousWord = words[Math.max(0, targetIndex - 1)] ?? "protocol";
  const nextWords = words.slice(targetIndex + 1, targetIndex + 5);

  useEffect(() => {
    if (endTime == null) return;
    const id = window.setInterval(() => {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        setRemainingSeconds(0);
        setFinished(true);
        window.clearInterval(id);
      } else {
        setRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [endTime]);

  const startIfNeeded = () => {
    if (endTime != null) return;
    const now = Date.now();
    setEndTime(now + durationSeconds * 1000);
    setRemainingSeconds(durationSeconds);
    setFinished(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const reset = () => {
    setEndTime(null);
    setRemainingSeconds(null);
    setFinished(false);
    setCurrentInput("");
    setTypedWords(0);
    setMistakes(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleChange = (value: string) => {
    if (finished) return;
    startIfNeeded();

    if (!/[ \n\t]$/.test(value)) {
      setCurrentInput(value);
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setCurrentInput("");
      return;
    }

    const parts = trimmed.split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    if (!last.length) {
      setCurrentInput("");
      return;
    }

    if (last.toLowerCase() === targetWord.toLowerCase()) {
      setTypedWords((n) => n + 1);
    } else {
      setMistakes((m) => m + 1);
      setTypedWords((n) => n + 1);
    }
    setCurrentInput("");
  };

  const minutes = durationSeconds / 60;
  const wpm = minutes > 0 ? typedWords / minutes : 0;
  const accuracy = typedWords > 0 ? ((typedWords - mistakes) / typedWords) * 100 : 0;
  const progress = Math.max(0, Math.min(1, typedWords / 220));

  return (
    <div className="sprint-terminal">
      <nav className="sprint-topbar">
        <div className="sprint-brand">KINETIC_TERMINAL</div>
        <div className="sprint-toplinks">
          <Link to="/practice" className="active">
            TRAINING
          </Link>
          <Link to="/duel">COMPETE</Link>
          <Link to="/dashboard">TELEMETRY</Link>
        </div>
        <div className="sprint-topicons" aria-hidden="true">
          <span>NTF</span>
          <span>CFG</span>
          <span>USR</span>
        </div>
      </nav>

      <aside className="sprint-sidebar">
        <div className="sprint-sidebar-head">
          <h3>OPERATIONS</h3>
          <p>SELECT MODULE</p>
        </div>
        <div className="sprint-sidebar-links">
          <Link to="/practice">Zen Mode</Link>
          <Link to="/word-sprint" className="active">
            Blitz
          </Link>
          <Link to="/practice">Circuit</Link>
          <Link to="/practice">Endurance</Link>
          <Link to="/key-drill">Custom</Link>
        </div>
        <div className="sprint-sidebar-foot">
          <Link to="/dashboard">Profile</Link>
          <Link to="/">Logout</Link>
        </div>
      </aside>

      <main className="sprint-main">
        <div className="sprint-grid">
          <div className="sprint-header-row">
            <div>
              <h1>
                WORD_SPRINT // <span>NEON_PRECISION</span>
              </h1>
              <p>High Frequency Training Protocol Active</p>
            </div>
            <label className="sprint-duration-picker">
              <span>DURATION</span>
              <select
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value) || 30)}
                disabled={endTime != null && !finished}
              >
                {DURATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s < 60 ? `${s}s` : `${s / 60} min`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section className="sprint-focus-area">
            <div className="sprint-target-panel">
              <span className="sprint-kicker">Target Velocity</span>
              <h2>
                {targetWord}
                <em>_</em>
              </h2>
              <p>Press space to confirm</p>
              <div className="sprint-panel-markers" aria-hidden="true">
                <span />
                <span />
              </div>
            </div>

            <div className="sprint-input-wrap">
              <input
                ref={inputRef}
                className="sprint-input"
                value={currentInput}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Start typing..."
                disabled={finished}
              />
              <div className="sprint-caret-chip">
                <span className="sprint-caret" />
                <span>AUTO_FOCUS</span>
              </div>
            </div>

            <div className="sprint-word-stream">
              <span className="is-old">{previousWord}</span>
              <span className="is-current">{targetWord}</span>
              {nextWords.map((word) => (
                <span key={word}>{word}</span>
              ))}
            </div>
          </section>

          <aside className="sprint-sidepanel">
            <section className="sprint-stats-card">
              <div className="sprint-card-head">
                <h3>LIVE_STATS</h3>
                <i />
              </div>
              <div className="sprint-stats-grid">
                <div>
                  <span>WPM</span>
                  <strong>{wpm.toFixed(0)}</strong>
                  <div className="sprint-bar"><div style={{ width: `${Math.min(100, wpm)}%` }} /></div>
                </div>
                <div>
                  <span>ACC</span>
                  <strong>{accuracy.toFixed(1)}%</strong>
                  <div className="sprint-bar tertiary"><div style={{ width: `${accuracy}%` }} /></div>
                </div>
                <div>
                  <span>WORDS</span>
                  <strong>{typedWords}</strong>
                </div>
                <div>
                  <span>ERRORS</span>
                  <strong className="danger">{mistakes.toString().padStart(2, "0")}</strong>
                </div>
              </div>
            </section>

            <section className="sprint-trend-card">
              <h3>Performance Trend</h3>
              <div className="sprint-trend-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="sprint-trend-labels">
                <span>Start</span>
                <span>Current</span>
              </div>
            </section>

            <section className="sprint-history-card">
              <h3>Recent Sprints</h3>
              <div className="sprint-history-row">
                <span>Circuit_A1</span>
                <strong>118 WPM</strong>
                <em>99%</em>
              </div>
              <div className="sprint-history-row">
                <span>Endurance_X</span>
                <strong>105 WPM</strong>
                <em>96%</em>
              </div>
              <button type="button" onClick={reset}>
                {finished ? "RESTART_SESSION" : "View Detailed Analytics"}
              </button>
            </section>
          </aside>
        </div>

        <div className="sprint-bottom-progress">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      </main>
    </div>
  );
};
