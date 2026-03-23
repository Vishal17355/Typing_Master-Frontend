import React from "react";
import { Link } from "react-router-dom";

type HomePageProps = {
  onLogout: () => void;
};

type ModeCard = {
  title: string;
  description: string;
  route: string;
  badge: string;
  meta: string;
  action: string;
  icon: string;
  tone: "ready" | "online";
};

const modes: ModeCard[] = [
  {
    title: "Realtime Duel",
    description: "Race a friend in real time. Share a room ID and type the same passage. Win through grit.",
    route: "/duel",
    badge: "ONLINE_982",
    meta: "PVP // COMPETITIVE",
    action: "JOIN_ROOM",
    icon: "PVP",
    tone: "online",
  },
  {
    title: "Solo Practice",
    description: "Timed typing test with 100 passages. See your WPM and accuracy telemetry in real-time.",
    route: "/practice",
    badge: "READY",
    meta: "TRAINING // ENDURANCE",
    action: "START_CAL",
    icon: "TMR",
    tone: "ready",
  },
  {
    title: "Letter Bubbles",
    description: "Bubbles rise from the bottom. Type the letter to pop them before they reach the ceiling.",
    route: "/bubbles",
    badge: "READY",
    meta: "ARCADE // REFLEX",
    action: "BOOT_GAME",
    icon: "POP",
    tone: "ready",
  },
  {
    title: "Word Sprint",
    description: "Rapid-fire common words. Type a word and press space to submit. No mistakes allowed.",
    route: "/word-sprint",
    badge: "READY",
    meta: "AGILITY // RECOGNITION",
    action: "ENGAGE",
    icon: "WPM",
    tone: "ready",
  },
  {
    title: "Key Drill",
    description: "2-3 letter combos to build finger speed and rhythm. The fundamental building block of elite typing.",
    route: "/key-drill",
    badge: "READY",
    meta: "BASICS // MOTOR_MEMORY",
    action: "EXECUTE",
    icon: "KEY",
    tone: "ready",
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onLogout }) => {
  const localTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="neon-shell">
      <aside className="neon-sidebar">
        <div className="neon-sidebar-head">
          <span className="neon-sidebar-title">LAB_MODULES</span>
          <span className="neon-sidebar-version">V2.0.4-BETA</span>
        </div>

        <nav className="neon-sidebar-nav">
          <Link to="/modes" className="neon-sidebar-link is-active">
            <span className="neon-sidebar-icon">ARE</span>
            <span>Arena</span>
          </Link>
          <Link to="/dashboard" className="neon-sidebar-link">
            <span className="neon-sidebar-icon">DAT</span>
            <span>Data Stream</span>
          </Link>
          <Link to="/dashboard" className="neon-sidebar-link">
            <span className="neon-sidebar-icon">SYS</span>
            <span>System Log</span>
          </Link>
        </nav>

        <Link to="/practice" className="neon-init-button">
          INITIATE_TEST
        </Link>

        <div className="neon-sidebar-foot">
          <Link to="/dashboard" className="neon-sidebar-mini-link">
            <span className="neon-sidebar-icon">SUP</span>
            <span>Support</span>
          </Link>
          <Link to="/dashboard" className="neon-sidebar-mini-link">
            <span className="neon-sidebar-icon">DIA</span>
            <span>Diagnostics</span>
          </Link>
        </div>
      </aside>

      <main className="neon-main">
        <header className="neon-topbar">
          <div className="neon-topbar-left">
            <div className="neon-brand">NEON_PRECISION</div>
            <label className="neon-search">
              <span>QRY</span>
              <input type="text" placeholder="SEARCH_MODULES..." aria-label="Search modules" />
            </label>
          </div>

          <div className="neon-topbar-right">
            <div className="neon-topbar-actions" aria-hidden="true">
              <span>NTF</span>
              <span>CFG</span>
            </div>
            <div className="neon-user">
              <div className="neon-user-copy">
                <span>Rank_Elite</span>
                <strong>ADMIN_01</strong>
              </div>
              <div className="neon-user-avatar">A1</div>
            </div>
          </div>
        </header>

        <section className="neon-canvas">
          <div className="neon-header-row">
            <div>
              <h1>
                MODULE_SELECT <span>//</span> <em>ALL_MODES</em>
              </h1>
              <div className="neon-header-underline" />
            </div>
            <div className="neon-system-status">
              <span>System Status</span>
              <strong>
                <i />
                LIVE_FEED_ACTIVE
              </strong>
            </div>
          </div>

          <div className="neon-module-grid">
            {modes.map((mode) => (
              <article key={mode.title} className="neon-module-card">
                <div className="neon-card-status">
                  <span className={`neon-pill neon-pill-${mode.tone}`}>
                    <i />
                    {mode.badge}
                  </span>
                </div>

                <div className="neon-card-head">
                  <span className="neon-module-icon">{mode.icon}</span>
                  <h2>{mode.title}</h2>
                </div>

                <p>{mode.description}</p>

                <div className="neon-card-foot">
                  <span>{mode.meta}</span>
                  <Link to={mode.route} className="neon-card-action">
                    {mode.action}
                    <b>&gt;</b>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="neon-corner-data neon-corner-data-left">
            <span>CPU_LOAD: 12%</span>
            <span>MEMORY_ALLOC: 4.2GB</span>
            <span>SIGNAL_STRENGTH: NOMINAL</span>
            <span>ENCRYPTION: AES-256-ACTIVE</span>
          </div>

          <div className="neon-corner-data neon-corner-data-right">
            <span>LOCAL_TIME: {localTime}</span>
            <span>SESSION_ID: 0xFF-7A21-B9</span>
            <span>KERNEL: PRECISION_V3</span>
            <span>LATENCY: 14MS</span>
          </div>
        </section>

        <footer className="neon-statusbar">
          <div>
            <span>SYSTEM_STABLE</span>
            <span className="is-primary">SYNCING_TO_CLOUD...</span>
          </div>
          <div>
            <button type="button" className="neon-card-action neon-card-action-button" onClick={onLogout}>
              LOGOUT
              <b>&gt;</b>
            </button>
          </div>
        </footer>

        <Link to="/practice" className="neon-fab" aria-label="Start test">
          +
        </Link>
      </main>
    </div>
  );
};
