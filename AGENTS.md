# Repository Guidelines

## Project Structure & Module Organization

This repository contains a browser-based Three.js truck simulator built with TypeScript and Vite. `src/main.ts` wires together the render loop and major systems. Keep domain code in the existing folders: `src/core/` for input and audio, `src/vehicle/` for vehicle physics and models, `src/world/` for procedural roads, terrain, and textures, `src/camera/` for camera behavior, and `src/ui/` for the HUD. Shared gameplay constants belong in `src/config.ts`. The root `index.html` contains the page shell and HUD styling. Playwright smoke tests live in `tests/e2e/`, with project and server settings in `playwright.config.ts`. `public/` is available for static assets; `dist/` is generated build output and should not be edited manually.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies from `package-lock.json`.
- `npm run dev` starts Vite on port 3000 and opens the simulator locally.
- `npm run build` runs strict TypeScript checks, then creates a production bundle in `dist/`.
- `npm run preview` serves the production bundle for final browser verification.
- `npx playwright install chromium` installs the browser binary required for local E2E runs.
- `npm run test:e2e` runs the Playwright smoke suite in desktop and touch-enabled mobile Chromium projects.
- `npm run test:e2e:ui` opens Playwright's interactive UI for local test development.

Run `npm run build` followed by `npm run test:e2e` before submitting changes. There is currently no separate lint command.

## Coding Style & Naming Conventions

Follow the established TypeScript style: two-space indentation, single quotes, semicolons, and ES modules. Use `PascalCase` for classes and files that export them (`RoadManager.ts`), `camelCase` for methods and variables, and `UPPER_SNAKE_CASE` for shared constants such as `CONFIG`. Keep public APIs typed and prefer Three.js primitives over untyped object shapes. The compiler rejects unused locals, unused parameters, implicit returns, and other strict-mode violations. Place tunable physics, road, and camera values in `src/config.ts` instead of scattering magic numbers.

## Testing Guidelines

Use Playwright for browser-visible behavior and keep tests under `tests/e2e/`. Assert through the simulator's public DOM and visible HUD state rather than internal `window.game` or Three.js objects. Prefer polling assertions with bounded timeouts for animation-driven values instead of fixed delays. The smoke suite covers desktop and touch-enabled mobile Chromium; supplement it with focused manual checks for behavior outside that coverage, such as road generation and window resizing. For visual changes, compare desktop and narrow viewport layouts and include screenshots in the pull request.

## Commit & Pull Request Guidelines

The short history uses concise, lowercase summaries (for example, `cleaned version`). Keep commit subjects imperative and focused, such as `fix off-road steering`. Pull requests should explain the user-visible change, identify touched systems, list verification performed, link any issue, and attach screenshots or a short capture for rendering or HUD changes. Do not commit `node_modules/`, local environment files, Playwright artifacts, or newly generated `dist/` assets.
