import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PRACTICE_TEXTS } from "./practiceTexts";

const DURATIONS = [30, 60, 120] as const;

const pickPassage = () =>
  PRACTICE_TEXTS[Math.floor(Math.random() * PRACTICE_TEXTS.length)];

export const RacingTypingPage: React.FC = () => {
  const [durationSeconds, setDurationSeconds] = useState<number>(60);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const [currentInput, setCurrentInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [passage, setPassage] = useState<string>(() => pickPassage());
  const currentInputRef = React.useRef("");
  const correctCharsRef = React.useRef(0);
  const spaceCountRef = React.useRef(0);

  const text = useMemo(() => passage, [passage]);

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

  const resetRace = () => {
    setPassage(pickPassage());
    currentInputRef.current = "";
    correctCharsRef.current = 0;
    spaceCountRef.current = 0;
    setCurrentInput("");
    setStartTime(null);
    setEndTime(null);
    setRemainingSeconds(null);
    setFinished(false);
  };

  const commitInput = (nextInput: string) => {
    const previousInput = currentInputRef.current;

    if (nextInput.length > previousInput.length) {
      const insertedChar = nextInput[nextInput.length - 1];
      const insertedIndex = nextInput.length - 1;
      if (insertedChar === text[insertedIndex]) {
        correctCharsRef.current += 1;
      }
      if (insertedChar === " " && previousInput.trim().length > 0 && previousInput[previousInput.length - 1] !== " ") {
        spaceCountRef.current += 1;
      }
    } else if (nextInput.length < previousInput.length) {
      const removedIndex = previousInput.length - 1;
      const removedChar = previousInput[removedIndex];
      if (removedChar === text[removedIndex]) {
        correctCharsRef.current = Math.max(0, correctCharsRef.current - 1);
      }
      if (removedChar === " " && nextInput.trim().length > 0) {
        spaceCountRef.current = Math.max(0, spaceCountRef.current - 1);
      }
    }

    currentInputRef.current = nextInput;
    setCurrentInput(nextInput);

    if (!startTime) {
      const now = Date.now();
      setStartTime(now);
      setEndTime(now + durationSeconds * 1000);
      setRemainingSeconds(durationSeconds);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (finished) return;

    if (event.key === "Backspace") {
      event.preventDefault();
      if (!currentInputRef.current.length) return;
      commitInput(currentInputRef.current.slice(0, -1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      commitInput(`${currentInputRef.current}${event.key}`);
    }
  };

  const wordsTyped = currentInput.trim() ? spaceCountRef.current + 1 : 0;
  const elapsedMinutes =
    startTime != null ? (Date.now() - startTime) / 1000 / 60 : 0;
  const wpm =
    startTime != null && elapsedMinutes > 0 ? wordsTyped / elapsedMinutes : 0;

  const totalChars = Math.max(text.length, currentInput.length || 1);
  const accuracy = (correctCharsRef.current / totalChars) * 100;

  const playerProgress = Math.min(currentInput.length / text.length, 1);
  const ghostSpeed = 55; // ghost target WPM
  const expectedWords = (ghostSpeed * (elapsedMinutes || 0));
  const ghostProgress = Math.min(
    expectedWords / (text.split(/\s+/).length || 1),
    1
  );

  const trackLabel =
    remainingSeconds == null
      ? "Start typing to join the race."
      : `Speed: ${wpm.toFixed(1)} WPM · Accuracy: ${accuracy.toFixed(
          1
        )}% · Time left: ${remainingSeconds}s`;

  const raceResult =
    finished || remainingSeconds === 0
      ? playerProgress > ghostProgress
        ? "You beat the ghost racer!"
        : playerProgress === ghostProgress
          ? "Photo finish — neck and neck!"
          : "The ghost racer was faster this time."
      : "";

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Racing Typing</h1>
            <p>Race your car against a ghost opponent. Speed = WPM, accuracy = control.</p>
          </div>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Landing</Link>
            <Link to="/modes" className="nav-link">Modes</Link>
          </nav>
        </div>
      </header>

      <section className="card">
        <div className="form-row">
          <label>
            Race time
            <select
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value) || 60)}
              disabled={endTime != null && !finished}
            >
              {DURATIONS.map((s) => (
                <option key={s} value={s}>
                  {s < 60 ? `${s}s` : `${s / 60} min`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={resetRace}>
            New race
          </button>
          <span className="hint">{trackLabel}</span>
        </div>
      </section>

      <section className="card racing-track">
        <div className="racing-lane racing-player">
          <div className="racing-label">You</div>
          <div className="racing-road">
            <div
              className="racing-car racing-car-player"
              style={{ left: `${playerProgress * 100}%` }}
            >
              🚗
            </div>
          </div>
        </div>
        <div className="racing-lane racing-ghost">
          <div className="racing-label">Ghost (target {ghostSpeed} WPM)</div>
          <div className="racing-road">
            <div
              className="racing-car racing-car-ghost"
              style={{ left: `${ghostProgress * 100}%` }}
            >
              🚙
            </div>
          </div>
        </div>
        {raceResult && <p className="hint" style={{ marginTop: 10 }}>{raceResult}</p>}
      </section>

      <section className="layout layout-practice-only">
        <div className="card passage-card-monkey">
          <div className="practice-header">
            <span>Race text</span>
          </div>
          <div className="sample-text monkey-line">
            <p className="sample-line">
              {text.split("").map((ch, idx) => {
                const state =
                  idx >= currentInput.length
                    ? "pending"
                    : currentInput[idx] === text[idx]
                      ? "correct"
                      : "wrong";
                return (
                  <span key={idx} className={`sample-char ${state}`}>
                    {ch}
                  </span>
                );
              })}
            </p>
          </div>
          <textarea
            className="typing-input"
            value={currentInput}
            onKeyDown={handleKeyDown}
            placeholder="Type here to drive your car…"
            autoFocus
            disabled={finished}
            readOnly
          />
        </div>
      </section>
    </div>
  );
};

