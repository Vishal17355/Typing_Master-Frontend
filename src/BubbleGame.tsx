import React, { useCallback, useEffect, useRef, useState } from "react";

const COLS = 8;
const ROWS = 6;
const ROW_HEIGHT = 1;
const MOVE_SPEED = 0.016;
const SPAWN_INTERVAL_MS = 950;
const MISS_LIMIT = 20;

type Bubble = {
  id: number;
  char: string;
  col: number;
  row: number;
  popping?: boolean;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const randomChar = () =>
  LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));

export const BubbleGame: React.FC = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popped, setPopped] = useState(0);
  const [misses, setMisses] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const idRef = useRef(0);
  const arenaRef = useRef<HTMLDivElement>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (gameOver) return;
      const key = e.key?.toUpperCase();
      if (!key || key.length !== 1 || !/^[A-Z]$/.test(key)) return;
      e.preventDefault();
      setBubbles((prev) => {
        const idx = prev.findIndex((b) => b.char === key);
        if (idx === -1) return prev;
        const bubble = prev[idx];
        const next = prev.map((b) =>
          b.id === bubble.id ? { ...b, popping: true } : b
        );
        window.setTimeout(() => {
          setBubbles((p) => p.filter((b) => b.id !== bubble.id));
          setPopped((n) => n + 1);
        }, 180);
        return next;
      });
    },
    [gameOver]
  );

  useEffect(() => {
    if (!arenaRef.current) return;
    const el = arenaRef.current;
    el.tabIndex = 0;
    el.focus();
    el.addEventListener("keydown", handleKey);
    return () => el.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (gameOver) return;
    const spawn = () => {
      idRef.current += 1;
      const id = idRef.current;

      setBubbles((prev) => {
        // Avoid spawning a new bubble directly on top of another one
        // by picking a column that does not already have a bubble
        // near the bottom of the arena.
        const occupiedCols = new Set(
          prev
            .filter((b) => !b.popping && b.row > ROWS - 1.5)
            .map((b) => b.col)
        );

        const availableCols = Array.from({ length: COLS }, (_, i) => i).filter(
          (c) => !occupiedCols.has(c)
        );

        if (availableCols.length === 0) {
          // Skip this spawn tick to prevent overlapping letters.
          return prev;
        }

        const col =
          availableCols[Math.floor(Math.random() * availableCols.length)];

        return [
          ...prev,
          {
            id,
            char: randomChar(),
            col,
            row: ROWS - 0.5,
            popping: false
          }
        ];
      });
    };
    const intervalId = window.setInterval(spawn, SPAWN_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const tick = () => {
      setBubbles((prev) => {
        const next = prev
          .map((b) => (b.popping ? b : { ...b, row: b.row - MOVE_SPEED }))
          .filter((b) => {
            if (b.popping) return true;
            if (b.row < 0) {
              setMisses((m) => {
                const nextMiss = m + 1;
                if (nextMiss >= MISS_LIMIT) setGameOver(true);
                return nextMiss;
              });
              return false;
            }
            return true;
          });
        return next;
      });
    };
    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [gameOver]);

  const restart = useCallback(() => {
    setBubbles([]);
    setPopped(0);
    setMisses(0);
    setGameOver(false);
    if (arenaRef.current) arenaRef.current.focus();
  }, []);

  if (gameOver) {
    return (
      <div className="bubble-game">
        <div className="bubble-header">
          <h2>Letter bubble game</h2>
        </div>
        <div className="bubble-game-over card">
          <h3>Game over</h3>
          <p className="hint">You missed 20 bubbles. They stacked to the top.</p>
          <div className="stats-row">
            <span>Popped: {popped}</span>
            <span>Missed: {misses}</span>
          </div>
          <button type="button" className="mode-button active" onClick={restart}>
            Play again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bubble-game">
      <div className="bubble-header">
        <h2>Letter bubble game</h2>
        <p className="hint">
          Bubbles rise from the bottom. Type the letter to pop it. Miss 20 and you lose.
        </p>
      </div>

      <div className="bubble-layout">
        <div className="bubble-arena-wrap">
          <div className="bubble-miss-bar">
            Misses: {misses} / {MISS_LIMIT}
          </div>
          <div
            ref={arenaRef}
            className="bubble-arena"
            tabIndex={0}
            role="application"
            aria-label="Letter bubbles - type a letter to pop it"
          >
            {bubbles.map((bubble) => {
              const leftPct = ((bubble.col + 0.5) / COLS) * 100;
              const topPct = (bubble.row / ROWS) * 100;
              return (
                <div
                  key={bubble.id}
                  className={`bubble ${bubble.popping ? "bubble-blast" : ""}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`
                  }}
                >
                  {bubble.char}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card bubble-stats">
          <h3>Stats</h3>
          <div className="stats-row">
            <span>Popped: {popped}</span>
            <span>Misses: {misses}</span>
          </div>
          <p className="hint">
            Type the letter on your keyboard to pop the bubble before it reaches the top.
          </p>
        </div>
      </div>
    </div>
  );
};
