# Research Lane Live Evidence Blockers

Date: 2026-06-21 KST
Branch: `jacobex/live-research-evidence`
Base observed before this note: `7beb567abcd27343c3817ee4804f59b9858cc716`

Scope:

- `#142` / DF-223 / Live evidence, claim, dataset pipeline
- `#143` / DF-224 / Live research review and approval gate
- `#150` / DF-240 / generation report and export provenance
- `#154` / DF-244 / cost, latency, and usage display
- `#152` / DF-242 / five live benchmarks

## GitHub state observed

Public issue pages opened on 2026-06-21 KST showed all five assigned issues
still open with `status:needs-live-evidence`:

- `https://github.com/sunseol/chatgppt/issues/142`
- `https://github.com/sunseol/chatgppt/issues/143`
- `https://github.com/sunseol/chatgppt/issues/150`
- `https://github.com/sunseol/chatgppt/issues/154`
- `https://github.com/sunseol/chatgppt/issues/152`

The local `gh` CLI is unavailable in this worker environment:
`zsh:1: command not found: gh`. The unauthenticated GitHub REST API returned
rate-limit responses for direct issue JSON fetches, so issue details were read
from the public pages and issue comments were read through the connected GitHub
app.

## Packaged app blocker

The only packaged app artifact in this lane is:

- `release-artifacts/DeckForge_0.1.0_aarch64.dmg`
- `release-artifacts/DeckForge_0.1.0_aarch64.dmg.sha256`

Package integrity evidence:

- `shasum -a 256 release-artifacts/DeckForge_0.1.0_aarch64.dmg`
  returned
  `ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d`.
- The committed `.sha256` file contains the same digest.
- `hdiutil imageinfo release-artifacts/DeckForge_0.1.0_aarch64.dmg`
  completed and identified a compressed read-only UDIF image.
- `hdiutil attach -readonly -nobrowse ...` mounted the image at
  `/Volumes/DeckForge`.
- The mounted bundle contained only:
  - `/Volumes/DeckForge/DeckForge.app/Contents/Info.plist`
  - `/Volumes/DeckForge/DeckForge.app/Contents/MacOS/deckforge`
  - `/Volumes/DeckForge/DeckForge.app/Contents/Resources/DeckForge.icns`
- `plutil -p /Volumes/DeckForge/DeckForge.app/Contents/Info.plist`
  showed `CFBundleIdentifier` `app.deckforge.desktop` and version `0.1.0`.

Launch-assessment blocker:

- `codesign --verify --deep --strict --verbose=2 /Volumes/DeckForge/DeckForge.app`
  exited 1 with
  `code has no resources but signature indicates they must be present`.
- `spctl --assess --type execute --verbose=4 /Volumes/DeckForge/DeckForge.app`
  exited 1 with the same message.
- The image was detached afterwards with `hdiutil detach /Volumes/DeckForge`.

Current Lane A package recheck evidence was captured at
`2026-06-20T19:30:49Z` and preserved in
`docs/live-evidence/runtime-text-research-package-assessment-20260620T193049Z.json`.
The bundle digest is
`sha256:74795a764c6aae6660a21bc160a65e59e725f45f7e9fba9c3aff4c6d71a4a44a`.
It confirms the same DMG SHA-256
`ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d`,
records the mounted bundle files, records `codesign` exit status `1`, records
`spctl` exit status `1`, and records successful detach status `0`.

Current Lane A authenticated App Server evidence was captured at
`2026-06-20T19:29:29Z` in
`docs/live-evidence/runtime-text-research-live-recheck-20260620T192929Z.json`
with digest
`sha256:c3fe5790996607ff06ffbac3422c9e2f751b2a855d304a2c8775fe09fa082a3f`.
It completed smoke thread/turn
`019ee682-75f6-7f63-a741-9ea51e0beba6` /
`019ee682-7888-74a0-a5e1-29223ff1dcbb` and structured thread/turn
`019ee682-8819-74f3-8f5a-8e5864e54db1` /
`019ee682-8ab0-79d0-9068-b37e428faf04`, proving the research blockers are not
caused by missing Codex authentication or App Server availability.

This blocks the packaged-app/manual QA required by DF-223, DF-224, DF-244, and
DF-242 in this lane. It is also relevant to DF-240 because the real production
report/export bundle must be produced from the packaged compositor/export path.

## Ticket disposition

### DF-223 / #142

Status: hard-blocked on packaged-app Research Pack evidence.

Current code can build and validate `ResearchPack.liveEvidenceRefs` from
captured source metadata plus evidence extraction results, and the local tests
cover that contract. The remaining acceptance requires an app-produced live
Research Pack with captured source artifacts, quote/table refs, numeric or
dataset evidence, provider provenance, and a claim-to-source roundtrip. This
lane has no persisted live Research Pack artifact in `release-artifacts`, and
the packaged app cannot be assessed because of the signing/resource error above.

Additional implementation finding: the live `web_search` workflow can create a
candidate-source Research Pack, but `desktop-live-web-search-workflow.ts` builds
that pack with empty `claims`, `datasets`, and no source capture metadata.
DF-223 still requires a later source-capture plus evidence-extraction step.

### DF-224 / #143

Status: hard-blocked on packaged-app research approval manual QA.

The production review surface and approval gate can display persisted source
capture metadata, evidence refs, provider provenance, source exclusion,
reinforcement, blockers, and a ready-state approval action. The remaining
acceptance requires a non-simulated packaged-app run where those values are
created by the app and approved through the UI. The mounted package currently
fails `codesign` and `spctl`, so that QA cannot be completed in this lane.

### DF-240 / #150

Status: hard-blocked on image-lane compositor/export artifacts plus packaged
export QA.

The local report/export lineage gate validates slide-level source ids, text
turns, prompt versions, image provider turn ids, image artifacts, compositor hashes,
export hashes, contamination, and secret leakage. The remaining acceptance
requires real image provider artifacts and compositor/export outputs from the
Image lane. No compositor/export artifact manifest or final export bundle is
present in this lane's `release-artifacts`, and the current packaged app cannot
be launch-assessed.

### DF-244 / #154

Status: hard-blocked on packaged-app usage-summary QA with real image usage
disclosure.

Local code maps Codex App Server token usage notifications into usage summaries
and the app progress panel is covered by integration tests. The remaining
acceptance requires packaged-app manual QA with real provider usage/cost
payloads and real image Codex usage disclosure evidence. The package fails
launch assessment, and this lane has no real image usage confirmation JSON
artifact in `release-artifacts`.

### DF-242 / #152

Status: hard-blocked on downstream Live Golden Path and benchmark bundles.

The local benchmark evidence gate requires the five named scenarios, five
distinct output bundle sets, no mock score contamination, classified failures,
and at least four named Live Golden Path completions. `docs/live-benchmark-report.md`
currently records `Passed live benchmarks: 0 of 5`, and this lane has no
benchmark output bundles under `release-artifacts`. The packaged app signing
failure also blocks packaged Golden Path benchmark execution.

## Verification to run from this state

The lane remains locally verifiable even though the live evidence is blocked:

```sh
bun test src/lib/live-research-evidence.test.ts src/lib/live-research-number-evidence.test.ts src/lib/live-research-evidence-builder.test.ts src/lib/live-research-pack-builder.test.ts src/lib/live-research-approval-gate.test.ts src/lib/live-research-approval-action.test.ts src/lib/research-source-capture-bundle.test.ts src/lib/research-review-actions.test.ts src/lib/live-generation-report-lineage.test.ts src/lib/live-usage-summary.test.ts
bun test src/lib/live-benchmark-evidence.test.ts
bun run typecheck
bun run verify
bun run lint
```
