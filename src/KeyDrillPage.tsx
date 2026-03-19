import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const DURATIONS = [15, 30, 60, 120] as const;

const KEYS = "ASDFGHJKLQWERTYUIOPZXCVBNM";
const randomKey = () => KEYS.charAt(Math.floor(Math.random() * KEYS.length));

type Prompt = {
  id: number;
  text: string;
};

const makePrompt = (id: number): Prompt => {
  const len = Math.random() < 0.75 ? 2 : 3;
  let s = "";
  for (let i = 0; i < len; i += 1) s += randomKey();
  return { id, text: s };
};

export const KeyDrillPage: React.FC = () => {
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const [typed, setTyped] = useState("");
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [prompt, setPrompt] = useState<Prompt>(() => makePrompt(1));

  const arenaRef = useRef<HTMLDivElement>(null);
  const active = endTime != null && !finished;

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
    }, 250);
    return () => window.clearInterval(id);
  }, [endTime]);

  const start = () => {
    if (endTime != null) return;
    const now = Date.now();
    setEndTime(now + durationSeconds * 1000);
    setRemainingSeconds(durationSeconds);
    setFinished(false);
    window.setTimeout(() => arenaRef.current?.focus(), 0);
  };

  const reset = () => {
    setEndTime(null);
    setRemainingSeconds(null);
    setFinished(false);
    setTyped("");
    setHits(0);
    setMisses(0);
    setPrompt(makePrompt(1));
    window.setTimeout(() => arenaRef.current?.focus(), 0);
  };

  const onType = (ch: string) => {
    if (finished) return;
    start();
    const next = (typed + ch).slice(-8);
    setTyped(next);

    const target = prompt.text;
    const recent = (next.toUpperCase().match(/[A-Z]+/g) ?? []).join("");
    if (recent.endsWith(target)) {
      setHits((h) => h + 1);
      setPrompt((p) => makePrompt(p.id + 1));
    } else {
      // Lightly count misses when the user types a character that breaks prefix match.
      const maxCheck = Math.min(target.length, recent.length);
      const tail = recent.slice(-maxCheck);
      const possiblePrefix = target.slice(0, tail.length);
      if (tail !== possiblePrefix) setMisses((m) => m + 1);
    }
  };

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    el.tabIndex = 0;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Backspace") return;
      if (e.key.length !== 1) return;
      const up = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(up)) return;
      e.preventDefault();
      onType(up);
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [typed, finished, prompt.text]);

  const minutes = durationSeconds / 60;
  const wpm = minutes > 0 ? hits / minutes : 0;
  const accuracy = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

  const remainingLabel =
    remainingSeconds == null ? "Press any key to start." : `Remaining: ${remainingSeconds}s`;

  const typedPretty = useMemo(() => typed.toUpperCase().replace(/[^A-Z]/g, ""), [typed]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Key Drill</h1>
            <p>Train finger speed with 2–3 letter combos. Type continuously; no backspace needed.</p>
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
              disabled={active}
            >
              {DURATIONS.map((s) => (
                <option key={s} value={s}>
                  {s < 60 ? `${s}s` : `${s / 60} min`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={reset}>New run</button>
          <span className="hint">{remainingLabel}</span>
        </div>
      </section>

      <section className="layout layout-practice-only">
        <div
          ref={arenaRef}
          className="card keydrill-arena"
          role="application"
          aria-label="Key drill game arena"
          onClick={() => arenaRef.current?.focus()}
        >
          <div className="keydrill-top">
            <div>
              <div className="hint">Target</div>
              <div className="keydrill-target">{prompt.text}</div>
            </div>
            <div className="keydrill-stats">
              <span>Hits: {hits}</span>
              <span>Miss: {misses}</span>
              <span>
                WPM: {wpm.toFixed(1)} · Acc: {accuracy.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="keydrill-typed">
            {typedPretty.length ? typedPretty : "TYPE ANY LETTER…"}
          </div>

          {finished && (
            <p className="hint" style={{ marginTop: 10 }}>
              Result: <strong>{wpm.toFixed(1)} WPM</strong> · Accuracy{" "}
              <strong>{accuracy.toFixed(1)}%</strong>
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

