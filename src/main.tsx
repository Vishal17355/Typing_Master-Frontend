import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { LandingPage } from "./LandingPage";
import { HomePage } from "./HomePage";
import { DuelPage } from "./DuelPage";
import { PracticePage } from "./PracticePage";
import { BubbleGamePage } from "./BubbleGamePage";
import { Dashboard } from "./Dashboard";
import { WordSprintPage } from "./WordSprintPage";
import { FallingWordsPage } from "./FallingWordsPage";
import { KeyDrillPage } from "./KeyDrillPage";
import "./styles.css";

const AUTH_STORAGE_KEY = "typing-game-authenticated";
const THEME_STORAGE_KEY = "typing-game-theme";

type ThemeMode = "system" | "light" | "dark";

const getSystemTheme = (): Exclude<ThemeMode, "system"> =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const applyTheme = (mode: ThemeMode) => {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.setAttribute("data-theme-mode", mode);
  document.documentElement.setAttribute("data-resolved-theme", resolved);
};

const ProtectedRoute: React.FC<{ isLoggedIn: boolean; children: React.ReactElement }> = ({
  isLoggedIn,
  children,
}) => {
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const ThemeToggle: React.FC<{
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}> = ({ themeMode, onThemeChange }) => {
  const labels: Record<ThemeMode, string> = {
    dark: "🌙",
    light: "☀",
    system: "💡",
  };

  return (
    <div className="theme-toggle" role="group" aria-label="Theme selector">
      {(["dark", "light", "system"] as ThemeMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`theme-toggle-button${themeMode === mode ? " active" : ""}`}
          onClick={() => onThemeChange(mode)}
          aria-label={`Use ${mode} theme`}
          title={mode}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    setIsLoggedIn(window.localStorage.getItem(AUTH_STORAGE_KEY) === "true");
    const savedTheme = (window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? "system";
    setThemeMode(savedTheme);
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      const savedTheme = (window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? "system";
      if (savedTheme === "system") applyTheme("system");
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const handleLogin = () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setIsLoggedIn(true);
    navigate("/modes");
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false);
    navigate("/");
  };

  const handleThemeChange = (mode: ThemeMode) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    setThemeMode(mode);
    applyTheme(mode);
  };

  return (
    <>
      <ThemeToggle themeMode={themeMode} onThemeChange={handleThemeChange} />
      <div className="app-theme-surface">
        <Routes>
          <Route path="/" element={<LandingPage isLoggedIn={isLoggedIn} onLogin={handleLogin} />} />
          <Route
            path="/modes"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <HomePage onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/duel"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <DuelPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <PracticePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bubbles"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <BubbleGamePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/word-sprint"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <WordSprintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/falling-words"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <FallingWordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/key-drill"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <KeyDrillPage />
              </ProtectedRoute>
            }
          />
          <Route path="/racing" element={<Navigate to="/modes" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
