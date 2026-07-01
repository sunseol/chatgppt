# AI Worker Operating Contract

- Purpose: make every AI worker treat executable evidence as the source of truth.
- Scope: all GPPT / DeckForge planning, implementation, QA, visual review, packaging, and release work.
- Status: mandatory project rule. If this document conflicts with a lower-level task note, this document wins unless the user explicitly overrides it.

---

## 1. Core Principle

AI does not get final judgment authority.

AI may propose, implement, inspect, summarize, and raise defect candidates. It must not convert a natural-language report into "done" without machine-verifiable evidence.

The project rule is:

```text
Documentation does not imply Done.
AI says passed does not imply Done.
Done implies machine-verifiable evidence exists.
```

For implementation, bugfix, test, visual QA, packaging, and release tasks, a markdown report is never the primary artifact. The primary artifact is source/config/test diff plus execution evidence.

Docs-only completion is valid only when the task kind is explicitly `research` or `specification`.

---

## 2. Required Work Types

Every non-trivial task must be classified before work begins.

Allowed kinds:

- `research`
- `specification`
- `implementation`
- `bugfix`
- `test`
- `release`

If kind is `implementation`, `bugfix`, `test`, or `release`, the task cannot be completed by changing only `.md`, `.csv`, screenshots, or report files.

Exception: if discovery proves the requested work is actually documentation-only, reclassify it as `specification` in the final response and do not claim implementation.

---

## 3. Task State Machine

Use this state model for implementation, bugfix, visual QA, packaging, and release work:

```text
Proposed
-> Reproduced
-> Implemented
-> TargetVerified
-> RegressionVerified
-> Packaged
-> Accepted
```

Required evidence by transition:

| Transition | Evidence required |
|---|---|
| Proposed -> Reproduced | failing test, failing command, screenshot diff, runtime trace, or deterministic reproduction note |
| Reproduced -> Implemented | source/config/test diff |
| Implemented -> TargetVerified | acceptance-specific command passes |
| TargetVerified -> RegressionVerified | relevant regression suite passes |
| RegressionVerified -> Packaged | runnable app, PPTX, DMG, or other user-surface artifact created |
| Packaged -> Accepted | exact SHA/hash confirmation and independent or human approval |

AI workers may mark work as Candidate or Implemented. Verified and Accepted require external evidence. Human approval is required for new visual baselines, public release, and aesthetic trade-off acceptance.

---

## 4. Task Manifest Rule

For implementation-grade work, write or infer a manifest before declaring success. It can live in the task ticket, PR body, or temporary notes, but final status must map to it.

Minimal shape:

```yaml
id: DF-000
kind: implementation
acceptance:
  - id: AC-1
    description: user-visible behavior
    oracle: command
    command: bun test path/to/test.test.ts
required_change_classes:
  any_of:
    - deck-scribe-craft-07/src/**
    - deck-scribe-craft-07/src-tauri/**
    - deck-scribe-craft-07/tests/**
    - deck-scribe-craft-07/scripts/**
forbidden_completion:
  docs_only: true
  failing_required_checks: true
  missing_runtime_artifact: true
  stale_evidence: true
required_evidence:
  - code-diff
  - targeted-test
  - regression-test
  - runtime-trace
  - artifact-hash
```

Do not invent evidence paths. If a required artifact was not produced, say so.

---

## 5. Evidence Rule

Primary evidence should be machine-generated JSON, XML, test output, trace output, screenshots with hashes, package hashes, or CI status tied to the exact source revision.

Preferred order:

```text
test execution
-> raw event/log collection
-> verification.json
-> hash/provenance check
-> CI or local gate decision
-> generated human-readable markdown
```

Markdown reports are derivative. They summarize `verification.json` or equivalent evidence; they do not replace it.

Evidence must include, when applicable:

- command
- exit code
- source git SHA or explicit dirty-worktree note
- package hash
- screenshot hash
- generated artifact hash
- trace/event path
- acceptance item id

If work is done in a dirty worktree, do not claim release readiness or exact-build acceptance. You may report local verification only.

---

## 6. Exact-Build Gate

Release and acceptance evidence must refer to the same source and artifact identity.

Fail the gate if:

- tests ran before later code changes
- screenshots came from an older commit
- DMG/PPTX hash differs from the tested artifact
- report was generated from build A while the package came from build B
- release evidence was produced from an unexplained dirty worktree
- snapshot baseline was updated without rerunning the actual visual test

Target invariant:

```text
source identity == tested identity == packaged identity == evidence identity
hash(tested package) == hash(released package)
```

For local work where this cannot be fully enforced, explicitly label the result "local candidate" instead of "accepted" or "release ready".

---

## 7. Visual QA Rule

AI is a defect-candidate detector, not a final visual oracle.

AI may:

- find suspicious regions
- propose defect type
- describe aesthetic risk
- suggest a fix

Deterministic gates decide:

- overlap
- clipping
- out-of-canvas elements
- missing images
- minimum text size
- broken links
- missing sources
- stale artifacts
- PPTX structure validity
- identical SHA / artifact mismatch

Visual pass is a hard-gate conjunction:

```text
VisualPass =
  geometry_gate
  AND text_gate
  AND asset_gate
  AND render_gate
  AND regression_gate
```

AI review is recorded separately:

```text
AIAlert in { none, review, critical }
```

If a hard gate fails, the result fails even when AI says the slide looks good.

---

## 8. DeckForge Visual Pipeline

DeckForge visual validation must prefer deterministic checks before model judgment.

Required order for serious visual work:

1. `LayoutIR` validator
   - bounds
   - overlap
   - text fit
   - font and fallback
   - safe zone
   - z-order
   - image presence/decode/aspect ratio
2. Web renderer
   - fixed viewport and scale
   - fonts loaded
   - all images decoded
   - layout stable
   - no pending animation
   - two identical frames before screenshot
3. Visual diff
   - pixel diff
   - structural/perceptual diff
   - semantic region diff
4. `EditableLayerModel` validator
   - stable object IDs
   - editability
   - no unintended PNG flattening
   - semantic object mapping
5. PPTX structural validator
   - Open XML / PresentationML structure
   - relationships
   - missing parts
   - media decode
   - slide master/layout
6. PPTX real render
   - real PowerPoint or fixed renderer
   - exported PDF/PNG compared to web preview
7. Round-trip validator
   - export
   - reopen
   - edit title
   - save
   - reopen
   - compare object graph
8. AI visual review
   - bounded region questions only
   - bbox or region ID required
   - taxonomy defect type required
   - confidence required
9. Visual mutation suite
   - injected defects must be detected
10. Human baseline review
   - required for new templates and intentional large design changes

Browser Playwright tests do not replace packaged macOS app validation. Tauri/macOS package smoke needs native UI automation, app instrumentation, or a constrained manual golden path.

---

## 9. AI Visual Review Prompt Contract

Do not ask vague questions such as "does this slide look okay?"

Ask one defect class at a time:

- Does title text overlap body text?
- Is the source line visible?
- Does a chart label cover a data mark?
- Is the body text clipped at the bottom?
- Is the key number distinguishable from the background?

AI response must be structured:

```json
{
  "slideId": "slide-07",
  "defectType": "text-clipping",
  "bbox": [812, 566, 214, 78],
  "severity": "major",
  "confidence": 0.78,
  "visibleEvidence": "bottom stroke appears clipped at the text box boundary",
  "recommendedAction": "increase text box height or shorten one line"
}
```

Invalid AI review:

- no bbox or region ID
- no fixed defect taxonomy
- mixes observed pixels with speculation
- claims absence of defects as proof
- reviews the same output it generated with full self-justifying context

AI can find defects. It cannot prove there are none.

---

## 10. Visual Mutation Rule

The QA system itself must be tested.

Inject known visual defects and verify detection:

- title shifted by a few pixels
- body text clipped
- source removed
- foreground and background contrast reduced
- blank PNG substituted for an image
- duplicate image substituted
- element moved out of canvas
- font fallback forced
- chart label moved behind mark
- title expanded from 2 lines to 4 lines
- number unit changed
- editable object flattened into PNG
- z-index inverted

Measure:

```text
VisualMutationScore =
  weighted detected defects / weighted injected defects
```

Policy:

- one missed P0 mutation blocks release
- P1/P2 weighted recall below threshold blocks or warns according to release policy
- AI detection with wrong bbox counts as missed
- "there is a problem" without location/type counts as missed

Keep some mutations hidden from implementation agents.

---

## 11. Role Separation

The same actor should not perform all of these:

```text
design
-> implementation
-> baseline update
-> QA
-> final pass declaration
```

Separate when practical:

- Implementer Agent: code, tests, candidate artifact
- Verifier Agent: independent checkout or read-only verification against acceptance criteria
- Human Approver: new visual baseline, threshold exceptions, public release

Forbidden same-actor approvals:

- screen change and snapshot baseline approval
- test deletion and test pass approval
- threshold relaxation and PR approval
- mutation suite modification and mutation pass approval
- release artifact creation and final checksum approval

---

## 12. Planning Limit

Plans are useful. Planning loops are not evidence.

For implementation and bugfix tasks:

- at most one planning document before executable change
- plan should be short enough to execute from
- the next artifact after planning must be one of:
  - failing test
  - reproduction script
  - source/config/test diff
  - execution trace

Do not create a second design/report document before any executable diff unless the user explicitly asks for documentation-only work.

Track these mentally and report if relevant:

```text
TimeToFirstExecutableChange = first source/test diff time - task start time
NarrativeOnlyRate = docs-only implementation attempts / total implementation attempts
```

---

## 13. Final Response Rule

For implementation-grade tasks, final response must include:

- changed files
- what executable behavior changed
- targeted verification command and result
- regression verification command and result
- user-surface artifact or reason it was not applicable
- known gaps

Never say "done", "verified", "release ready", or "accepted" if the evidence only supports "implemented candidate".

For documentation-only tasks, say that the result is a specification/documentation change and do not imply product behavior changed.
