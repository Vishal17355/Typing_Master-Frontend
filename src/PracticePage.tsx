import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PRACTICE_TEXTS } from "./practiceTexts";

const PRACTICE_RESULTS_STORAGE_KEY = "typing-practice-results";
const MIN_PRACTICE_SECONDS = 15;
const MAX_PRACTICE_SECONDS = 120;

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
};

export const PracticePage: React.FC = () => {
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceDurationSeconds, setPracticeDurationSeconds] = useState(60);
  const [practiceEndTime, setPracticeEndTime] = useState<number | null>(null);
  const [practiceRemainingSeconds, setPracticeRemainingSeconds] = useState<number | null>(null);
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [practiceSaved, setPracticeSaved] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);

  const practicePassage = useMemo(() => {
    const rotated = [
      ...PRACTICE_TEXTS.slice(practiceIndex),
      ...PRACTICE_TEXTS.slice(0, practiceIndex)
    ];
    return `${rotated.join(" ")} ${rotated.join(" ")}`;
  }, [practiceIndex]);

  const activeText = practicePassage;

  const { passageLines, lineStartCharIndices } = useMemo(() => {
    const words = activeText.split(/\s+/).filter(Boolean);
    const maxWordsPerLine = 8;
    const lines: string[] = [];
    const charStarts: number[] = [];
    let cursor = 0;
    let charOffset = 0;
    while (cursor < words.length) {
      charStarts.push(charOffset);
      const slice = words.slice(cursor, cursor + maxWordsPerLine);
      const lineStr = slice.join(" ");
      lines.push(lineStr);
      charOffset += lineStr.length;
      cursor += slice.length;
    }
    return { passageLines: lines, lineStartCharIndices: charStarts };
  }, [activeText]);

  const practiceLineIndex = useMemo(() => {
    const len = currentInput.length;
    for (let i = 0; i < passageLines.length; i += 1) {
      const lineEnd = (lineStartCharIndices[i] ?? 0) + passageLines[i].length;
      if (len < lineEnd) return i;
    }
    return Math.max(0, passageLines.length - 1);
  }, [currentInput.length, passageLines, lineStartCharIndices]);

  const practiceVisibleLines = useMemo(
    () => passageLines.slice(practiceLineIndex, practiceLineIndex + 3),
    [passageLines, practiceLineIndex]
  );

  const calculateAccuracy = () => {
    if (!currentInput.length) return 0;
    let correct = 0;
    const maxLen = Math.max(activeText.length, currentInput.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (currentInput[i] === activeText[i]) correct += 1;
    }
    return (correct / maxLen) * 100;
  };

  const currentAccuracy = practiceFinished ? calculateAccuracy() : 0;

  useEffect(() => {
    if (practiceEndTime == null) return;
    const id = window.setInterval(() => {
      const remainingMs = practiceEndTime - Date.now();
      if (remainingMs <= 0) {
        setPracticeRemainingSeconds(0);
        setPracticeFinished(true);
        setPracticeSaved(false);
        window.clearInterval(id);
      } else {
        setPracticeRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [practiceEndTime]);

  useEffect(() => {
    if (!practiceFinished || practiceSaved) return;
    const now = new Date();
    const minutes = practiceDurationSeconds / 60;
    const wordsTyped = currentInput.trim() ? currentInput.trim().split(/\s+/).length : 0;
    const wpm = minutes > 0 ? wordsTyped / minutes : 0;
    const result = {
      id: `${now.getTime()}`,
      timestamp: now.toISOString(),
      durationSeconds: practiceDurationSeconds,
      wpm,
      accuracy: currentAccuracy,
      charactersTyped: currentInput.length,
      textSample: activeText.slice(0, 200)
    };
    try {
      const existingRaw = window.localStorage.getItem(PRACTICE_RESULTS_STORAGE_KEY);
      const existing: typeof result[] = existingRaw ? JSON.parse(existingRaw) : [];
      window.localStorage.setItem(PRACTICE_RESULTS_STORAGE_KEY, JSON.stringify([result, ...existing].slice(0, 50)));
    } catch {
      /* ignore */
    }
    setPracticeSaved(true);
  }, [practiceFinished, practiceSaved, practiceDurationSeconds, currentAccuracy, currentInput.length, activeText]);

  const handleInputChange = (value: string) => {
    if (practiceFinished) return;
    setCurrentInput(value);
    if (!startTime) {
      setStartTime(Date.now());
      setPracticeEndTime(Date.now() + practiceDurationSeconds * 1000);
      setPracticeRemainingSeconds(practiceDurationSeconds);
    }
  };

  const resetPractice = () => {
    setCurrentInput("");
    setStartTime(null);
    setPracticeEndTime(null);
    setPracticeRemainingSeconds(null);
    setPracticeFinished(false);
    setPracticeSaved(false);
  };

  const isPracticeActive = !practiceFinished;

  return (
    <div className="app-root">
      {isPracticeActive ? (
        <div className="practice-screen">
          <div className="practice-screen-bar">
            <span>
              Time:{" "}
              <select
                value={practiceDurationSeconds}
                onChange={(e) =>
                  setPracticeDurationSeconds(
                    Math.min(MAX_PRACTICE_SECONDS, Math.max(MIN_PRACTICE_SECONDS, Number(e.target.value) || 60))
                  )
                }
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
                <option value={120}>120s</option>
              </select>
              {practiceRemainingSeconds != null && (
                <span className="practice-remaining"> · {practiceRemainingSeconds}s</span>
              )}
            </span>
            <Link to="/" className="mode-button" style={{ textDecoration: "none" }}>
              Back to home
            </Link>
          </div>
          <div className="practice-lines">
            {practiceVisibleLines.map((line, idx) => {
              const lineIndex = practiceLineIndex + idx;
              const lineStr = line;
              const startChar = lineStartCharIndices[lineIndex] ?? 0;
              return (
                <p key={`pract-${lineIndex}`} className="practice-line">
                  {lineStr.split("").map((char, charIdx) => {
                    const globalIdx = startChar + charIdx;
                    const state =
                      globalIdx >= currentInput.length
                        ? "pending"
                        : currentInput[globalIdx] === activeText[globalIdx]
                          ? "correct"
                          : "wrong";
                    return (
                      <span key={`${lineIndex}-${charIdx}`} className={`sample-char ${state}`}>
                        {char}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>
          <textarea
            className="typing-input practice-input"
            value={currentInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Start typing..."
            disabled={practiceFinished}
            autoFocus
          />
        </div>
      ) : (
        <>
          <header className="app-header">
            <div className="app-header-top">
              <h1>Solo practice — Result</h1>
              <nav className="app-nav">
                <Link to="/" className="nav-link">Home</Link>
                <Link to="/practice" className="nav-link">Practice again</Link>
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
              </nav>
            </div>
          </header>
          <section className="layout">
            <div className="card">
              <h2>Your result</h2>
              <div className="status-section">
                <ProgressBar progress={currentInput.length / activeText.length} />
                <div className="stats-row">
                  <span>
                    WPM:{" "}
                    {startTime && currentInput.length
                      ? (
                          (currentInput.trim().split(/\s+/).length /
                            ((Date.now() - startTime) / 1000 / 60))
                        ).toFixed(1)
                      : "0.0"}
                  </span>
                  <span>Progress: {((currentInput.length / activeText.length) * 100).toFixed(0)}%</span>
                  <span>Accuracy: {currentAccuracy.toFixed(1)}%</span>
                </div>
              </div>
              <button type="button" className="mode-button active" onClick={() => { resetPractice(); }}>
                New test
              </button>
            </div>
          </section>
          <footer className="footer">
            <Link to="/" className="nav-link">Home</Link>
          </footer>
        </>
      )}
    </div>
  );
};
