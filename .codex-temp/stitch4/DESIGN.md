# Design System Strategy: Neon Precision

## 1. Overview & Creative North Star
**The Kinetic Terminal**
This design system is engineered for elite performance. It moves away from the passive, soft aesthetics of the past toward a high-frequency, technical environment. The "Kinetic Terminal" North Star treats the typing application not as a simple utility, but as a high-performance instrument—think of a Formula 1 telemetry dashboard or a high-end code editor.

The system breaks the "template" look through **intentional technical asymmetry**. Information isn't just placed on a grid; it is architected. We use aggressive typography scales and high-contrast color pairings to create a sense of urgency and accuracy. Overlapping elements and "data-dense" modules provide an editorial depth that feels bespoke and authoritative.

## 2. Colors & Atmospheric Depth
The palette is anchored in **Deep Charcoal (#070f12)** and electrified by **Electric Cyan (#96f8ff)**. This isn't just a dark mode; it is a high-contrast environment designed to minimize ocular strain while maximizing focus.

### The "No-Line" Rule
To achieve a premium, integrated feel, designers are prohibited from using 1px solid borders to define major sections. Boundaries must be established through **background color shifts**. For example, a sidebar using `surface-container-low` (#0c1518) should sit flush against the main workspace `surface` (#070f12). This creates a seamless, structural flow rather than a boxed-in "template" feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tokens to create "nested" depth:
*   **Base Layer:** `surface` (#070f12)
*   **Secondary Content:** `surface-container-low` (#0c1518)
*   **Interactive Modules:** `surface-container-high` (#172125)
*   **Active Overlays:** `surface-container-highest` (#1c272c)

### The "Glass & Gradient" Rule
To avoid a flat "out-of-the-box" look, floating elements (modals, tooltips) must utilize **Glassmorphism**. Use semi-transparent surface colors with a `backdrop-blur` effect. 
*   **Signature Glows:** Use the `primary` (#96f8ff) and `primary-container` (#00f1fd) tokens to create subtle outer glows on active elements, such as the typing caret or the "active" word. This reinforces the "Neon" energy.
*   **Soulful Gradients:** For primary CTAs, use a subtle linear gradient from `primary` (#96f8ff) to `primary-dim` (#00e2ed). This adds a sense of light-source direction that flat hex codes cannot achieve.

## 3. Typography
The typography is sharp, technical, and unapologetic. We utilize two families: **Space Grotesk** for structural, technical headlines and **Inter** for high-performance reading and body text.

*   **Display & Headline (Space Grotesk):** These levels (e.g., `display-lg` at 3.5rem) should be used for performance metrics like WPM (Words Per Minute) and Accuracy. The wide aperture of Space Grotesk emphasizes the "Technical Precision" of the brand.
*   **Body & Title (Inter):** Used for the actual typing experience. The `title-lg` (1.375rem) and `body-lg` (1rem) tokens are tuned for maximum readability during high-speed input.
*   **Labels (Space Grotesk):** Small caps or high-tracking labels (`label-sm` at 0.6875rem) provide a "blueprint" aesthetic, making the app feel like a precision tool.

## 4. Elevation & Depth
In this system, depth is a function of light and tone, not physical shadows.

*   **The Layering Principle:** Stacking is the primary driver of hierarchy. Place a `surface-container-lowest` (#000000) card on a `surface-container-low` (#0c1518) section to create a soft, natural "recessed" look.
*   **Ambient Shadows:** When an element must float (like a profile dropdown), shadows must be extra-diffused. Use a blur of 20px–40px at 8% opacity, tinted with the `on-surface` (#f0f8fc) color. This mimics the ambient light of a glowing screen.
*   **The "Ghost Border" Fallback:** If a container requires a defined edge for accessibility, use a **Ghost Border**. Apply `outline-variant` (#41494d) at 15% opacity. Never use 100% opaque, high-contrast borders.

## 5. Components

### The "Pulse" Caret (Cursor)
The most critical component. It should use `primary` (#96f8ff) with a 4px outer glow (`primary-container` at 30% opacity). It is the heartbeat of the application.

### Buttons
*   **Primary:** Solid `primary` (#96f8ff) fill with `on-primary` (#005f64) text. No border. Use `lg` (0.5rem) roundedness for a modern, "tech-capsule" feel.
*   **Secondary:** `surface-container-high` (#172125) background with a `primary` (#96f8ff) "Ghost Border" (20% opacity).
*   **Tertiary:** Text-only using `primary` (#96f8ff) with a subtle underline on hover.

### Performance Chips
Used for displaying live stats (e.g., "Error Rate"). Use `error_container` (#9f0519) with `on_error_container` (#ffa8a3) for negative metrics, and `tertiary_container` (#00ffa3) for positive streaks.

### Input Fields & Workspace
Forbid the use of divider lines between words or letters. Use the **Spacing Scale** (specifically `spacing-8` or `1.75rem`) to create rhythmic breathing room. The typing area should be a "clean room"—no distractions, defined only by a subtle background shift to `surface-container-lowest`.

### High-Performance Tooltips
Small, dark, and sharp. Use `surface-bright` (#222e33) with `label-sm` typography. The corner radius should be `sm` (0.125rem) to maintain the "sharp" technical aesthetic.

## 6. Do's and Don'ts

*   **DO:** Use `tertiary` (#b1ffce) for "Success" states and "Perfect" streaks to provide a refreshing break from the cyan/charcoal dominance.
*   **DO:** Leverage `spacing-24` (5.5rem) for massive margins in the hero area to create an editorial, high-end feel.
*   **DON'T:** Use the old brand's purple. If a warmer tone is needed for an error, strictly use the `error` (#ff716c) palette.
*   **DON'T:** Use standard 1px grey borders. If you find yourself reaching for a border, ask if a background color shift (e.g., `surface` vs `surface-container-low`) can do the job instead.
*   **DO:** Experiment with **asymmetric layouts**. Place the primary metric (WPM) off-center or overlapping a container edge to break the "standard dashboard" monotony.