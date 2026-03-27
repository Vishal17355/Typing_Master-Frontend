import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { COMMON_WORDS } from "./games/wordLists";

type FallingWord = {
  id: number;
  word: string;
  x: number; // 0..1
  y: number; // 0..1 (top)
  popping?: boolean;
};

const DURATIONS = [30, 60, 120] as const;
const SPAWN_INTERVAL_MS = 900;
const TICK_MS = 50;
const FALL_SPEED = 0.0125;
const MISS_LIMIT = 15;

const randomWord = () =>
  COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];

export const FallingWordsPage: React.FC = () => {
  const [durationSeconds, setDurationSeconds] = useState<number>(60);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const [items, setItems] = useState<FallingWord[]>([]);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const idRef = useRef(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef("");
  const endTimeRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const gameOverRef = useRef(false);

  const active = endTime != null && !finished && !gameOver;

  const start = () => {
    if (endTimeRef.current != null) return;
    const now = Date.now();
    const nextEndTime = now + durationSeconds * 1000;
    endTimeRef.current = nextEndTime;
    setEndTime(nextEndTime);
    setRemainingSeconds(durationSeconds);
    setFinished(false);
    setGameOver(false);
    finishedRef.current = false;
    gameOverRef.current = false;
    window.setTimeout(() => arenaRef.current?.focus(), 0);
  };

  const reset = () => {
    setItems([]);
    typedRef.current = "";
    setTyped("");
    setScore(0);
    setMisses(0);
    setGameOver(false);
    setFinished(false);
    finishedRef.current = false;
    gameOverRef.current = false;
    endTimeRef.current = null;
    setEndTime(null);
    setRemainingSeconds(null);
    window.setTimeout(() => arenaRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (endTime == null) return;
    const id = window.setInterval(() => {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        setRemainingSeconds(0);
        setFinished(true);
        finishedRef.current = true;
        window.clearInterval(id);
      } else {
        setRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [endTime]);

  useEffect(() => {
    if (!active) return;
    const spawn = () => {
      setItems((prev) => {
        idRef.current += 1;
        const x = Math.min(0.92, Math.max(0.08, Math.random()));
        const word = randomWord();
        // Avoid too much overlap by spacing based on existing near-top items.
        const tooClose = prev.some((p) => Math.abs(p.x - x) < 0.12 && p.y < 0.25);
        if (tooClose) return prev;
        return [...prev, { id: idRef.current, word, x, y: -0.05, popping: false }];
      });
    };
    const id = window.setInterval(spawn, SPAWN_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      setItems((prev) => {
        const next: FallingWord[] = [];
        for (const it of prev) {
          if (it.popping) {
            next.push(it);
            continue;
          }
          const y = it.y + FALL_SPEED;
          if (y >= 1.02) {
            setMisses((m) => {
              const nm = m + 1;
              if (nm >= MISS_LIMIT) {
                gameOverRef.current = true;
                setGameOver(true);
              }
              return nm;
            });
            continue;
          }
          next.push({ ...it, y });
        }
        return next;
      });
    };
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [active]);

  const popByWord = useCallback((w: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => !it.popping && it.word.toLowerCase() === w.toLowerCase());
      if (idx === -1) return prev;
      const hit = prev[idx];
      const next = prev.map((it) => (it.id === hit.id ? { ...it, popping: true } : it));
      window.setTimeout(() => {
        setItems((p) => p.filter((it) => it.id !== hit.id));
      }, 180);
      setScore((s) => s + 1);
      return next;
    });
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (finishedRef.current || gameOverRef.current) return;
      if (endTimeRef.current == null) start();
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const w = typedRef.current.trim();
        if (w) popByWord(w);
        typedRef.current = "";
        setTyped("");
        return;
      }
      if (e.key === "Backspace") return;
      if (e.key.length === 1) {
        const ch = e.key;
        if (/^[a-zA-Z]$/.test(ch)) {
          e.preventDefault();
          const next = (typedRef.current + ch).slice(0, 24);
          typedRef.current = next;
          setTyped(next);
        }
      }
    },
    [popByWord]
  );

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    el.tabIndex = 0;
    el.addEventListener("keydown", handleKey);
    return () => el.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const resultLabel = useMemo(() => {
    const minutes = durationSeconds / 60;
    const wpm = minutes > 0 ? score / minutes : 0;
    return `${wpm.toFixed(1)} WPM`;
  }, [durationSeconds, score]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Falling Words</h1>
            <p>Type a word and press Space/Enter to clear it before it hits the bottom.</p>
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
              onChange={(e) => setDurationSeconds(Number(e.target.value) || 60)}
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
          <span className="hint">
            {remainingSeconds == null ? "Press any key to start." : `Remaining: ${remainingSeconds}s`} · Misses:{" "}
            {misses}/{MISS_LIMIT}
          </span>
        </div>
      </section>

      <section className="layout layout-practice-only">
        <div className="card">
          <div
            ref={arenaRef}
            className="falling-arena"
            role="application"
            aria-label="Falling words game arena"
            onClick={() => arenaRef.current?.focus()}
          >
            {items.map((it) => (
              <div
                key={it.id}
                className={`falling-word ${it.popping ? "falling-word-pop" : ""}`}
                style={{
                  left: `${it.x * 100}%`,
                  top: `${it.y * 100}%`
                }}
              >
                {it.word}
              </div>
            ))}
            <div className="falling-input-bar">
              <span className="falling-prompt">Type:</span>
              <span className="falling-typed">{typed || "…"}</span>
              <span className="falling-score">Score: {score}</span>
            </div>
          </div>

          {(finished || gameOver) && (
            <p className="hint" style={{ marginTop: 10 }}>
              Result: <strong>{resultLabel}</strong> · Score <strong>{score}</strong>{" "}
              {gameOver ? "· Game over (too many misses)." : ""}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

