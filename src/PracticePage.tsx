import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PRACTICE_TEXTS } from "./practiceTexts";

const PRACTICE_RESULTS_STORAGE_KEY = "typing-practice-results";

type PassageLine = {
  text: string;
  start: number;
  end: number;
};

type PracticeLevel = "easy" | "medium" | "hard";
type PracticeResult = {
  id: string;
  timestamp: string;
  durationSeconds: number;
  wpm: number;
  accuracy: number;
  charactersTyped: number;
  textSample: string;
};

const PRACTICE_LINE_LENGTH = 68;
const PRACTICE_VISIBLE_LINES = 3;
const PRACTICE_DURATIONS = [15, 30, 60, 120];
const PRACTICE_LEVELS: PracticeLevel[] = ["easy", "medium", "hard"];

const stripPunctuation = (text: string) => text.replace(/[.,!?;:()"'-]/g, "");

const toMixedCase = (text: string) => {
  let letterIndex = 0;
  return text
    .split("")
    .map((char) => {
      if (!/[a-z]/i.test(char)) return char;
      const next = letterIndex % 3 === 0 ? char.toUpperCase() : char.toLowerCase();
      letterIndex += 1;
      return next;
    })
    .join("");
};

const transformPassageForLevel = (text: string, level: PracticeLevel) => {
  if (level === "easy") {
    return stripPunctuation(text).toLowerCase();
  }

  if (level === "medium") {
    return toMixedCase(stripPunctuation(text).toLowerCase());
  }

  return text;
};

const readPracticeResults = (): PracticeResult[] => {
  try {
    const existingRaw = window.localStorage.getItem(PRACTICE_RESULTS_STORAGE_KEY);
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch {
    return [];
  }
};

const buildPracticeLines = (text: string, targetLength: number): PassageLine[] => {
  const words = text.split(" ");
  const lines: PassageLine[] = [];
  let currentWords: string[] = [];
  let currentLength = 0;
  let cursor = 0;

  const pushLine = () => {
    if (currentWords.length === 0) return;
    let lineText = currentWords.join(" ");
    if (cursor + lineText.length < text.length && text[cursor + lineText.length] === " ") {
      lineText += " ";
    }
    lines.push({
      text: lineText,
      start: cursor,
      end: cursor + lineText.length,
    });
    cursor += lineText.length;
    currentWords = [];
    currentLength = 0;
  };

  words.forEach((word) => {
    const nextLength = currentWords.length === 0 ? word.length : currentLength + 1 + word.length;
    if (currentWords.length > 0 && nextLength > targetLength) {
      pushLine();
    }
    currentWords.push(word);
    currentLength = currentWords.length === 1 ? word.length : currentLength + 1 + word.length;
  });

  pushLine();
  return lines;
};

export const PracticePage: React.FC = () => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceDurationSeconds, setPracticeDurationSeconds] = useState(30);
  const [practiceLevel, setPracticeLevel] = useState<PracticeLevel>("easy");
  const [showLevelOptions, setShowLevelOptions] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [practiceEndTime, setPracticeEndTime] = useState<number | null>(null);
  const [practiceRemainingSeconds, setPracticeRemainingSeconds] = useState<number | null>(null);
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [practiceSaved, setPracticeSaved] = useState(false);
  const [historyResults, setHistoryResults] = useState<PracticeResult[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [startCountdown, setStartCountdown] = useState(3);

  const practicePassage = useMemo(() => {
    const rotated = [...PRACTICE_TEXTS.slice(practiceIndex), ...PRACTICE_TEXTS.slice(0, practiceIndex)];
    return transformPassageForLevel(`${rotated.join(" ")} ${rotated.join(" ")}`, practiceLevel);
  }, [practiceIndex, practiceLevel]);

  const practiceLines = useMemo(
    () => buildPracticeLines(practicePassage, PRACTICE_LINE_LENGTH),
    [practicePassage]
  );

  const activeLineIndex = useMemo(() => {
    const typedIndex = Math.min(currentInput.length, Math.max(0, practicePassage.length - 1));
    const foundIndex = practiceLines.findIndex((line) => typedIndex < line.end);
    return foundIndex === -1 ? Math.max(0, practiceLines.length - 1) : foundIndex;
  }, [currentInput.length, practiceLines, practicePassage.length]);

  const visibleLineStart = Math.min(
    activeLineIndex,
    Math.max(0, practiceLines.length - PRACTICE_VISIBLE_LINES)
  );
  const visibleLines = useMemo(
    () => practiceLines.slice(visibleLineStart, visibleLineStart + PRACTICE_VISIBLE_LINES),
    [practiceLines, visibleLineStart]
  );

  const activeWordRange = useMemo(() => {
    const cursorIndex = Math.min(currentInput.length, practicePassage.length);
    let start = cursorIndex;
    while (start > 0 && practicePassage[start - 1] !== " ") {
      start -= 1;
    }
    let end = cursorIndex;
    while (end < practicePassage.length && practicePassage[end] !== " ") {
      end += 1;
    }
    return { start, end };
  }, [currentInput.length, practicePassage]);

  const wordsTyped = useMemo(
    () => (currentInput.trim() ? currentInput.trim().split(/\s+/).length : 0),
    [currentInput]
  );

  const liveWpm = useMemo(() => {
    if (!startTime || wordsTyped === 0) return 0;
    const minutes = (Date.now() - startTime) / 1000 / 60;
    return minutes > 0 ? wordsTyped / minutes : 0;
  }, [startTime, wordsTyped, currentInput]);

  const accuracy = useMemo(() => {
    if (!currentInput.length) return 0;
    let correct = 0;
    const maxLen = Math.max(practicePassage.length, currentInput.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (currentInput[i] === practicePassage[i]) correct += 1;
    }
    return (correct / maxLen) * 100;
  }, [currentInput, practicePassage]);

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
    const wpm = minutes > 0 ? wordsTyped / minutes : 0;
    const result: PracticeResult = {
      id: `${now.getTime()}`,
      timestamp: now.toISOString(),
      durationSeconds: practiceDurationSeconds,
      wpm,
      accuracy,
      charactersTyped: currentInput.length,
      textSample: practicePassage.slice(0, 200),
    };
    try {
      const existing = readPracticeResults();
      window.localStorage.setItem(
        PRACTICE_RESULTS_STORAGE_KEY,
        JSON.stringify([result, ...existing].slice(0, 50))
      );
      setHistoryResults([result, ...existing].slice(0, 12));
    } catch {
      /* ignore */
    }
    setPracticeSaved(true);
  }, [practiceFinished, practiceSaved, practiceDurationSeconds, accuracy, currentInput.length, practicePassage, wordsTyped]);

  useEffect(() => {
    setHistoryResults(readPracticeResults().slice(0, 12));
  }, []);

  useEffect(() => {
    if (startCountdown <= 0) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStartCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [startCountdown]);

  const handleInputChange = (value: string) => {
    if (practiceFinished || startCountdown > 0) return;
    setCurrentInput(value);
    if (!startTime) {
      const now = Date.now();
      setStartTime(now);
      setPracticeEndTime(now + practiceDurationSeconds * 1000);
      setPracticeRemainingSeconds(practiceDurationSeconds);
    }
  };

  const resetPractice = (rotatePassage = true) => {
    setCurrentInput("");
    setStartTime(null);
    setPracticeEndTime(null);
    setPracticeRemainingSeconds(null);
    setPracticeFinished(false);
    setPracticeSaved(false);
    setStartCountdown(3);
    if (rotatePassage) {
      setPracticeIndex((value) => (value + 1) % PRACTICE_TEXTS.length);
    }
  };

  const handleDurationSelect = (duration: number) => {
    if (duration === practiceDurationSeconds) return;
    setPracticeDurationSeconds(duration);
    setShowTimeOptions(false);
    resetPractice(false);
  };

  const handleLevelSelect = (level: PracticeLevel) => {
    if (level === practiceLevel) return;
    setPracticeLevel(level);
    setShowLevelOptions(false);
    resetPractice(false);
  };

  const errors = Math.max(
    0,
    currentInput.length - Math.round((accuracy / 100) * currentInput.length)
  );
  const remainingSecondsDisplay = practiceRemainingSeconds ?? practiceDurationSeconds;
  const timerProgress = Math.max(0, Math.min(1, remainingSecondsDisplay / practiceDurationSeconds));
  const latestResults = historyResults.slice(0, 8).reverse();
  const peakWpm = latestResults.reduce((max, item) => Math.max(max, item.wpm), 1);
  const previousResults = historyResults.slice(1, 6);
  const previousAverageWpm =
    previousResults.length > 0
      ? previousResults.reduce((sum, item) => sum + item.wpm, 0) / previousResults.length
      : liveWpm;
  const speedDelta = liveWpm - previousAverageWpm;

  return (
    <div className="practice-simple-page">
      {startCountdown > 0 && (
        <div className="practice-start-overlay" aria-live="polite">
          <div className="practice-start-countdown">
            <span>get ready</span>
            <strong>{startCountdown}</strong>
          </div>
        </div>
      )}
      <header className="practice-simple-topbar">
        <div className="practice-simple-topbar-left">
          <Link to="/modes" className="practice-simple-back">
            <span>&lt;</span>
            <span>back</span>
          </Link>
          <div className="practice-simple-heading">
            <span className="practice-simple-kicker">solo practice</span>
            <strong>Precision Session</strong>
          </div>
        </div>
        <div className="practice-simple-topbar-center">
          <div
            className="practice-simple-timer"
            style={
              {
                "--timer-progress": `${timerProgress}`,
              } as React.CSSProperties
            }
          >
            <div className="practice-simple-timer-inner">
              <strong>{String(remainingSecondsDisplay).padStart(2, "0")}</strong>
            </div>
          </div>
        </div>
        <div className="practice-simple-stats">
          <div className="practice-simple-stat-chip">
            <span>wpm</span>
            <strong>{liveWpm.toFixed(0)}</strong>
          </div>
          <div className="practice-simple-stat-chip">
            <span>accuracy</span>
            <strong>{accuracy.toFixed(0)}%</strong>
          </div>
        </div>
      </header>

      <main className="practice-simple-main">
        <section className="practice-simple-toolbar">
          <div className={`practice-simple-levels${showLevelOptions ? " is-open" : ""}`}>
            <button
              type="button"
              className="practice-simple-level-trigger"
              onClick={() => setShowLevelOptions((value) => !value)}
            >
              level
            </button>
            {showLevelOptions && (
              <div className="practice-simple-level-menu">
                {PRACTICE_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={practiceLevel === level ? "is-active" : ""}
                    onClick={() => handleLevelSelect(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={`practice-simple-times${showTimeOptions ? " is-open" : ""}`}>
            <button
              type="button"
              className="practice-simple-time-trigger"
              onClick={() => setShowTimeOptions((value) => !value)}
            >
              time
            </button>
            {showTimeOptions && (
              <div className="practice-simple-time-menu">
                {PRACTICE_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    className={practiceDurationSeconds === duration ? "is-active" : ""}
                    onClick={() => handleDurationSelect(duration)}
                  >
                    {duration}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="practice-simple-link" onClick={() => resetPractice()}>
            restart
          </button>
        </section>

        <section className="practice-simple-stage">
          <div
            className="practice-simple-copy"
            onClick={() => inputRef.current?.focus()}
            role="presentation"
          >
            <div className="kinetic-engine-copy-track">
              {visibleLines.map((line, visibleIndex) => {
                const lineIndex = visibleLineStart + visibleIndex;
                return (
                <div
                  key={`${line.start}-${line.end}`}
                  className={`practice-simple-line${lineIndex === activeLineIndex ? " is-active" : ""}`}
                >
                  {line.text.split("").map((char, charIndex) => {
                    const index = line.start + charIndex;
                    let state = "pending";
                    if (index < currentInput.length) {
                      state = currentInput[index] === practicePassage[index] ? "correct" : "wrong";
                    }
                    const isFocusedWord = index >= activeWordRange.start && index < activeWordRange.end;
                    const isSpace = char === " ";
                    const isCaretStart = currentInput.length === 0 && index === 0;
                    const isCaretBeforeChar =
                      currentInput.length > 0 &&
                      currentInput[currentInput.length - 1] === " " &&
                      index === currentInput.length;
                    const isCaretAnchor =
                      currentInput.length > 0 &&
                      currentInput[currentInput.length - 1] !== " " &&
                      index === currentInput.length - 1;
                    const className = [
                      "practice-simple-char",
                      state,
                      isFocusedWord ? "focus-word" : "",
                      isCaretStart ? "caret-start" : "",
                      isCaretBeforeChar ? "caret-before-char" : "",
                      isCaretAnchor ? "caret-anchor" : "",
                      isSpace ? "is-space" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <span key={index} className={className}>
                        {char}
                      </span>
                    );
                  })}
                </div>
              )})}
            </div>

            <textarea
              ref={inputRef}
              className="practice-simple-input"
              value={currentInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Start typing"
              disabled={practiceFinished}
              autoFocus
              spellCheck={false}
            />
          </div>
        </section>

        {practiceFinished ? (
          <section className="practice-dashboard">
            <div className="practice-dashboard-head">
              <div>
                <span className="practice-dashboard-kicker">session complete</span>
                <h2>Solo Practice Report</h2>
              </div>
              <button type="button" className="practice-simple-link" onClick={() => resetPractice()}>
                restart test
              </button>
            </div>

            <div className="practice-dashboard-grid">
              <article className="practice-dashboard-card">
                <span>speed</span>
                <strong>{liveWpm.toFixed(1)} wpm</strong>
                <small>{speedDelta >= 0 ? "+" : ""}{speedDelta.toFixed(1)} vs recent avg</small>
              </article>
              <article className="practice-dashboard-card">
                <span>accuracy</span>
                <strong>{accuracy.toFixed(1)}%</strong>
                <small>{currentInput.length - errors} correct chars</small>
              </article>
              <article className="practice-dashboard-card">
                <span>mistakes</span>
                <strong>{errors}</strong>
                <small>{currentInput.length} chars typed</small>
              </article>
              <article className="practice-dashboard-card">
                <span>difficulty</span>
                <strong>{practiceLevel}</strong>
                <small>{practiceDurationSeconds}s session</small>
              </article>
            </div>

            <div className="practice-dashboard-chart">
              <div className="practice-dashboard-chart-head">
                <span>recent speed history</span>
                <small>saved WPM comparison</small>
              </div>
              <div className="practice-dashboard-bars">
                {latestResults.map((result) => (
                  <div key={result.id} className="practice-dashboard-bar-wrap">
                    <span
                      className="practice-dashboard-bar"
                      style={{ height: `${Math.max(16, (result.wpm / peakWpm) * 100)}%` }}
                      title={`${result.wpm.toFixed(1)} WPM`}
                    />
                    <small>{Math.round(result.wpm)}</small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <footer className="practice-simple-footer">
            <button type="button" className="practice-simple-link" onClick={() => resetPractice()}>
              new passage
            </button>
            <div>
              typed {currentInput.length} chars | errors {errors}
            </div>
          </footer>
        )}
      </main>
    </div>
  );
};
