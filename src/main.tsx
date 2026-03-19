import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./HomePage";
import { DuelPage } from "./DuelPage";
import { PracticePage } from "./PracticePage";
import { BubbleGamePage } from "./BubbleGamePage";
import { Dashboard } from "./Dashboard";
import { WordSprintPage } from "./WordSprintPage";
import { FallingWordsPage } from "./FallingWordsPage";
import { KeyDrillPage } from "./KeyDrillPage";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/duel" element={<DuelPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/bubbles" element={<BubbleGamePage />} />
        <Route path="/word-sprint" element={<WordSprintPage />} />
        <Route path="/falling-words" element={<FallingWordsPage />} />
        <Route path="/key-drill" element={<KeyDrillPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

