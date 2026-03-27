import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

type PlayerState = {
  username: string;
  progress: number;
  wpm: number;
  finished: boolean;
  cursorIndex?: number;
  cursorColor?: string;
  selectedDuration?: number;
  requiredPlayers?: number;
  joinedAt?: number;
  roundStartAt?: number;
  rematchStatus?: "idle" | "requested" | "accepted" | "rejected";
  rematchTarget?: string;
};

type GameRoom = {
  roomId: string;
  players: Record<string, PlayerState>;
};

const DUEL_DURATIONS = [15, 30, 60, 120] as const;
const DUEL_PLAYER_COUNTS = [2, 3, 4] as const;
const DUEL_VISIBLE_LINES = 3;
const DUEL_LINE_LENGTH = 34;
const CURSOR_COLORS = ["#00cffc", "#bd9dff", "#ff6e84", "#f7c84b"];

const DUEL_TEXT = [
  "Type fast and stay calm. Keep each word clean and clear. Win the duel with smart and steady typing.",
  "Read the line ahead and keep your hands relaxed. Small mistakes can cost time in a close race.",
  "Strong focus and smooth rhythm will help you stay ahead. Trust your flow and keep moving forward.",
  "Each correct word builds pressure on your opponent. Stay accurate and finish the passage with control.",
].join(" ");

const BACKEND_HTTP_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://typing-master-backend-production.up.railway.app";

type DuelLine = {
  text: string;
  start: number;
  end: number;
};

type CursorPlacement = {
  lineIndex: number;
  columnIndex: number;
  textIndex: number;
};

type CursorMarker = {
  username: string;
  color: string;
  placement: CursorPlacement;
  stackIndex: number;
};

const buildDuelLines = (text: string, targetLength: number): DuelLine[] => {
  const words = text.split(" ");
  const lines: DuelLine[] = [];
  let currentWords: string[] = [];
  let currentLength = 0;
  let cursor = 0;

  const pushLine = () => {
    if (currentWords.length === 0) return;
    let lineText = currentWords.join(" ");
    if (cursor + lineText.length < text.length && text[cursor + lineText.length] === " ") {
      lineText += " ";
    }
    lines.push({ text: lineText, start: cursor, end: cursor + lineText.length });
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

const clampCursorIndex = (cursorIndex: number, textLength: number) =>
  Math.max(0, Math.min(cursorIndex, textLength));

const getEffectiveCursorIndex = (player: PlayerState | undefined, textLength: number) => {
  if (!player) return 0;
  if (typeof player.cursorIndex === "number" && Number.isFinite(player.cursorIndex)) {
    return clampCursorIndex(player.cursorIndex, textLength);
  }
  return clampCursorIndex(Math.round((player.progress ?? 0) * textLength), textLength);
};

const getCursorPlacement = (cursorIndex: number, lines: DuelLine[], textLength: number): CursorPlacement => {
  const clampedCursorIndex = clampCursorIndex(cursorIndex, textLength);
  const lineIndex = Math.max(
    0,
    lines.findIndex((line) => clampedCursorIndex <= line.end)
  );
  const line = lines[lineIndex] ?? lines[lines.length - 1];
  const textIndex = Math.max(0, clampedCursorIndex - (line?.start ?? 0));
  return {
    lineIndex,
    columnIndex: textIndex,
    textIndex: clampedCursorIndex,
  };
};

export const DuelPage: React.FC = () => {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [roomState, setRoomState] = useState<GameRoom | null>(null);
  const [duelDurationSeconds, setDuelDurationSeconds] = useState<number>(60);
  const [requiredPlayers, setRequiredPlayers] = useState<number>(2);
  const [duelEndTime, setDuelEndTime] = useState<number | null>(null);
  const [duelRemainingSeconds, setDuelRemainingSeconds] = useState<number | null>(null);
  const [duelReady, setDuelReady] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const joinedAtRef = useRef<number>(Date.now());
  const lastRoundStartAtRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const currentInputRef = useRef("");
  const correctCharsRef = useRef(0);
  const spaceCountRef = useRef(0);
  const [startCountdown, setStartCountdown] = useState(0);

  const activeText = DUEL_TEXT;
  const duelLines = useMemo(() => buildDuelLines(activeText, DUEL_LINE_LENGTH), [activeText]);

  const myState = useMemo(
    () => (username && roomState ? roomState.players[username] : undefined),
    [roomState, username]
  );
  const hostUsername = useMemo(() => {
    if (!roomState) return "";
    const players = Object.values(roomState.players);
    if (players.length === 0) return "";
    const withJoinedAt = players.every((player) => typeof player.joinedAt === "number");
    if (withJoinedAt) {
      return [...players].sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0))[0]?.username ?? "";
    }
    return Object.keys(roomState.players)[0] ?? "";
  }, [roomState]);
  const isHost = !!username && hostUsername === username;
  const hostState = hostUsername && roomState ? roomState.players[hostUsername] : undefined;
  const sharedRoundStartAt = hostState?.roundStartAt ?? null;
  const roomRequiredPlayers = hostState?.requiredPlayers ?? requiredPlayers;
  const orderedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...Object.values(roomState.players)].sort((a, b) => {
      const joinedAtA = a.joinedAt ?? Number.MAX_SAFE_INTEGER;
      const joinedAtB = b.joinedAt ?? Number.MAX_SAFE_INTEGER;
      if (joinedAtA !== joinedAtB) return joinedAtA - joinedAtB;
      return a.username.localeCompare(b.username);
    });
  }, [roomState]);
  const cursorColorByUser = useMemo(() => {
    const map = new Map<string, string>();
    orderedPlayers.forEach((player, index) => {
      map.set(player.username, CURSOR_COLORS[index % CURSOR_COLORS.length]);
    });
    return map;
  }, [orderedPlayers]);

  const activeLineIndex = useMemo(() => {
    const typedIndex = Math.min(currentInput.length, Math.max(0, activeText.length - 1));
    const foundIndex = duelLines.findIndex((line) => typedIndex < line.end);
    return foundIndex === -1 ? Math.max(0, duelLines.length - 1) : foundIndex;
  }, [activeText.length, currentInput.length, duelLines]);
  const visibleLineStart = Math.min(
    activeLineIndex,
    Math.max(0, duelLines.length - DUEL_VISIBLE_LINES)
  );
  const visibleLines = useMemo(
    () => duelLines.slice(visibleLineStart, visibleLineStart + DUEL_VISIBLE_LINES),
    [duelLines, visibleLineStart]
  );

  const progress = myState?.progress ?? Math.min(currentInput.length / activeText.length, 1);
  const streak = Math.max(0, currentInput.length - Math.floor((1 - progress) * 8));
  const accuracy = currentInput.length ? (correctCharsRef.current / currentInput.length) * 100 : 0;
  const myCursorIndex = clampCursorIndex(currentInput.length, activeText.length);

  const opponentStates = useMemo(() => {
    if (!roomState) return [];
    return Object.values(roomState.players).filter((p) => p.username !== username);
  }, [roomState, username]);
  const leadOpponent = opponentStates[0];
  const hasOpponent = opponentStates.length > 0;
  const joinedPlayerCount = roomState ? Object.keys(roomState.players).length : joined ? 1 : 0;
  const roomIsFull = joinedPlayerCount >= roomRequiredPlayers;
  const roundCanStart = joined && hasOpponent && roomIsFull;
  const mistakes = Math.max(
    0,
    currentInput.length - Math.round((accuracy / 100) * currentInput.length)
  );
  const incomingRematchRequest = Boolean(
    leadOpponent?.rematchStatus === "requested" && leadOpponent.rematchTarget === username
  );
  const myRematchPending = Boolean(
    myState?.rematchStatus === "requested" && myState.rematchTarget === leadOpponent?.username
  );
  const opponentRejectedRematch = Boolean(
    leadOpponent?.rematchStatus === "rejected" && leadOpponent.rematchTarget === username
  );
  const opponentAcceptedRematch = Boolean(
    leadOpponent?.rematchStatus === "accepted" && leadOpponent.rematchTarget === username
  );
  const duelFinished =
    joined &&
    hasOpponent &&
    startCountdown <= 0 &&
    (progress >= 1 || Boolean(leadOpponent?.finished) || duelRemainingSeconds === 0);
  const resultLabel = useMemo(() => {
    if (!duelFinished) return "";
    const myWpm = myState?.wpm ?? 0;
    const opponentProgress = leadOpponent?.progress ?? 0;
    const opponentWpm = leadOpponent?.wpm ?? 0;

    if (progress > opponentProgress) return "You Win";
    if (progress < opponentProgress) return "Opponent Wins";
    if (myWpm > opponentWpm) return "You Win";
    if (myWpm < opponentWpm) return "Opponent Wins";
    if (accuracy > 98) return "You Win";
    return "Draw";
  }, [accuracy, duelFinished, leadOpponent?.progress, leadOpponent?.wpm, myState?.wpm, progress]);

  const remoteCursorMarkers = useMemo(() => {
    if (!roomState) return [];
    const stackCounts = new Map<string, number>();

    return Object.values(roomState.players)
      .filter((player) => player.username !== username)
      .map((player) => {
        const color = cursorColorByUser.get(player.username) ?? CURSOR_COLORS[0];
        const placement = getCursorPlacement(
          getEffectiveCursorIndex(player, activeText.length),
          duelLines,
          activeText.length
        );
        const stackKey = `${placement.lineIndex}:${placement.columnIndex}`;
        const stackIndex = stackCounts.get(stackKey) ?? 0;
        stackCounts.set(stackKey, stackIndex + 1);
        return {
          username: player.username,
          color,
          placement,
          stackIndex,
        };
      });
  }, [activeText.length, cursorColorByUser, duelLines, roomState, username]);

  const remoteCursorMarkersByLine = useMemo(() => {
    const buckets = new Map<number, CursorMarker[]>();
    remoteCursorMarkers.forEach((marker) => {
      const existing = buckets.get(marker.placement.lineIndex) ?? [];
      existing.push(marker);
      buckets.set(marker.placement.lineIndex, existing);
    });
    return buckets;
  }, [remoteCursorMarkers]);

  const cursorUserByColor = useMemo(() => {
    const map = new Map<string, string>();
    cursorColorByUser.forEach((color, user) => {
      map.set(color, user);
    });
    return map;
  }, [cursorColorByUser]);

  const getCursorLabel = (cursorIndex: number) => {
    const placement = getCursorPlacement(cursorIndex, duelLines, activeText.length);
    return `L${placement.lineIndex + 1} C${placement.columnIndex + 1}`;
  };

  const getPlayerCursorLabel = (player: PlayerState | undefined) =>
    getCursorLabel(getEffectiveCursorIndex(player, activeText.length));

  useEffect(() => {
    if (!roomState || !hostUsername || isHost) return;
    const hostDuration = roomState.players[hostUsername]?.selectedDuration;
    const hostRequiredPlayers = roomState.players[hostUsername]?.requiredPlayers;
    if (hostDuration && hostDuration !== duelDurationSeconds) {
      setDuelDurationSeconds(hostDuration);
      setDuelEndTime(null);
      setDuelRemainingSeconds(null);
      setStartTime(null);
      clearTypingBuffer();
      setCurrentInput("");
    }
    if (hostRequiredPlayers && hostRequiredPlayers !== requiredPlayers) {
      setRequiredPlayers(hostRequiredPlayers);
    }
  }, [duelDurationSeconds, hostUsername, isHost, requiredPlayers, roomState]);

  useEffect(() => {
    if (!roundCanStart || !sharedRoundStartAt) {
      setStartCountdown(0);
      setDuelRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const countdownMs = sharedRoundStartAt - now;
      if (countdownMs > 0) {
        setStartCountdown(Math.ceil(countdownMs / 1000));
        setDuelRemainingSeconds(duelDurationSeconds);
        return;
      }

      setStartCountdown(0);
      const roundEndAt = sharedRoundStartAt + duelDurationSeconds * 1000;
      const remainingMs = roundEndAt - now;
      setDuelRemainingSeconds(remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000));
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [duelDurationSeconds, roundCanStart, sharedRoundStartAt]);

  useEffect(() => {
    if (!sharedRoundStartAt) {
      lastRoundStartAtRef.current = null;
      return;
    }

    if (lastRoundStartAtRef.current === sharedRoundStartAt) return;
    lastRoundStartAtRef.current = sharedRoundStartAt;
    clearTypingBuffer();
    setCurrentInput("");
    setStartTime(sharedRoundStartAt);
    setDuelEndTime(sharedRoundStartAt + duelDurationSeconds * 1000);
  }, [duelDurationSeconds, sharedRoundStartAt]);

  useEffect(() => {
    if (!(roundCanStart && startCountdown <= 0)) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [roundCanStart, startCountdown]);

  useEffect(() => {
    return () => {
      if (clientRef.current?.active) clientRef.current.deactivate();
    };
  }, []);

  const clearTypingBuffer = () => {
    currentInputRef.current = "";
    correctCharsRef.current = 0;
    spaceCountRef.current = 0;
  };

  useEffect(() => {
    clearTypingBuffer();
  }, [sharedRoundStartAt, roomId, username]);

  const publishPlayerState = (overrides: Partial<PlayerState> = {}) => {
    if (!clientRef.current?.connected || !roomId || !username) return;
    clientRef.current.publish({
      destination: "/app/room.update",
      body: JSON.stringify({
        roomId,
        username,
        progress: overrides.progress ?? myState?.progress ?? 0,
        wpm: overrides.wpm ?? myState?.wpm ?? 0,
        finished: overrides.finished ?? myState?.finished ?? false,
        cursorIndex: overrides.cursorIndex ?? myState?.cursorIndex ?? currentInputRef.current.length,
        cursorColor: overrides.cursorColor ?? cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
        selectedDuration: overrides.selectedDuration ?? duelDurationSeconds,
        requiredPlayers: overrides.requiredPlayers ?? myState?.requiredPlayers ?? requiredPlayers,
        joinedAt: overrides.joinedAt ?? joinedAtRef.current,
        roundStartAt: overrides.roundStartAt ?? myState?.roundStartAt ?? null,
        rematchStatus: overrides.rematchStatus ?? myState?.rematchStatus ?? "idle",
        rematchTarget: overrides.rematchTarget ?? myState?.rematchTarget ?? "",
      }),
    });
  };

  const connectAndJoin = () => {
    if (!roomId || !username) {
      alert("Please enter both room ID and username");
      return;
    }
    if (clientRef.current?.active) {
      clientRef.current.publish({
        destination: "/app/room.join",
        body: JSON.stringify({
          roomId,
          username,
          selectedDuration: duelDurationSeconds,
          requiredPlayers,
          joinedAt: joinedAtRef.current,
          roundStartAt: myState?.roundStartAt ?? null,
          cursorIndex: 0,
          cursorColor: cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
        }),
      });
      setJoined(true);
      setStartTime(null);
      clearTypingBuffer();
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
        body: JSON.stringify({
          roomId,
          username,
          selectedDuration: duelDurationSeconds,
          requiredPlayers,
          joinedAt: joinedAtRef.current,
          roundStartAt: myState?.roundStartAt ?? null,
          cursorIndex: 0,
          cursorColor: cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
        }),
      });
      setJoined(true);
      setStartTime(null);
      clearTypingBuffer();
      setCurrentInput("");
    };
    client.onStompError = (frame) => {
      console.error("STOMP error:", frame.headers["message"], frame.body);
    };
    clientRef.current = client;
    client.activate();
  };

  const sendTypingUpdate = (nextProgress: number, nextWpm: number, finished: boolean, cursorIndex: number) => {
    publishPlayerState({
      progress: nextProgress,
      wpm: nextWpm,
      finished,
      cursorIndex,
      cursorColor: cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
    });
  };

  const syncRoomConfig = (config: { duration?: number; players?: number }) => {
    publishPlayerState({
      selectedDuration: config.duration ?? duelDurationSeconds,
      requiredPlayers: config.players ?? requiredPlayers,
    });
  };

  const commitInput = (nextInput: string) => {
    const prevInput = currentInputRef.current;

    if (nextInput.length > prevInput.length) {
      const insertedChar = nextInput[nextInput.length - 1];
      const insertedIndex = nextInput.length - 1;
      if (insertedChar === activeText[insertedIndex]) {
        correctCharsRef.current += 1;
      }
      if (insertedChar === " " && prevInput.trim().length > 0 && prevInput[prevInput.length - 1] !== " ") {
        spaceCountRef.current += 1;
      }
    } else if (nextInput.length < prevInput.length) {
      const removedIndex = prevInput.length - 1;
      const removedChar = prevInput[removedIndex];
      if (removedChar === activeText[removedIndex]) {
        correctCharsRef.current = Math.max(0, correctCharsRef.current - 1);
      }
      if (removedChar === " " && nextInput.trim().length > 0) {
        spaceCountRef.current = Math.max(0, spaceCountRef.current - 1);
      }
    }

    currentInputRef.current = nextInput;
    setCurrentInput(nextInput);

    const now = Date.now();
    const roundStartedAt = sharedRoundStartAt ?? startTime ?? now;
    if (!startTime) setStartTime(roundStartedAt);
    const nextProgress = Math.min(nextInput.length / activeText.length, 1);
    const minutes = (now - roundStartedAt) / 1000 / 60;
    const wordsTyped = nextInput.trim().length === 0 ? 0 : spaceCountRef.current + 1;
    const wpm = minutes > 0 ? wordsTyped / minutes : 0;
    sendTypingUpdate(nextProgress, wpm, nextProgress >= 1, nextInput.length);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!duelReady || duelFinished || duelRemainingSeconds === 0 || startCountdown > 0) return;

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

  useEffect(() => {
    if (!joined) {
      setDuelReady(false);
      return;
    }

    if (!hasOpponent || !roomIsFull) {
      clearTypingBuffer();
      setDuelReady(false);
      setStartCountdown(0);
      setCurrentInput("");
      setStartTime(null);
      setDuelEndTime(null);
      setDuelRemainingSeconds(null);
      return;
    }

    if (!duelReady) {
      clearTypingBuffer();
      setCurrentInput("");
      setStartTime(null);
      setDuelEndTime(null);
      setDuelRemainingSeconds(null);
      setDuelReady(true);
    }

    if (isHost && !sharedRoundStartAt && !duelFinished) {
      publishPlayerState({
        progress: 0,
        wpm: 0,
        finished: false,
        roundStartAt: Date.now() + 3500,
        rematchStatus: "idle",
        rematchTarget: "",
      });
    }
  }, [duelFinished, duelReady, hasOpponent, isHost, joined, roomIsFull, sharedRoundStartAt]);

  useEffect(() => {
    if (!duelFinished || !opponentAcceptedRematch || !isHost) return;
    publishPlayerState({
      progress: 0,
      wpm: 0,
      finished: false,
      roundStartAt: Date.now() + 3500,
      rematchStatus: "idle",
      rematchTarget: "",
    });
  }, [duelFinished, isHost, opponentAcceptedRematch]);

  const clearLocalRound = () => {
    clearTypingBuffer();
    setCurrentInput("");
    setStartTime(null);
    setDuelEndTime(null);
    setDuelRemainingSeconds(null);
    setStartCountdown(0);
  };

  const resetDuel = () => {
    clearLocalRound();
    if (!isHost) {
      publishPlayerState({
        progress: 0,
        wpm: 0,
        finished: false,
        cursorIndex: 0,
        cursorColor: cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
      });
      return;
    }

    publishPlayerState({
      progress: 0,
      wpm: 0,
      finished: false,
      cursorIndex: 0,
      cursorColor: cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
      roundStartAt: Date.now() + 3500,
      rematchStatus: "idle",
      rematchTarget: "",
    });
  };

  const requestRematch = () => {
    if (!leadOpponent?.username) return;
    publishPlayerState({
      rematchStatus: "requested",
      rematchTarget: leadOpponent.username,
    });
  };

  const acceptRematch = () => {
    if (!leadOpponent?.username) return;
    publishPlayerState({
      progress: 0,
      wpm: 0,
      finished: false,
      cursorIndex: 0,
      cursorColor: cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
      rematchStatus: "accepted",
      rematchTarget: leadOpponent.username,
    });
    clearLocalRound();
  };

  const rejectRematch = () => {
    if (!leadOpponent?.username) return;
    publishPlayerState({
      rematchStatus: "rejected",
      rematchTarget: leadOpponent.username,
    });
  };

  const duelWorkspace = (
    <section
      className="duel-workspace"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      <div className="duel-workspace-dots" aria-hidden="true">
        <span />
        <span />
        <span className="live" />
      </div>
      <div className="duel-workspace-copy">
        <div className="duel-workspace-copy-track">
          {visibleLines.map((line, visibleIndex) => {
            const lineIndex = visibleLineStart + visibleIndex;
            const lineCursorMarkers = remoteCursorMarkersByLine.get(lineIndex) ?? [];
            return (
              <div
                key={`${line.start}-${line.end}`}
                className={`duel-line${lineIndex === activeLineIndex ? " is-active" : ""}`}
              >
                {line.text.split("").map((char, charIndex) => {
                  const index = line.start + charIndex;
                  let state = "pending";
                  if (index < currentInput.length) {
                    state = currentInput[index] === activeText[index] ? "correct" : "wrong";
                  }
                  const isCaretStart = duelReady && startCountdown <= 0 && currentInput.length === 0 && index === 0;
                  const isCaretBeforeChar =
                    duelReady &&
                    startCountdown <= 0 &&
                    currentInput.length > 0 &&
                    currentInput[currentInput.length - 1] === " " &&
                    index === currentInput.length;
                  const isCaretAnchor =
                    duelReady &&
                    startCountdown <= 0 &&
                    currentInput.length > 0 &&
                    currentInput[currentInput.length - 1] !== " " &&
                    index === currentInput.length - 1;
                  const isSpace = char === " ";
                  const cursorMarkersHere = lineCursorMarkers.filter(
                    (marker) => marker.placement.columnIndex === charIndex
                  );
                  return (
                    <React.Fragment key={index}>
                      {cursorMarkersHere.map((marker) => (
                        <span
                          key={`${marker.username}-${marker.placement.textIndex}-${marker.stackIndex}`}
                          className="duel-remote-cursor"
                          style={
                            {
                              "--duel-cursor-color": marker.color,
                              "--duel-cursor-stack": marker.stackIndex,
                            } as React.CSSProperties
                          }
                          title={`${marker.username} ${getCursorLabel(marker.placement.textIndex)}`}
                          aria-label={`${marker.username} cursor at ${getCursorLabel(marker.placement.textIndex)}`}
                        >
                          <span className="duel-remote-cursor-badge" aria-hidden="true">
                            {marker.username.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="duel-remote-cursor-label">{marker.username}</span>
                        </span>
                      ))}
                      <span
                        className={[
                          "duel-char",
                          state,
                          isCaretStart ? "caret-start" : "",
                          isCaretBeforeChar ? "caret-before-char" : "",
                          isCaretAnchor ? "caret-anchor" : "",
                          isSpace ? "is-space" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {char}
                      </span>
                    </React.Fragment>
                  );
                })}
                {lineCursorMarkers
                  .filter((marker) => marker.placement.columnIndex >= line.text.length)
                  .map((marker) => (
                    <span
                      key={`${marker.username}-${marker.placement.textIndex}-${marker.stackIndex}`}
                      className="duel-remote-cursor"
                      style={
                        {
                          "--duel-cursor-color": marker.color,
                          "--duel-cursor-stack": marker.stackIndex,
                        } as React.CSSProperties
                      }
                      title={`${marker.username} ${getCursorLabel(marker.placement.textIndex)}`}
                      aria-label={`${marker.username} cursor at ${getCursorLabel(marker.placement.textIndex)}`}
                    >
                      <span className="duel-remote-cursor-badge" aria-hidden="true">
                        {marker.username.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="duel-remote-cursor-label">{marker.username}</span>
                    </span>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      {!roomIsFull && (
        <div className="duel-waiting-banner">
          Waiting for players... {joinedPlayerCount}/{roomRequiredPlayers} joined
        </div>
      )}

      <textarea
        ref={inputRef}
        className="duel-workspace-input"
        value={currentInput}
        onKeyDown={handleInputKeyDown}
        placeholder={joined ? "Type to duel..." : "Join a room first."}
        disabled={!joined || !duelReady || duelFinished || duelRemainingSeconds === 0 || startCountdown > 0}
        readOnly
        spellCheck={false}
      />
    </section>
  );

  const countdownStyle = {
    "--duel-countdown-progress": `${Math.max(0, Math.min(1, startCountdown / 3))}`,
  } as React.CSSProperties;

  if (joined) {
    return (
      <div className="duel-terminal duel-terminal-focus-mode">
        {startCountdown > 0 && (
          <div className="duel-start-overlay" aria-live="polite">
            <div className="duel-start-countdown" style={countdownStyle}>
              <div className="duel-start-countdown-core">
                <span>duel starts in</span>
                <strong>{startCountdown}</strong>
              </div>
            </div>
          </div>
        )}
        {duelFinished && (
          <div className="duel-result-overlay" aria-live="polite">
            <div className="duel-result-modal">
              <span className="duel-result-kicker">Match Complete</span>
              <strong>{resultLabel}</strong>
              <p>Review the final duel stats and start a new round when you are ready.</p>
              <div className="duel-result-grid">
                <div className="duel-result-card">
                  <span>Your progress</span>
                  <strong>{Math.round(progress * 100)}%</strong>
                </div>
                <div className="duel-result-card">
                  <span>Opponent progress</span>
                  <strong>{Math.round((leadOpponent?.progress ?? 0) * 100)}%</strong>
                </div>
                <div className="duel-result-card">
                  <span>Your errors</span>
                  <strong>{mistakes}</strong>
                </div>
                <div className="duel-result-card">
                  <span>Accuracy</span>
                  <strong>{accuracy.toFixed(1)}%</strong>
                </div>
              </div>
              {incomingRematchRequest && (
                <div className="duel-rematch-banner">
                  <strong>{leadOpponent?.username} wants a rematch</strong>
                  <p>Accept to restart this duel together, or reject to stay on the result screen.</p>
                  <div className="duel-rematch-actions">
                    <button type="button" className="duel-reset-button" onClick={acceptRematch}>
                      ACCEPT
                    </button>
                    <button type="button" className="duel-home-link duel-rematch-button" onClick={rejectRematch}>
                      REJECT
                    </button>
                  </div>
                </div>
              )}
              {!incomingRematchRequest && myRematchPending && (
                <div className="duel-rematch-banner is-pending">
                  <strong>Rematch request sent</strong>
                  <p>Waiting for {leadOpponent?.username ?? "opponent"} to accept or reject.</p>
                </div>
              )}
              {!incomingRematchRequest && opponentRejectedRematch && (
                <div className="duel-rematch-banner is-pending">
                  <strong>Rematch rejected</strong>
                  <p>{leadOpponent?.username ?? "Your opponent"} declined the replay request.</p>
                </div>
              )}
              <div className="duel-result-actions">
                {!incomingRematchRequest && !myRematchPending && (
                  <button type="button" className="duel-reset-button" onClick={requestRematch}>
                    PLAY AGAIN
                  </button>
                )}
                <Link to="/modes" className="duel-home-link">
                  EXIT
                </Link>
              </div>
            </div>
          </div>
        )}
        <main className="duel-focus-screen">
          <div className="duel-focus-header">
            <div>
              <span className="duel-focus-kicker">room {roomId}</span>
              <strong>Real Duel</strong>
            </div>
            <div className="duel-focus-timer">{duelRemainingSeconds ?? duelDurationSeconds}s</div>
          </div>

          <div className="duel-focus-stats">
            <div
              className="duel-focus-stat-card is-you"
              style={
                {
                  "--duel-cursor-color": cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
                } as React.CSSProperties
              }
            >
              <span>you</span>
              <strong>{myCursorIndex}</strong>
              <small>{getCursorLabel(myCursorIndex)}</small>
            </div>
            <div
              className="duel-focus-stat-card is-opponent"
              style={
                {
                  "--duel-cursor-color": cursorColorByUser.get(leadOpponent?.username ?? "") ?? CURSOR_COLORS[1],
                } as React.CSSProperties
              }
            >
              <span>opponent</span>
              <strong>{getEffectiveCursorIndex(leadOpponent, activeText.length)}</strong>
              <small>{leadOpponent ? getPlayerCursorLabel(leadOpponent) : "waiting for player"}</small>
            </div>
            <div className="duel-focus-stat-card is-error">
              <span>errors</span>
              <strong>{(100 - accuracy).toFixed(1)}%</strong>
              <small>{mistakes} wrong chars</small>
            </div>
          </div>

          <div className="duel-focus-progress">
            <div>
              <span>You</span>
              <div className="duel-progress">
                <div style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <div>
              <span>Opponent</span>
              <div className="duel-progress ghost">
                <div style={{ width: `${(leadOpponent?.progress ?? 0) * 100}%` }} />
              </div>
            </div>
          </div>

          {duelWorkspace}

          <div className="duel-focus-actions">
            <button type="button" className="duel-reset-button" onClick={resetDuel}>
              RESET
            </button>
            <Link to="/modes" className="duel-home-link">
              EXIT
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="duel-terminal">
      {joined && startCountdown > 0 && (
        <div className="duel-start-overlay" aria-live="polite">
          <div className="duel-start-countdown" style={countdownStyle}>
            <div className="duel-start-countdown-core">
              <span>duel starts in</span>
              <strong>{startCountdown}</strong>
            </div>
          </div>
        </div>
      )}
      <aside className="duel-sidebar">
        <div className="duel-sidebar-group">
          <span className="duel-kicker">Main Command</span>
          <Link to="/" className="duel-sidebar-link">
            Home
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
                  <span>Name</span>
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
                    onChange={(e) => {
                      const nextDuration = Number(e.target.value) || 60;
                      setDuelDurationSeconds(nextDuration);
                      setDuelEndTime(null);
                      setDuelRemainingSeconds(null);
                      setStartTime(null);
                      setCurrentInput("");
                      if (joined && isHost) {
                        syncRoomConfig({ duration: nextDuration });
                      }
                    }}
                    disabled={joined && !isHost}
                  >
                    {DUEL_DURATIONS.map((s) => (
                      <option key={s} value={s}>
                        {s < 60 ? `${s}s` : `${s / 60} min`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>PLAYERS</span>
                  <select
                    value={requiredPlayers}
                    onChange={(e) => {
                      const nextPlayers = Number(e.target.value) || 2;
                      setRequiredPlayers(nextPlayers);
                      if (joined && isHost) {
                        syncRoomConfig({ players: nextPlayers });
                      }
                    }}
                    disabled={joined && !isHost}
                  >
                    {DUEL_PLAYER_COUNTS.map((count) => (
                      <option key={count} value={count}>
                        {count} players
                      </option>
                    ))}
                  </select>
                </label>
                {joined && !isHost && (
                  <label>
                    <span>ROOM_OWNER</span>
                    <input type="text" value={hostUsername || "Pending"} readOnly />
                  </label>
                )}
                <button type="button" className="duel-primary-button" onClick={connectAndJoin}>
                  {joined ? "REJOIN_SESSION" : "JOIN_SESSION"}
                </button>
              </div>
            </div>

            {duelWorkspace}
              <div className="duel-metrics-row">
                <div>
                  <span>CURSOR_POS</span>
                  <strong>{myCursorIndex}</strong>
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
                <div>
                  <span>ROOM_ROLE</span>
                  <strong>{isHost ? "HOST" : "PLAYER"}</strong>
                </div>
              </div>
          </section>

          <aside className="duel-sidepanel">
            <section className="duel-opponents-card">
              <div className="duel-side-head">
                <h3>LIVE_OPPONENTS</h3>
                <span>{joinedPlayerCount}/{roomRequiredPlayers}_READY</span>
              </div>

              <div className="duel-player-card self">
                <div
                  className="duel-player-head"
                  style={
                    {
                      "--duel-cursor-color": cursorColorByUser.get(username) ?? CURSOR_COLORS[0],
                    } as React.CSSProperties
                  }
                >
                  <strong>{username || "OPERATOR_01"} (YOU)</strong>
                  <span>{getCursorLabel(myCursorIndex)}</span>
                </div>
                <div className="duel-progress">
                  <div style={{ width: `${progress * 100}%` }} />
                </div>
              </div>

              {opponentStates.length === 0 && <p className="hint">Waiting for opponent telemetry...</p>}

              {opponentStates.map((player) => (
                <div
                  key={player.username}
                  className="duel-player-card"
                  style={
                    {
                      "--duel-cursor-color": cursorColorByUser.get(player.username) ?? CURSOR_COLORS[0],
                    } as React.CSSProperties
                  }
                >
                  <div className="duel-player-head">
                    <strong>{player.username}</strong>
                    <span>{getPlayerCursorLabel(player)}</span>
                  </div>
                  <div className="duel-progress ghost">
                    <div style={{ width: `${player.progress * 100}%` }} />
                  </div>
                </div>
              ))}

              {orderedPlayers.length > 0 && (
                <div className="duel-cursor-legend" aria-label="Cursor color legend">
                  {orderedPlayers.map((player) => {
                    const color = cursorColorByUser.get(player.username) ?? CURSOR_COLORS[0];
                    return (
                      <div key={player.username} className="duel-cursor-legend-item">
                        <span
                          className="duel-cursor-legend-swatch"
                          style={{ background: color }}
                          aria-hidden="true"
                        />
                        <strong>{player.username}</strong>
                        <small>{cursorUserByColor.get(color) ?? player.username}</small>
                      </div>
                    );
                  })}
                </div>
              )}
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
