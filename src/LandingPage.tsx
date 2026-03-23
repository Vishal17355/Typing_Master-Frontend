import React, { useEffect } from "react";
import { Link } from "react-router-dom";

type LandingPageProps = {
  isLoggedIn: boolean;
  onLogin: () => void;
};

const stats = [
  { value: "1.2B", label: "Words Typed" },
  { value: "98%", label: "Average Accuracy" },
  { value: "45%", label: "Faster Workflow" },
];

export const LandingPage: React.FC<LandingPageProps> = ({ isLoggedIn, onLogin }) => {
  const heroImage =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBe9Rcc0_iigdUDdyp1MSXQWBenK_YTMWwdVNDMVI8x3KZSJJO0e6IeO5Rb00yIhDwM6oDBAHwL1eB7OnnYh-5anzJ6i41z1-WlROy0HZSpBNhXDbXSOEvYIEYsEVbGoDUoNMuL-FtVRyGEu086bVUybuGq-6qCCBqTPAavi8AeytmQFNRIsUm4nkOKo-KabygZ0Ic5wY_7TYukjhzTMWbiGdwgHbwLUfAlX28M23M3pYsqO1mqdO5B-p__xNxyuUSoICVIyoxxhcg";

  useEffect(() => {
    const bands = Array.from(document.querySelectorAll<HTMLElement>(".kinetic-bubble-band"));
    if (bands.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.3 }
    );

    bands.forEach((band) => observer.observe(band));
    return () => observer.disconnect();
  }, []);

  const renderBubbleBand = (variant: string) => (
    <div className={`kinetic-bubble-band kinetic-bubble-band-${variant}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );

  return (
    <div className="kinetic-page">
      <div className="kinetic-orb kinetic-orb-left" aria-hidden="true" />
      <div className="kinetic-orb kinetic-orb-right" aria-hidden="true" />

      <header className="kinetic-topbar">
        <div className="kinetic-brand">KINETIC</div>

        <nav className="kinetic-nav" aria-label="Primary">
          <Link to="/practice" className="kinetic-nav-link kinetic-nav-link-active">
            Practice
          </Link>
          <a className="kinetic-nav-link" href="#features">
            Lessons
          </a>
          <a className="kinetic-nav-link" href="#features">
            Tests
          </a>
          <Link to="/dashboard" className="kinetic-nav-link">
            Leaderboard
          </Link>
          <a className="kinetic-nav-link" href="#cta">
            Pricing
          </a>
        </nav>

        <div className="kinetic-topbar-actions">
          {isLoggedIn ? (
            <Link to="/modes" className="kinetic-text-link">
              Open App
            </Link>
          ) : (
            <button type="button" className="kinetic-text-link kinetic-topbar-button" onClick={onLogin}>
              Login
            </button>
          )}

          {isLoggedIn ? (
            <Link to="/modes" className="kinetic-pill-button kinetic-pill-button-solid">
              Open Modes
            </Link>
          ) : (
            <button
              type="button"
              className="kinetic-pill-button kinetic-pill-button-solid kinetic-topbar-button"
              onClick={onLogin}
            >
              Sign Up
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="kinetic-hero">
          <div className="kinetic-hero-copy">
            <div className="kinetic-badge">Performance Grade Engine</div>
            <h1>
              Speed is the <span>Language</span> of the Digital Elite.
            </h1>
            <p>
              Master your flow with a precision-engineered typing engine that adapts to your unique
              rhythm. High-performance tools for the modern professional.
            </p>

            <div className="kinetic-hero-actions">
              {isLoggedIn ? (
                <Link to="/modes" className="kinetic-pill-button kinetic-pill-button-gradient">
                  Start Practicing - Free
                </Link>
              ) : (
                <button
                  type="button"
                  className="kinetic-pill-button kinetic-pill-button-gradient kinetic-topbar-button"
                  onClick={onLogin}
                >
                  Start Practicing - Free
                </button>
              )}

              {isLoggedIn ? (
                <Link to="/practice" className="kinetic-pill-button kinetic-pill-button-ghost">
                  Take a Speed Test
                </Link>
              ) : (
                <button
                  type="button"
                  className="kinetic-pill-button kinetic-pill-button-ghost kinetic-topbar-button"
                  onClick={onLogin}
                >
                  Take a Speed Test
                </button>
              )}
            </div>
          </div>

          <div className="kinetic-hero-visual">
            <div className="kinetic-visual-shell">
              <div className="kinetic-image-frame">
                <img src={heroImage} alt="RGB mechanical keyboard" className="kinetic-hero-image" />
                <div className="kinetic-monitor-content kinetic-monitor-content-overlay">
                  <div className="kinetic-monitor-panel kinetic-monitor-panel-flow">
                    <div className="kinetic-monitor-icon">Z</div>
                    <div>
                      <span className="kinetic-panel-label">Current Flow</span>
                      <strong>142 WPM</strong>
                    </div>
                  </div>
                  <div className="kinetic-monitor-divider" aria-hidden="true" />
                  <div className="kinetic-monitor-panel kinetic-monitor-panel-accuracy">
                    <span className="kinetic-panel-label">Accuracy</span>
                    <strong>99.8%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="kinetic-stats">
          {stats.map((stat) => (
            <article key={stat.label} className="kinetic-stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </section>

        {renderBubbleBand("stats")}

        <section id="features" className="kinetic-features">
          <div className="kinetic-section-heading">
            <h2>
              Engineered for <span>Absolute Dominance.</span>
            </h2>
            <p>
              Harness the power of high-frequency data to eliminate friction and reach your peak
              performance.
            </p>
          </div>

          <div className="kinetic-bento">
            <article className="kinetic-bento-card kinetic-bento-card-wide">
              <span className="kinetic-card-kicker">Adaptive</span>
              <h3>Adaptive Rhythm Engine</h3>
              <p>
                AI-driven lessons that dynamically recalibrate based on your unique finger velocity
                and key-miss patterns. We find the friction so you can erase it.
              </p>
            </article>

            <article className="kinetic-bento-card kinetic-bento-card-graph">
              <span className="kinetic-card-kicker">Biometrics</span>
              <h3>Real-Time Biometrics</h3>
              <p>Monitor WPM, Accuracy, and Heatmaps in a sleek, cockpit-style dashboard.</p>
              <div className="kinetic-mini-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>

            <article className="kinetic-bento-card kinetic-bento-card-compact">
              <span className="kinetic-card-kicker">Arena</span>
              <h3>Global Arena</h3>
              <p>
                Compete in real-time typing sprints against users worldwide and climb the world
                rankings.
              </p>
            </article>

            <article className="kinetic-bento-card kinetic-bento-card-preview">
              <div className="kinetic-window-chrome" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="kinetic-preview-copy">
                <span className="kinetic-preview-label">Live Engine Preview</span>
                <p>
                  <span className="typed">Precision</span> is the{" "}
                  <span className="active">difference</span> between{" "}
                  <span className="error">action</span> and intent. Every keystroke is a commitment
                  to performance and clarity.
                </p>
              </div>
            </article>
          </div>
        </section>

        {renderBubbleBand("features")}

        <section id="cta" className="kinetic-cta">
          <div className="kinetic-cta-card">
            <h2>
              Are you ready to <span>Ascend?</span>
            </h2>
            <p>
              Join 50,000+ type-athletes pushing the boundaries of digital human potential.
            </p>
            {isLoggedIn ? (
              <Link to="/modes" className="kinetic-pill-button kinetic-pill-button-gradient">
                Claim Your Rank Now
              </Link>
            ) : (
              <button
                type="button"
                className="kinetic-pill-button kinetic-pill-button-gradient kinetic-topbar-button"
                onClick={onLogin}
              >
                Claim Your Rank Now
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="kinetic-footer">
        <div>
          <strong>KINETIC ENGINE</strong>
          <span>Precision Performance Typing.</span>
        </div>
        <div className="kinetic-footer-links">
          <a href="#features">About</a>
          <a href="#cta">Contact</a>
          <a href="#cta">Privacy</a>
          <a href="#cta">Terms</a>
        </div>
      </footer>
    </div>
  );
};
