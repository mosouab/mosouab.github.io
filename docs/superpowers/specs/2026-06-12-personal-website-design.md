# Personal Website — Design Spec

Date: 2026-06-12 · Status: approved by Mo

## Goal

A personal site for Mohamed Souab (mosouab) that showcases projects and acts as a
casual resume, in English. Primary audience: recruiters and technical teams met at
events (VivaTech 2026 and after) via a QR code, and anyone landing from GitHub/LinkedIn.

## Visual direction

Light-theme adaptation of stormix.dev, approved via mockup:

- Monospace body font: Geist Mono. Display font for big headings: Doto (dot-matrix).
- Near-white palette (#fbfbfa bg, #161616 ink), hairline #e4e4e4 borders, sharp corners
  (2px radius), muted green accent (#00875f) for tag rows.
- Scrolling marquee banner at top — evergreen text ("open to internships · robotics &
  embedded AI"), NOT VivaTech-specific.
- Nav links styled as function calls: `.about()`, `.projects()`, `.blog()`, `.cv()`, `.contact()`.
- Section labels in `// COMMENT` style.

## Stack

- Astro 5, vanilla CSS with design tokens, no UI framework.
- Fonts self-hosted via Fontsource packages.
- Content as markdown content collections (projects, blog).

## Pages

- `/` — one-pager: marquee, nav, hero (photo placeholder), about + skill chips,
  experience/education timeline, 3 project cards, recent notes, contact, footer.
- `/projects/<slug>` — small article per project (markdown), with image/video
  placeholders for now. Exactly 3 projects:
  1. `px4-drone` — GPS-denied autonomous quadrotor (ROS 2 Jazzy, MAVROS, RTAB-Map
     VIO/SLAM, RealSense D455, ArUco precision landing, Holybro X500 V2 + RasPi 4).
  2. `ml-digital-twin` — learned quadrotor dynamics in Gazebo; ROS 2 data collection,
     LSTM vs Neural ODE vs XGBoost comparison.
  3. `edgesense` — unsupervised edge predictive maintenance (USAD-style 1D-CNN AE;
     anomaly score, 0–100 health, RUL; Porto metro / hydraulic rig / CMAPSS results).
  No separate /projects index — the homepage section is the index.
- `/blog` + `/blog/<slug>` — markdown notes; ships with one honest starter post.
- `/cv.pdf` — download target (current French PDF for now; English PDF is a follow-up).

## Content rules

- English, casual but credible tone. Facts come from the CV and repo READMEs — no
  invented metrics.
- Media: tasteful hatched placeholders wherever a photo/screenshot/video belongs;
  Mo supplies real media later.

## Deployment & QR

- GitHub Pages via Actions at https://mosouab.github.io (workflow included; push
  happens when Mo is ready). If he re-acquires mosouab.me later, it's a CNAME.
- QR code (SVG + PNG) generated against https://mosouab.github.io.

## Out of scope (for now)

- English CV PDF generation, real media, custom domain, analytics.
