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
  const clientRef = useRef<Client | null>(null);

  const activeText = DUEL_TEXT;

  const myState = useMemo(
    () => (username && roomState ? roomState.players[username] : undefined),
    [roomState, username]
  );

  const progress = myState?.progress ?? Math.min(currentInput.length / activeText.length, 1);
  const streak = Math.max(0, currentInput.length - Math.floor((1 - progress) * 8));
  const accuracy = useMemo(() => {
    if (!currentInput.length) return 0;
    let correct = 0;
    const maxLen = Math.max(activeText.length, currentInput.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (currentInput[i] === activeText[i]) correct += 1;
    }
    return (correct / maxLen) * 100;
  }, [activeText, currentInput]);

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
        body: JSON.stringify({ roomId, username }),
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
      debug: () => {},
    });
    client.onConnect = () => {
      client.subscribe(`/topic/room.${roomId}`, (message) => {
        setRoomState(JSON.parse(message.body) as GameRoom);
      });
      client.publish({
        destination: "/app/room.join",
        body: JSON.stringify({ roomId, username }),
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

  const sendTypingUpdate = (nextProgress: number, nextWpm: number, finished: boolean) => {
    if (!clientRef.current?.connected || !roomId || !username) return;
    clientRef.current.publish({
      destination: "/app/room.update",
      body: JSON.stringify({ roomId, username, progress: nextProgress, wpm: nextWpm, finished }),
    });
  };

  const handleInputChange = (value: string) => {
    setCurrentInput(value);
    const now = Date.now();
    if (!startTime) {
      setStartTime(now);
      setDuelEndTime(now + duelDurationSeconds * 1000);
      setDuelRemainingSeconds(duelDurationSeconds);
    }
    const nextProgress = Math.min(value.length / activeText.length, 1);
    const minutes = startTime ? (now - startTime) / 1000 / 60 : 0;
    const wordsTyped = value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;
    const wpm = minutes > 0 ? wordsTyped / minutes : 0;
    sendTypingUpdate(nextProgress, wpm, nextProgress >= 1);
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
  };

  return (
    <div className="duel-terminal">
      <aside className="duel-sidebar">
        <div className="duel-sidebar-brand">NEON_PRECISION</div>
        <div className="duel-sidebar-group">
          <span className="duel-kicker">Main Command</span>
          <Link to="/" className="duel-sidebar-link">
            ARENA
          </Link>
          <Link to="/duel" className="duel-sidebar-link active">
            SQUAD_ROOM
          </Link>
          <Link to="/dashboard" className="duel-sidebar-link">
            TECH_LAB
          </Link>
          <Link to="/modes" className="duel-sidebar-link">
            LEADERBOARD
          </Link>
        </div>
        <div className="duel-sidebar-operator">
          <div>
            <strong>OPERATOR_01</strong>
            <span>RANK: PLATINUM</span>
          </div>
          <button type="button" onClick={connectAndJoin}>
            START_DUEL
          </button>
        </div>
      </aside>

      <main className="duel-main">
        <header className="duel-topbar">
          <div>
            <h1>DUEL_SESSION_#492</h1>
            <p>STATUS: {joined ? "OPERATORS_CONNECTED" : "WAITING_FOR_OPERATORS"} // SERVER: US_EAST_V2</p>
          </div>
          <div className="duel-command-bar">
            <div>
              <span>PING</span>
              <strong>14MS</strong>
            </div>
            <div>
              <span>WREATHS</span>
              <strong>12</strong>
            </div>
          </div>
        </header>

        <div className="duel-grid">
          <section className="duel-stage">
            <div className="duel-config-card">
              <div className="duel-section-title">
                <span />
                <h2>MISSION_CONFIG</h2>
              </div>
              <div className="duel-config-grid">
                <label>
                  <span>ROOM_ID</span>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.trim())}
                    placeholder="Enter ID..."
                  />
                </label>
                <label>
                  <span>PLAYER_ALIAS</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    placeholder="Operator"
                  />
                </label>
                <label>
                  <span>DUEL_TIME</span>
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
                <button type="button" className="duel-primary-button" onClick={connectAndJoin}>
                  {joined ? "REJOIN_SESSION" : "JOIN_SESSION"}
                </button>
              </div>
            </div>

            <section className="duel-workspace">
              <div className="duel-workspace-dots" aria-hidden="true">
                <span />
                <span />
                <span className="live" />
              </div>
              <div className="duel-workspace-copy">
                {activeText.split("").map((char, index) => {
                  let state = "pending";
                  if (index < currentInput.length) {
                    state = currentInput[index] === activeText[index] ? "correct" : "wrong";
                  } else if (index === currentInput.length) {
                    state = "active";
                  }
                  return (
                    <span key={index} className={`duel-char ${state}`}>
                      {char}
                    </span>
                  );
                })}
              </div>

              <textarea
                className="duel-workspace-input"
                value={currentInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={joined ? "Start typing..." : "Join a room first."}
                disabled={!joined}
              />

              <div className="duel-metrics-row">
                <div>
                  <span>LIVE_WPM</span>
                  <strong>{myState?.wpm.toFixed(0) ?? "0"}</strong>
                </div>
                <div>
                  <span>ACCURACY</span>
                  <strong>{accuracy.toFixed(1)}%</strong>
                </div>
                <div>
                  <span>STREAK</span>
                  <strong>{streak}</strong>
                </div>
                <div>
                  <span>TIMER</span>
                  <strong>{duelRemainingSeconds ?? duelDurationSeconds}s</strong>
                </div>
              </div>
            </section>
          </section>

          <aside className="duel-sidepanel">
            <section className="duel-opponents-card">
              <div className="duel-side-head">
                <h3>LIVE_OPPONENTS</h3>
                <span>{opponentStates.length + (joined ? 1 : 0)}_ACTIVE</span>
              </div>

              <div className="duel-player-card self">
                <div className="duel-player-head">
                  <strong>{username || "OPERATOR_01"} (YOU)</strong>
                  <span>{myState?.wpm.toFixed(0) ?? "0"} WPM</span>
                </div>
                <div className="duel-progress">
                  <div style={{ width: `${progress * 100}%` }} />
                </div>
              </div>

              {opponentStates.length === 0 && <p className="hint">Waiting for opponent telemetry...</p>}

              {opponentStates.map((player) => (
                <div key={player.username} className="duel-player-card">
                  <div className="duel-player-head">
                    <strong>{player.username}</strong>
                    <span>{player.wpm.toFixed(0)} WPM</span>
                  </div>
                  <div className="duel-progress ghost">
                    <div style={{ width: `${player.progress * 100}%` }} />
                  </div>
                </div>
              ))}
            </section>

            <section className="duel-telemetry-card">
              <h3>PERFORMANCE_TELEMETRY</h3>
              <div className="duel-telemetry-row">
                <span>Peak Velocity</span>
                <strong>142 WPM</strong>
              </div>
              <div className="duel-telemetry-row">
                <span>Error Density</span>
                <strong className="danger">{(100 - accuracy).toFixed(1)}%</strong>
              </div>
              <div className="duel-telemetry-row">
                <span>Rank Percentile</span>
                <strong className="success">TOP 2%</strong>
              </div>
              <div className="duel-prediction">AI_PREDICTION: ESTIMATED_WIN_CHANCE: 84%</div>
            </section>

            <div className="duel-actions">
              <button type="button" className="duel-reset-button" onClick={resetDuel}>
                RESET_INPUT
              </button>
              <Link to="/" className="duel-home-link">
                EXIT_ARENA
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
