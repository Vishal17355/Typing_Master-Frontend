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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const words = useMemo(() => pickWords(220), []);

  const targetIndex = typedWords;
  const targetWord = words[targetIndex] ?? "";

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

    // Only process complete words on space or newline.
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
    if (last.length === 0) {
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

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Word Sprint</h1>
            <p>Type one word at a time. Hit space to submit each word.</p>
          </div>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="card">
        <div className="form-row">
          <label>
            Time
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
          <button type="button" onClick={reset}>
            New run
          </button>
          <span className="hint">
            {remainingSeconds == null ? "Start typing to begin." : `Remaining: ${remainingSeconds}s`}
          </span>
        </div>
      </section>

      <section className="layout layout-practice-only">
        <div className="card passage-card-monkey">
          <div className="practice-header">
            <span>Target</span>
            <span>
              Words: {typedWords} · Mistakes: {mistakes}
            </span>
          </div>

          <div className="sample-text monkey-line">
            <p className="sample-line">
              <span className="sample-char correct">{targetWord}</span>
            </p>
          </div>

          <textarea
            ref={inputRef}
            className="typing-input"
            value={currentInput}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Type the word and press space…"
            disabled={finished}
          />

          {finished && (
            <div className="hint" style={{ marginTop: 10 }}>
              Result: <strong>{wpm.toFixed(1)} WPM</strong> · Accuracy{" "}
              <strong>{accuracy.toFixed(1)}%</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

