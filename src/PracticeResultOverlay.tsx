import React from "react";

export type PracticeResultSummary = {
  wpm: number;
  accuracy: number;
  errors: number;
  charactersTyped: number;
  durationSeconds: number;
};

type PracticeResultOverlayProps = {
  summary: PracticeResultSummary;
  onRestart: () => void;
  onNewPassage: () => void;
  autoAdvanceEnabled: boolean;
  onToggleAutoAdvance: () => void;
};

export const PracticeResultOverlay: React.FC<PracticeResultOverlayProps> = ({
  summary,
  onRestart,
  onNewPassage,
  autoAdvanceEnabled,
  onToggleAutoAdvance,
}) => {
  return (
    <div className="duel-result-overlay" aria-live="polite">
      <div className="duel-result-modal">
        <span className="duel-result-kicker">session complete</span>
        <strong>Solo Practice Report</strong>
        <p>Review the final practice stats and start the next run when you are ready.</p>
        <div className="duel-result-grid">
          <div className="duel-result-card">
            <span>WPM</span>
            <strong>{summary.wpm.toFixed(1)}</strong>
          </div>
          <div className="duel-result-card">
            <span>Accuracy</span>
            <strong>{summary.accuracy.toFixed(1)}%</strong>
          </div>
          <div className="duel-result-card">
            <span>Errors</span>
            <strong>{summary.errors}</strong>
          </div>
          <div className="duel-result-card">
            <span>Chars</span>
            <strong>{summary.charactersTyped}</strong>
          </div>
        </div>
        <div className="duel-result-actions">
          <button type="button" className="practice-simple-link" onClick={onRestart}>
            RETRY
          </button>
          <button type="button" className="practice-simple-link" onClick={onNewPassage}>
            NEW PASSAGE
          </button>
          <button type="button" className="practice-simple-link" onClick={onToggleAutoAdvance}>
            AUTO NEXT: {autoAdvanceEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
};
