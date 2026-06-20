# Lane E Live Evidence - 2026-06-21 KST

Branch: `jacobex/live-lane-text-research-e2e`

## Result

Verified live evidence was produced for DF-210, DF-212, DF-213, DF-214,
DF-215, DF-223, and DF-224. DF-205 remains open because this shared worker did
not perform a destructive Codex logout/relogin cycle or clean-machine secret
lifecycle run.

## Key Evidence

- Auth/App Server smoke:
  `auth-bootstrap-smoke.json`
  SHA-256 `4803348fa684e1eaeb6662be04d7877e180ce8178340db2d92049e2d1a465dff`
  thread `019ee6ab-9437-7520-9e6f-5bdd58b6bd41`, turn
  `019ee6ab-96a4-7270-b6e9-829d5415721`, account `chatgpt`.
- Research Pack App Server turn:
  `app-server-research-pack-turn.json`
  SHA-256 `097f320a258a8f60f491de1d03bdca51f42fead83dcb14731d8f6104fd49e014`
  thread `019ee6a8-4eeb-74d0-869d-b065fd6184a3`, turn
  `019ee6a8-5136-70a3-b3aa-9ebc22f86286`.
- Approved Research Pack:
  `approved-research-pack.json`
  SHA-256 `f55115bc0a82a2162cfbbae13258e1b137d6c963659b65702e7166928a892261`,
  approved hash `sha256:440b17df`.
- Research approval gate:
  `research-approval-gate.json`
  SHA-256 `a59fd0738a1c61a867ee1bb18eb38051dce4dcca6848adff0fa3e6020c8e0517`,
  result `ready`.
- Live text smoke gate:
  `live-text-smoke-gate.json`
  SHA-256 `cafc00f9318c4034a1fa073fe74cc2cd14ed4c00dc0e11ce29db36dac3ba8b61`,
  result `ready`.
- Project-thread restart gate:
  `project-thread-manifest-restart-gate.json`
  SHA-256 `04673ad108fa3bf2e8ab5f4e5f76106cfbb30a96b2949a667ebbf38172bb424d`,
  manifest validation `ready`, resume gate `ready`.

## Captured Sources

- `raw/owid-installed-solar-pv-capacity.csv`
  SHA-256 `6ae86f7c263a8fd4d0e42ce1d894d09f42bec3e7370b8a758087ea31ae5640e5`
- `raw/owid-solar-pv-prices.csv`
  SHA-256 `24bde60f4ca3f802d390eeb13f54c1aa9e130aa67e6e97e608da450fab334518`
- `raw/worldbank-renewable-ex-hydro.json`
  SHA-256 `85163fa043df74ef42384b9b65fc4b4feb646339324b334eb29d248cd056f3f6`

The Research Pack uses these raw paths in `liveEvidenceRefs` and preserves
capture metadata, source hashes, numeric evidence, datasets, quote/table refs,
and Codex App Server provenance.

## Text Pipeline Turns

- Questions: thread `019ee6ab-a74c-7ff3-b5ed-a67f668ab818`, turn
  `019ee6ab-a9dd-7c10-809e-c1e5799ad8f4`.
- Brief: thread `019ee6ab-d51e-7900-b905-daa95ff8ec70`, turn
  `019ee6ab-d786-7aa3-b511-9102750b8c4c`.
- Deck Plan: thread `019ee6ac-a94c-7381-a126-f78b449605d1`, turn
  `019ee6ac-ab9b-79b1-84a0-7459ccc9f4e2`.
- Design System: thread `019ee6ad-751b-7191-a5b8-0c2335f7e7b7`, turn
  `019ee6ad-77b7-76d2-a2ab-8b6844e93623`.
- Layout IR for smoke/resume: thread `019ee6af-e51b-72d1-97b8-b4291523e4df`,
  turn `019ee6af-e7a7-74a0-b469-074a261db193`.
- Text smoke resume next turn: same thread
  `019ee6af-e51b-72d1-97b8-b4291523e4df`, turn
  `019ee6b0-1a9c-7cf1-9a46-dada230836ff`.

## Project Thread Restart

The restart probe used two App Server processes. The first process produced
worker thread `019ee6b1-1488-7c31-9459-960b542d39f6`, turn
`019ee6b1-1703-7111-9dae-0366406cad76`. After process close and recreation,
`thread/resume` recovered the same worker thread and completed resumed turn
`019ee6b1-2d8f-74d0-a451-27dca543d3eb`.

## Remaining Blocker

DF-205 remains blocked on clean auth lifecycle evidence:

- no destructive `codex logout` / relogin cycle was run in this shared worker;
- no clean macOS account or packaged-app secret lifecycle was available;
- next evidence needed: isolated clean-machine Codex login, logout, relogin,
  secret-store redaction/leak scan, and post-relogin App Server smoke captured
  as persisted JSON.
