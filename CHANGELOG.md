# Changelog

## 0.6.0-experimental.28 (2026-09-10)

First release since `.27` — also picks up everything merged to `main` since May
that hadn't gone out yet: the August internal refactor, the new e2e suite, and
this release's own Monaco/Molstar bump.

### Breaking changes

- **`monaco-editor` peer dependency bumped to `0.56+`.** Monaco 0.56 restructured its
  package layout (e.g. `esm/vs/basic-languages/*` moved to `languages/definitions/*`).
  Consuming apps must upgrade their own `monaco-editor` dependency to `^0.56.0` —
  older versions will fail to resolve `MolViewEditor`'s Monaco imports.

- **`molstar` peer dependency bumped to `5.11+`.** No MolViewSpec/state-builder schema
  changes in this range (verified against molstar's `v5.9.0`–`v5.11.0` source diff) —
  purely a version-alignment bump. Consuming apps should upgrade their own `molstar`
  dependency to `^5.11.0`.

### Internal refactoring

No public API changes (`src/mod.ts` exports are unaffected) — internal only.

- Decomposed the monolithic `types`/`utils` directories and split up `UIBuilder.tsx`
  (which shrank by 470+ lines) into focused modules: `state-builder/animation/*`,
  `state-builder-ui/rows/*`, `state-builder-ui/sections/*`, `state-builder-ui/state/*`,
  `utils/monaco/*`, plus extracted dialog/panel components
  (`ImportMvsTreeDialog.tsx`, `RawJsonPanel.tsx`).
- Deduplicated per-kind node-helper field components down to shared ones, with a
  follow-up fix for a couple of helpers missed in that pass and a missing
  "implemented kinds" guard.

### Testing

- Added a Playwright e2e suite (`e2e/node-helpers.spec.ts`, `e2e/state-builder.spec.ts`)
  covering every node-helper dialog's title/tabs, the guard that hides node kinds with
  no editing helper from kind pickers, and core state-builder flows (load, Raw tab,
  undo/redo) — plus fixes for real bugs it caught along the way.
- Wired the suite into CI, gated to pull requests and release tags (a full run takes
  several minutes, so it's skipped on ordinary pushes).

### Fixes

- Restored explicit `deno.json`/`aliases.ts` entries for the `monaco-editor` subpaths
  actually used by `MolViewEditor` and the build (`monaco.contribution`, `javascript`
  language definition, editor/typescript workers). The generic prefix mapping introduced
  alongside the Monaco 0.56 bump doesn't work in Deno's import map for `npm:`-scheme
  targets, which broke `deno task build`/`dev` entirely.
- Fixed a flaky e2e timeout on the Volume node helper test (`test.slow()`), which fetches
  real remote volume data and is markedly heavier than the suite's other cases.

---

## 0.6.0-experimental.3 (2026-05-12)

### Breaking changes

- **React 19+ required.** `UIBuilderProvider` now injects theme styles via React 19's
  `<style precedence>` API. React 18 is no longer supported.

### Changes

- **CSS is self-contained.** Theme variables and utility styles are injected automatically
  by `UIBuilderProvider` — no CSS file import is needed. The `styles.css` file is removed.
  Tailwind v4 consumers only need an `@source` directive pointing at the library's
  `src/state-builder-ui` directory.

- `input[type=number]` spinner-hiding rule is now scoped to `[data-ui-builder]` instead
  of being a global selector.

- Module documentation updated to cover all components including the state builder.

---

## 0.6.0-experimental.0 (2026-05-10)

Experimental React migration. The API may still change before a stable 0.6.x release.

### Breaking changes

- **React instead of Preact.** The peer dependency is now `react@19+` and `react-dom@19+`.
  Replace `preact` and `preact/hooks` imports with `react` in your application.

- **Molstar is a peer dependency — CDN loading removed.** Version 0.5.x could inject
  Molstar from a CDN at runtime. 0.6.x requires the consuming app to bundle Molstar
  (5.7+) itself and pass a `PluginUIContext` instance where needed.

- **`MolViewEditor` new required peer: `monaco-editor@0.55+`.** The editor no longer
  accepts a lazily-loaded Monaco instance; Monaco must be available in the bundle.

- **`MolViewEditor` — new props:** `value` (controlled input), `commonCode`,
  `className`, `onEditorMount`, `hybridMode`, `plugin`, `cameraSnapshot`,
  `diagnosticCodesToIgnore`.

### New components

- `MolViewStateBuilder` — standalone visual MVS node-tree builder with imperative
  `ref` handle (`UIBuilderHandle`).
- `BuilderWithViewer` — builder + Molstar viewer side by side.
- `BuilderWithEditorAndViewer` — full three-panel combo: builder + editor + viewer.
- `UIBuilderProvider` / `UIBuilder` — lower-level primitives for custom layouts.

### New hooks & utilities

- `useSyncToBuilder` — evaluates MVS JavaScript and pushes the result into a
  `UIBuilderHandle`.
- `evaluateCodeToMVSTree` — run MVS builder code and get a raw MVS tree back.
- `snapshotToCameraParams` — convert a Molstar camera snapshot to `CameraParams`.
- `filterMetadataBySelector` — filter extracted structure metadata by a selector.

### Other changes

- Molstar peer dependency bumped to **5.8.0**.
- Package scope moved from `@zachcp` to **`@molstar`** (already done in 0.5.x stable
  releases; documented here for completeness).

---

## 0.5.2 (2026-04-03)

Last stable Preact-based release. Use 0.5.x if you need a stable API without the
visual state builder.

### Changes

- Dependency bumps and minor fixes.

## 0.5.0 (2026-01-14)

- Moved package scope from `@zachcp/molstar-components` to `@molstar/molstar-components`.
- Stable Preact-based release with `MolstarViewer`, `MolViewEditor`, `EditorWithViewer`.
