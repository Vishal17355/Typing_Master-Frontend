import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PRACTICE_TEXTS } from "./practiceTexts";

const DURATIONS = [15, 30, 60, 120] as const;
const LEVELS = ["easy", "medium", "hard"] as const;
type Level = (typeof LEVELS)[number];

const AI_WPM: Record<Level, { min: number; max: number }> = {
  easy: { min: 24, max: 36 },
  medium: { min: 40, max: 58 },
  hard: { min: 62, max: 84 },
};

const pickPassage = () => PRACTICE_TEXTS[Math.floor(Math.random() * PRACTICE_TEXTS.length)];

export const KeyDrillPage: React.FC = () => {
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [level, setLevel] = useState<Level>("easy");
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const [passage, setPassage] = useState<string>(() => pickPassage());
  const [typed, setTyped] = useState("");
  const [computerChars, setComputerChars] = useState(0);
  const [playerWpm, setPlayerWpm] = useState(0);
  const [computerWpm, setComputerWpm] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typedRef = useRef("");
  const correctCharsRef = useRef(0);
  const spaceCountRef = useRef(0);
  const active = endTime != null && !finished;

  const wordsInPassage = useMemo(() => passage.trim().split(/\s+/).length, [passage]);

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
    }, 150);
    return () => window.clearInterval(id);
  }, [endTime]);

  useEffect(() => {
    if (!active) return;
    const profile = AI_WPM[level];
    const id = window.setInterval(() => {
      const targetWpm = profile.min + Math.random() * (profile.max - profile.min);
      const charsPerSecond = (targetWpm * 5) / 60;
      setComputerChars((value) => {
        const nextChars = Math.min(passage.length, value + charsPerSecond * 0.2);
        if (nextChars >= passage.length) {
          setFinished(true);
          setRemainingSeconds((current) => current ?? 0);
        }
        return nextChars;
      });
      setComputerWpm(targetWpm);
    }, 200);
    return () => window.clearInterval(id);
  }, [active, level, passage.length]);

  const start = () => {
    if (endTime != null) return;
    const now = Date.now();
    setStartTime(now);
    setEndTime(now + durationSeconds * 1000);
    setRemainingSeconds(durationSeconds);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const reset = () => {
    setPassage(pickPassage());
    setTyped("");
    typedRef.current = "";
    correctCharsRef.current = 0;
    spaceCountRef.current = 0;
    setComputerChars(0);
    setPlayerWpm(0);
    setComputerWpm(0);
    setStartTime(null);
    setEndTime(null);
    setRemainingSeconds(null);
    setFinished(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitTyped = (nextTyped: string) => {
    const previousTyped = typedRef.current;
    const limited = nextTyped.slice(0, passage.length);

    if (limited.length > previousTyped.length) {
      const insertedChar = limited[limited.length - 1];
      const insertedIndex = limited.length - 1;
      if (insertedChar === passage[insertedIndex]) {
        correctCharsRef.current += 1;
      }
      if (insertedChar === " " && previousTyped.trim().length > 0 && previousTyped[previousTyped.length - 1] !== " ") {
        spaceCountRef.current += 1;
      }
    } else if (limited.length < previousTyped.length) {
      const removedIndex = previousTyped.length - 1;
      const removedChar = previousTyped[removedIndex];
      if (removedChar === passage[removedIndex]) {
        correctCharsRef.current = Math.max(0, correctCharsRef.current - 1);
      }
      if (removedChar === " " && limited.trim().length > 0) {
        spaceCountRef.current = Math.max(0, spaceCountRef.current - 1);
      }
    }

    typedRef.current = limited;
    setTyped(limited);

    if (startTime) {
      const minutes = (Date.now() - startTime) / 1000 / 60;
      const wordsTyped = limited.trim() ? spaceCountRef.current + 1 : 0;
      setPlayerWpm(minutes > 0 ? wordsTyped / minutes : 0);
    }

    if (limited.length >= passage.length) {
      setFinished(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (finished) return;

    if (event.key === "Backspace") {
      event.preventDefault();
      if (!typedRef.current.length) return;
      commitTyped(typedRef.current.slice(0, -1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      start();
      commitTyped(`${typedRef.current}${event.key}`);
    }
  };

  const playerProgress = Math.max(0, Math.min(1, typed.length / passage.length));
  const computerProgress = Math.max(0, Math.min(1, computerChars / passage.length));

  const accuracy = typed.length ? (correctCharsRef.current / typed.length) * 100 : 0;

  const winner = useMemo(() => {
    if (!finished) return "";
    if (playerProgress > computerProgress) return "You win";
    if (computerProgress > playerProgress) return "Computer wins";
    return "Draw";
  }, [finished, playerProgress, computerProgress]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Paragraph Race</h1>
            <p>Type the same passage faster than the computer. Choose your level and race to the finish.</p>
          </div>
          <nav className="app-nav">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <section className="card">
        <div className="form-row">
          <label>
            Time
            <select value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value) || 30)} disabled={active}>
              {DURATIONS.map((s) => (
                <option key={s} value={s}>
                  {s < 60 ? `${s}s` : `${s / 60} min`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Level
            <select value={level} onChange={(e) => setLevel((e.target.value as Level) || "easy")} disabled={active}>
              {LEVELS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={reset}>
            New race
          </button>
          <span className="hint">
            {remainingSeconds == null ? "Start typing to begin the paragraph race." : `Remaining: ${remainingSeconds}s · Passage: ${wordsInPassage} words`}
          </span>
        </div>
      </section>

      <section className="layout layout-practice-only">
        <div className="card paragraph-race-arena">
          <div className="paragraph-race-scoreboard">
            <div className="paragraph-race-panel is-player">
              <span className="paragraph-race-kicker">You</span>
              <strong>{playerWpm.toFixed(0)} WPM</strong>
              <small>Accuracy {accuracy.toFixed(0)}%</small>
            </div>
            <div className="paragraph-race-panel is-computer">
              <span className="paragraph-race-kicker">Computer</span>
              <strong>{computerWpm.toFixed(0)} WPM</strong>
              <small>Level {level}</small>
            </div>
          </div>

          <div className="paragraph-race-track">
            <div className="paragraph-race-track-row">
              <span>You</span>
              <div className="paragraph-race-bar">
                <div className="is-player" style={{ width: `${playerProgress * 100}%` }} />
              </div>
            </div>
            <div className="paragraph-race-track-row">
              <span>CPU</span>
              <div className="paragraph-race-bar">
                <div className="is-computer" style={{ width: `${computerProgress * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="paragraph-race-passage">
            {passage.split("").map((char, index) => {
              const state =
                index >= typed.length ? "pending" : typed[index] === passage[index] ? "correct" : "wrong";
              return (
                <span key={index} className={`paragraph-race-char ${state}`}>
                  {char}
                </span>
              );
            })}
          </div>

          <textarea
            ref={inputRef}
            className="paragraph-race-input typing-input"
            value={typed}
            onKeyDown={handleKeyDown}
            placeholder="Start typing the paragraph..."
            disabled={finished}
            readOnly
            autoFocus
          />

          {winner && (
            <div className="paragraph-race-result">
              <p>
                <strong>{winner}</strong> · You {playerWpm.toFixed(1)} WPM · Computer {computerWpm.toFixed(1)} WPM
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
