# PR #159 Test Plan

Path: `docs/pr-159-test-plan.md`

Date: 2026-06-22 KST

Branch: `jacobex/live-product-completion`

Status: testable draft, not release-ready.

## Scope

PR #159 is ready for product validation of the current packaged dry-run app
surface and release-evidence handoff. It is still intentionally draft because
the release gate remains blocked by external/manual evidence for DF-205,
DF-233, DF-241, DF-242, DF-245, DF-246, and DF-247.

Current package basis:

- Dry-run archive: `dist/deckforge-macos-dry-run.tgz`
- SHA-256:
  `33706e7521ea381bb37e992d3a9ca7190bf02d38228ad33334226e57f4a779cc`
- Packaged evidence index:
  `docs/live-evidence/release/packaged-live-evidence-index.json`
- Ready packaged entries: DF-235, DF-243, DF-244.

## Local Setup

```sh
git fetch origin main jacobex/live-product-completion
git switch jacobex/live-product-completion
bun install --frozen-lockfile
```

## Fast Browser Smoke

Use this for quick UI validation without packaging:

```sh
bun run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/`.

Expected checks:

- Home screen loads as DeckForge.
- A new project can be created.
- Development workflow screens render without client errors.
- This mode is for fast UI smoke only; use the packaged dry-run smoke below for
  the production live workflow surface.

## Packaged Dry-Run Smoke

Use this for the closest current test surface to PR #159's evidence bundle:

```sh
bun run package:dry-run
PORT=4197 dist/deckforge-macos-dry-run/DeckForge.app/Contents/MacOS/deckforge
```

Open `http://127.0.0.1:4197/`.

Expected checks:

- The app shell and emitted JS/CSS assets load from the dry-run package.
- The Interview step exposes all 11 standard answer fields before a live brief
  exists.
- With Codex CLI logged in through ChatGPT, clicking `Run live interview turns`
  can produce `interview_questions` and `interview_brief` artifacts through the
  localhost App Server bridge.
- A successful live interview run advances the project to
  `INTERVIEW_APPROVAL_PENDING` and shows `Live interview brief is ready.`

Reference evidence:

- `docs/live-evidence/release/computer-use-packaged-live-interview-brief-smoke-20260622.json`
- `docs/live-evidence/release/computer-use-packaged-app-full-brief-after-run-20260622.png`

## Verification Commands

Run these before treating the PR as ready for broader review:

```sh
bun run typecheck
bun test
bun run lint
bun run build
bun run package:dry-run
git diff --check
```

## Known Release Blockers

This PR should not be merged as a release approval until the following are real
ready evidence, not blocked handoffs:

- DF-205 clean-account auth lifecycle and signed clean-machine secret scan.
- DF-233 packaged retry, cancel, and restart-resume queue-control runs.
- DF-241 signed packaged Golden Path E2E.
- DF-242 packaged benchmark output bundles with the required pass count.
- DF-245 Developer ID signing, notarization, stapling, Gatekeeper acceptance,
  and clean-machine run.
- DF-246 non-developer manual QA session.
- DF-247 final release gate after the upstream tickets are ready.
