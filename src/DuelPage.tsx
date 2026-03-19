import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

type PlayerState = {
  username: string;
  progress: number;
  wpm: number;
  finished: boolean;
};

type GameRoom = {
  roomId: string;
  players: Record<string, PlayerState>;
};

const DUEL_DURATIONS = [15, 30, 60, 120] as const;

const DUEL_TEXT =
  "The quick brown fox jumps over the lazy dog. Type this text as fast and as accurately as you can to beat your opponent.";

const BACKEND_HTTP_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://typing-master-backend-production.up.railway.app";

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
};

export const DuelPage: React.FC = () => {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [roomState, setRoomState] = useState<GameRoom | null>(null);
  const [duelDurationSeconds, setDuelDurationSeconds] = useState<number>(60);
  const [duelEndTime, setDuelEndTime] = useState<number | null>(null);
  const [duelRemainingSeconds, setDuelRemainingSeconds] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const clientRef = useRef<Client | null>(null);

  const activeText = DUEL_TEXT;

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

  const myState = useMemo(
    () => (username && roomState ? roomState.players[username] : undefined),
    [roomState, username]
  );

  const typedWordsCount = useMemo(
    () =>
      currentInput.trim().length === 0
        ? 0
        : currentInput.trim().split(/\s+/).length,
    [currentInput]
  );

  const wordsPerLine = useMemo(() => {
    return passageLines.map((line) => line.split(/\s+/).filter(Boolean).length);
  }, [passageLines]);

  const currentLineIndex = useMemo(() => {
    if (wordsPerLine.length === 0) return 0;
    let remaining = typedWordsCount;
    for (let i = 0; i < wordsPerLine.length; i += 1) {
      if (remaining < wordsPerLine[i]) return i;
      remaining -= wordsPerLine[i];
    }
    return wordsPerLine.length - 1;
  }, [typedWordsCount, wordsPerLine]);

  const visibleLines = useMemo(
    () => passageLines.slice(currentLineIndex, currentLineIndex + 3),
    [passageLines, currentLineIndex]
  );

  useEffect(() => {
    if (duelEndTime == null) return;
    const id = window.setInterval(() => {
      const remainingMs = duelEndTime - Date.now();
      if (remainingMs <= 0) {
        setDuelRemainingSeconds(0);
        window.clearInterval(id);
      } else {
        setDuelRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [duelEndTime]);

  useEffect(() => {
    return () => {
      if (clientRef.current?.active) clientRef.current.deactivate();
    };
  }, []);

  const connectAndJoin = () => {
    if (!roomId || !username) {
      alert("Please enter both room ID and username");
      return;
    }
    if (clientRef.current?.active) {
      clientRef.current.publish({
        destination: "/app/room.join",
        body: JSON.stringify({ roomId, username })
      });
      setJoined(true);
      setStartTime(null);
      setCurrentInput("");
      return;
    }
    const sock = new SockJS(`${BACKEND_HTTP_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => sock as unknown as WebSocket,
      reconnectDelay: 5000,
      debug: () => {}
    });
    client.onConnect = () => {
      client.subscribe(`/topic/room.${roomId}`, (message) => {
        setRoomState(JSON.parse(message.body) as GameRoom);
      });
      client.publish({
        destination: "/app/room.join",
        body: JSON.stringify({ roomId, username })
      });
      setJoined(true);
      setStartTime(null);
      setCurrentInput("");
    };
    client.onStompError = (frame) => {
      console.error("STOMP error:", frame.headers["message"], frame.body);
    };
    clientRef.current = client;
    client.activate();
  };

  const sendTypingUpdate = (progress: number, wpm: number, finished: boolean) => {
    if (!clientRef.current?.connected || !roomId || !username) return;
    clientRef.current.publish({
      destination: "/app/room.update",
      body: JSON.stringify({ roomId, username, progress, wpm, finished })
    });
  };

  const handleInputChange = (value: string) => {
    setCurrentInput(value);
    if (!startTime) {
      const now = Date.now();
      setStartTime(now);
      setDuelEndTime(now + duelDurationSeconds * 1000);
      setDuelRemainingSeconds(duelDurationSeconds);
      setFocusMode(true);
    }
    const progress = Math.min(value.length / activeText.length, 1);
    let wpm = 0;
    if (startTime) {
      const minutes = (Date.now() - startTime) / 1000 / 60;
      const wordsTyped = value.trim().split(/\s+/).length;
      wpm = minutes > 0 ? wordsTyped / minutes : 0;
    }
    sendTypingUpdate(progress, wpm, progress >= 1);
  };

  const opponentStates = useMemo(() => {
    if (!roomState) return [];
    return Object.values(roomState.players).filter((p) => p.username !== username);
  }, [roomState, username]);

  const resetDuel = () => {
    setCurrentInput("");
    setStartTime(null);
    setDuelEndTime(null);
    setDuelRemainingSeconds(null);
    setFocusMode(false);
  };

  const duelTimeLabel =
    duelRemainingSeconds != null ? `${duelRemainingSeconds}s` : `${duelDurationSeconds}s`;

  if (focusMode) {
    const progress = myState?.progress ?? 0;
    return (
      <div className="duel-focus-screen">
        <div className="duel-focus-inner">
          <div className="duel-focus-top">
            <span className="duel-focus-room">Room: {roomId || "—"}</span>
            <span className="duel-focus-timer">{duelTimeLabel}</span>
          </div>
          <div className="duel-focus-text">
            {visibleLines.map((line, idx) => {
              const lineIndex = currentLineIndex + idx;
              const startChar = lineStartCharIndices[lineIndex] ?? 0;
              return (
                <p
                  key={`${lineIndex}`}
                  className={idx === 0 ? "sample-line current" : "sample-line"}
                >
                  {line.split("").map((char, charIdx) => {
                    const globalIdx = startChar + charIdx;
                    const state =
                      globalIdx >= currentInput.length
                        ? "pending"
                        : currentInput[globalIdx] === activeText[globalIdx]
                          ? "correct"
                          : "wrong";
                    return (
                      <span
                        key={`${lineIndex}-${charIdx}`}
                        className={`sample-char ${state}`}
                      >
                        {char}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>
          <textarea
            className="typing-input duel-focus-input"
            value={currentInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={joined ? "Start typing..." : "Join a room first."}
            disabled={!joined}
            autoFocus
          />
          <div className="duel-focus-bottom">
            <span>Progress: {(progress * 100).toFixed(0)}%</span>
            <button type="button" className="mode-button" onClick={resetDuel}>
              Exit focus mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <h1>Realtime duel</h1>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="card">
        <h2>Room & Player</h2>
        <div className="form-row">
          <label>
            Room ID
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.trim())}
              placeholder="e.g. room-123"
            />
          </label>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              placeholder="Your name"
            />
          </label>
          <label>
            Duel time
            <select
              value={duelDurationSeconds}
              onChange={(e) => setDuelDurationSeconds(Number(e.target.value) || 60)}
            >
              {DUEL_DURATIONS.map((s) => (
                <option key={s} value={s}>
                  {s < 60 ? `${s}s` : `${s / 60} min`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={connectAndJoin}>
            {joined ? "Re-join room" : "Join room"}
          </button>
        </div>
        <p className="hint">
          Both players use the same room ID and choose the same duel time. When you start typing,
          the screen will switch to a distraction-free mode.
        </p>
      </section>

      <section className="layout">
        <div className="card passage-card">
          <h2>Passage</h2>
          <div className="sample-text">
            {visibleLines.map((line, idx) => {
              const lineIndex = currentLineIndex + idx;
              const startChar = lineStartCharIndices[lineIndex] ?? 0;
              return (
                <p
                  key={`${lineIndex}`}
                  className={idx === 0 ? "sample-line current" : "sample-line"}
                >
                  {line.split("").map((char, charIdx) => {
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
            className="typing-input"
            value={currentInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={joined ? "Start typing..." : "Join a room first."}
            disabled={!joined}
          />
        </div>
        <div className="card">
          <h2>Live status</h2>
          <div className="status-section">
            <h3>You</h3>
            <ProgressBar progress={myState?.progress ?? 0} />
            <div className="stats-row">
              <span>WPM: {myState?.wpm.toFixed(1) ?? "0.0"}</span>
              <span>Progress: {((myState?.progress ?? 0) * 100).toFixed(0)}%</span>
              <span>{myState?.finished ? "Finished!" : joined ? "Racing..." : "—"}</span>
            </div>
          </div>
          <div className="status-section">
            <h3>Opponents</h3>
            {opponentStates.length === 0 && (
              <p className="hint">Waiting for someone else to join…</p>
            )}
            {opponentStates.map((p) => (
              <div key={p.username} className="opponent-card">
                <div className="opponent-header">
                  <strong>{p.username}</strong>
                  <span>{p.finished ? "Finished" : "Typing…"}</span>
                </div>
                <ProgressBar progress={p.progress} />
                <div className="stats-row small">
                  <span>WPM: {p.wpm.toFixed(1)}</span>
                  <span>Progress: {(p.progress * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <Link to="/" className="nav-link">Home</Link>
      </footer>
    </div>
  );
};
