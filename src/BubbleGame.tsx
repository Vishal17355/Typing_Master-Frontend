import React, { useCallback, useEffect, useRef, useState } from "react";

const COLS = 8;
const ROWS = 6;
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

const randomChar = () => LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));

type BubbleGameProps = {
  terminal?: boolean;
};

export const BubbleGame: React.FC<BubbleGameProps> = ({ terminal = false }) => {
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
        const next = prev.map((b) => (b.id === bubble.id ? { ...b, popping: true } : b));
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
        const occupiedCols = new Set(prev.filter((b) => !b.popping && b.row > ROWS - 1.5).map((b) => b.col));
        const availableCols = Array.from({ length: COLS }, (_, i) => i).filter((c) => !occupiedCols.has(c));
        if (availableCols.length === 0) return prev;
        const col = availableCols[Math.floor(Math.random() * availableCols.length)];

        return [...prev, { id, char: randomChar(), col, row: ROWS - 0.5, popping: false }];
      });
    };
    const intervalId = window.setInterval(spawn, SPAWN_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const tick = () => {
      setBubbles((prev) =>
        prev
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
          })
      );
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

  if (!terminal) {
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
          <p className="hint">Bubbles rise from the bottom. Type the letter to pop it. Miss 20 and you lose.</p>
        </div>
        <div className="bubble-layout">
          <div className="bubble-arena-wrap">
            <div className="bubble-miss-bar">
              Misses: {misses} / {MISS_LIMIT}
            </div>
            <div ref={arenaRef} className="bubble-arena" tabIndex={0} role="application">
              {bubbles.map((bubble) => {
                const leftPct = ((bubble.col + 0.5) / COLS) * 100;
                const topPct = (bubble.row / ROWS) * 100;
                return (
                  <div
                    key={bubble.id}
                    className={`bubble ${bubble.popping ? "bubble-blast" : ""}`}
                    style={{ left: `${leftPct}%`, top: `${topPct}%` }}
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
            <p className="hint">Type the letter on your keyboard to pop the bubble before it reaches the top.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bubble-terminal-widget">
      <div className="bubble-terminal-layout">
        <div className="bubble-terminal-stage">
          <div className="bubble-terminal-hud top-left">
            <span>GRID_REF: X77_Y02</span>
            <span>CONTAINMENT_STATUS: {gameOver ? "FAILED" : "STABLE"}</span>
          </div>
          <div className="bubble-terminal-hud bottom-right">
            <span>FLUID_DYNAMICS: SIMULATED</span>
            <span>REF_NULL: 0x0021FF</span>
          </div>
          <div className="bubble-threshold">
            <span>THRESHOLD_CRITICAL</span>
          </div>
          <div ref={arenaRef} className="bubble-terminal-arena" tabIndex={0} role="application">
            {bubbles.map((bubble) => {
              const leftPct = ((bubble.col + 0.5) / COLS) * 100;
              const topPct = (bubble.row / ROWS) * 100;
              return (
                <div
                  key={bubble.id}
                  className={`bubble-terminal-core ${bubble.popping ? "bubble-blast" : ""}`}
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <span>{bubble.char}</span>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="bubble-terminal-stats">
          <div className="bubble-stat-card">
            <p>CORES_POPPED</p>
            <div>
              <strong>{popped}</strong>
              <span>+12.4%</span>
            </div>
          </div>
          <div className="bubble-stat-card">
            <p>MISS_DENSITY</p>
            <div>
              <strong>{(misses / Math.max(popped + misses, 1)).toFixed(2)}</strong>
              <span>P_VAL: 0.001</span>
            </div>
          </div>
          <div className="bubble-integrity">
            <div>
              <p>SYSTEM_INTEGRITY</p>
              <strong>{Math.max(0, 100 - (misses / MISS_LIMIT) * 100).toFixed(0)}%</strong>
            </div>
            <div className="bubble-integrity-bar">
              <div style={{ width: `${Math.max(0, 100 - (misses / MISS_LIMIT) * 100)}%` }} />
            </div>
          </div>
          <div className="bubble-terminal-note">
            Type the letter on your keyboard before the core reaches the threshold. Integrity failure occurs upon breach.
          </div>
          <div className="bubble-terminal-log">
            <span>&gt; CORE_ID: 0x99_SPAWNED</span>
            <span>&gt; INPUT_BUFFER: READ_SUCCESS</span>
            <span className="is-primary">&gt; NEUTRALIZATION_COMPLETE [{(Math.random() * 0.6 + 0.2).toFixed(2)}s]</span>
            <span>&gt; MONITORING_SYNC...</span>
          </div>
          {gameOver && (
            <button type="button" className="bubble-terminal-restart" onClick={restart}>
              RESTART_SESSION
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};
