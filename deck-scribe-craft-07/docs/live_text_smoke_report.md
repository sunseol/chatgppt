# Live Text Smoke Report

Date: 2026-06-19

Scope: DF-215 live text pipeline smoke gate, with DF-210 app-server bootstrap as the prerequisite.

Smoke result: partial

## Commands Run

```sh
codex --version
codex login status
codex doctor
codex app-server --stdio
codex app-server generate-json-schema --out /tmp/codex-app-server-schema --experimental
CODEX_NON_INTERACTIVE=1 sh /tmp/codex-install.sh
PATH="/Users/jake/.local/bin:$PATH" codex app-server daemon bootstrap
PATH="/Users/jake/.local/bin:$PATH" codex doctor --json
codex app-server daemon start
codex app-server daemon version
kill -9 <app-server-daemon-pid>
codex app-server --stdio  # schema-constrained structured probe
```

## Runtime Evidence

- `codex --version` returned `codex-cli 0.139.0`.
- `codex login status` returned `Logged in using ChatGPT`.
- `codex doctor` reported auth configured with ChatGPT tokens and websocket connectivity available.
- Before standalone installation, `codex doctor` reported the background App Server as `not running (ephemeral mode)`.
- `codex app-server generate-json-schema --experimental` succeeded and generated v1/v2 protocol schemas, including `v1/InitializeParams.json` and `v1/InitializeResponse.json`.
- `codex app-server --stdio` accepted a JSON-RPC `initialize` request and returned a protocol response:

```json
{
  "id": 1,
  "result": {
    "userAgent": "Codex Desktop/0.139.0 (Mac OS 26.5.1; arm64) dumb (deckforge-smoke; 0.1.0)",
    "codexHome": "/Users/jake/.codex",
    "platformFamily": "unix",
    "platformOs": "macos"
  }
}
```

- The stdio initialize run also emitted `remoteControl/status/changed` with `status: "disabled"`, so this proves protocol initialize over stdio, not a durable managed daemon or remote-control connection.

## Daemon Bootstrap Evidence

The first daemon attempt failed because the managed standalone Codex install was missing:

```text
Error: managed standalone Codex install not found at /Users/jake/.codex/packages/standalone/current/codex
```

That blocker was resolved on this machine by running the official installer in non-interactive mode after inspecting the downloaded installer script:

```text
Codex CLI 0.141.0 installed successfully.
```

`PATH="/Users/jake/.local/bin:$PATH" codex app-server daemon bootstrap` then returned:

```json
{
  "status": "bootstrapped",
  "backend": "pid",
  "autoUpdateEnabled": true,
  "remoteControlEnabled": false,
  "managedCodexPath": "/Users/jake/.codex/packages/standalone/current/codex",
  "managedCodexVersion": "0.141.0",
  "socketPath": "/Users/jake/.codex/app-server-control/app-server-control.sock",
  "cliVersion": "0.141.0",
  "appServerVersion": "0.141.0"
}
```

`PATH="/Users/jake/.local/bin:$PATH" codex doctor --json` reported `app_server.status` as `ok`, with `summary: "background server is running"` and `mode: "persistent"`.

## Authenticated Health Turn Evidence

Using `codex app-server --stdio` with the standalone 0.141.0 binary:

- `initialize` returned `Codex Desktop/0.141.0` and platform `macos`.
- `account/read` returned `requiresOpenaiAuth: true` with account type `chatgpt`. Account email and plan details are intentionally not recorded here.
- `thread/start` created thread `019eda62-40ed-77c2-be18-3677896e947e` with model provider `openai`, model `gpt-5.5`, approval policy `never`, and read-only sandbox.
- `turn/start` completed turn `019eda62-4304-7892-b07e-66b57d50c144` on that thread.
- A later `thread/resume` for the same thread succeeded, and a second `turn/start` completed turn `019eda64-5d8e-7d72-897c-dc84c1d74311`.

The health and resume turns emitted optional MCP/plugin warnings for local configuration, including a missing local `paper` MCP endpoint and unauthenticated Figma MCP access. Those warnings did not prevent the Codex account read, thread creation, turn start, or turn completion.

## Structured Turn Probe Evidence

Using `codex app-server --stdio` with the standalone 0.141.0 binary on 2026-06-18T14:01:33Z:

- `initialize` returned `Codex Desktop/0.141.0` and platform `macos`.
- `account/read` returned `requiresOpenaiAuth: true` with account type `chatgpt`. Account email and plan details are intentionally not recorded here.
- `thread/start` created thread `019edb09-7568-70e2-a74c-5f2cc47e48fc` with model provider `openai`, model `gpt-5.5`, approval policy `never`, and read-only sandbox.
- `turn/start` accepted an `outputSchema` requiring `artifact`, `stage`, `mock`, `fixture`, and `status`.
- `turn/started`, `item/agentMessage/delta`, `item/completed`, `thread/tokenUsage/updated`, and `turn/completed` notifications were observed for turn `019edb09-77f6-7332-a8d1-e9f6240bf331`.
- The final assistant message matched the requested schema:

```json
{
  "artifact": "deckforge_live_structured_probe",
  "stage": "health_structured_turn",
  "mock": false,
  "fixture": false,
  "status": "ok"
}
```

Output SHA-256: `0a9d15bd5720bde9ffc8f5a42d38e4bd37b9099bb3d8d328ff3e8349959a955d`.

This proves a live App Server structured turn can complete with schema-constrained JSON and durable thread/turn ids on this machine. It is still a protocol-level probe, not a persisted DeckForge production workflow artifact.

## Current Structured Turn Recheck

Using the current `codex app-server --stdio` binary and protocol schema on 2026-06-18:

- `initialize` succeeded with a Codex Desktop protocol response.
- `account/read` returned account type `chatgpt`. Account email and plan details are intentionally not recorded here.
- `thread/start` created thread `019edb32-07eb-7902-85bd-04823b1c47c2` with model `gpt-5.4`, approval policy `never`, and read-only sandbox.
- `turn/start` accepted an `outputSchema` requiring `artifact`, `stage`, `mock`, `fixture`, and `status`.
- `turn/started`, `item/agentMessage/delta`, `item/completed`, `thread/tokenUsage/updated`, `account/rateLimits/updated`, and `turn/completed` notifications were observed for turn `019edb32-0a20-7812-ba4b-8603beb1b4aa`.
- The final assistant message matched the requested schema:

```json
{
  "artifact": "deckforge_live_current_smoke",
  "stage": "current_health",
  "mock": false,
  "fixture": false,
  "status": "ok"
}
```

Output SHA-256: `d165df896f4a80c9bbecaa36262b1b5540adc11591c0138ebea93b1dcb773b4c`.

This recheck confirms the App Server still supports live schema-constrained structured turns with durable thread/turn ids. It remains protocol-level evidence; the production DeckForge UI still has not invoked the full interview-through-Layout-IR workflow against live App Server turns.

## Goal Continuation Structured Turn Recheck

Using the current `codex app-server --stdio` binary and protocol schema on 2026-06-19:

- `codex --version` returned `codex-cli 0.141.0`.
- `codex login status` returned `Logged in using ChatGPT`.
- `codex app-server daemon version` returned `status: "running"` with standalone `cliVersion` and `appServerVersion` `0.141.0`.
- `initialize` succeeded with a Codex Desktop protocol response.
- `account/read` returned account type `chatgpt`. Account email and plan details are intentionally not recorded here.
- `thread/start` created thread `019edbdc-61ca-7fc1-9cb4-9146ef9a1237` with model `gpt-5.4`, approval policy `never`, and read-only sandbox.
- `turn/start` accepted an `outputSchema` requiring `artifact`, `stage`, `mock`, `fixture`, and `status`.
- `remoteControl/status/changed`, `thread/started`, `warning`, `mcpServer/startupStatus/updated`, `thread/status/changed`, `turn/started`, `skills/changed`, `hook/started`, `hook/completed`, `item/started`, `item/completed`, `item/agentMessage/delta`, `thread/tokenUsage/updated`, `account/rateLimits/updated`, and `turn/completed` notifications were observed for turn `019edbdc-6472-7252-a846-334f23436989`.
- The final assistant message matched the requested schema:

```json
{
  "artifact": "deckforge_live_goal_continuation_smoke",
  "stage": "goal_continuation_health",
  "mock": false,
  "fixture": false,
  "status": "ok"
}
```

Output SHA-256: `8b579a44dbdd4d90050087ecbc8be606ba407d53a9893effd8961a64b8db5c68`.

This continuation recheck confirms the current authenticated App Server can still create a fresh schema-constrained live turn with durable thread/turn ids. It remains protocol-level evidence; the production DeckForge UI still has not invoked the full interview-through-Layout-IR workflow against live App Server turns.

## Library-Level Interview Workflow Recheck

Using the current `codex app-server --stdio` binary through a temporary runtime adapter that implements the same `deckforge_codex_app_server_structured_turn` boundary consumed by `runDesktopLiveInterviewProductionWorkflow` on 2026-06-19:

- The first live interview workflow attempt reproduced a real App Server response-format rejection. The raw error notification contained `invalid_json_schema` and reported that `properties.draft.additionalProperties` must be supplied and false.
- `src/lib/desktop-live-interview-jobs.ts` now sends a strict nested `InterviewQuestionPlan` response schema for the desktop `questions` turn.
- `src/lib/codex-app-server-event-mapper.ts` now maps current App Server nested `params.error.message` notifications and failed `turn/completed` notifications into provider failure events instead of masking them as mapping issues.
- After the fix, `runDesktopLiveInterviewProductionWorkflow` completed a live App Server `questions` turn and returned `follow_up_required`.
- The persisted question artifact id was `p_goal_live_interview_20260619_fixed_2_questions_live`.
- The live App Server thread was `019edbeb-0963-7de1-a9e6-654f708a5637`.
- The live App Server turn was `019edbeb-0baf-71e3-85be-a4c331202d4b`.
- The persisted question artifact hash was `sha256:8c2149f2`.
- The workflow produced eight follow-up questions and required answers for `mustInclude`, `coreMessage`, `desiredOutcome`, `tone`, and `mustAvoid`.
- After the desktop workflow was extended to run the `brief` turn when answers are present, a second library-level live run completed both stages and returned `ready`.
- Ready run question artifact: `p_goal_live_interview_20260619_brief_questions_live`, thread `019edc17-adba-7101-8554-e4067aa84b62`, turn `019edc17-b011-74d2-ae54-49842b7abd9d`, hash `sha256:b97f92d0`, prompt version `interview_questions_desktop@v1`, duration 139,900 ms.
- Ready run Brief artifact: `p_goal_live_interview_20260619_brief_brief_live`, thread `019edc19-ce10-7c32-acbd-a3ec406e7d7b`, turn `019edc19-d06e-7793-9fbc-80ec053bb9fa`, hash `sha256:4dabd196`, prompt version `interview_brief@v1`, duration 173,967 ms.
- The Brief artifact cited `p_goal_live_interview_20260619_brief_questions_live` in `inputArtifactIds`, proving the second-turn question input lineage.

This proves the library-level desktop interview workflow can now pass live App Server structured `questions` and `brief` turns into DeckForge artifact persistence. It remains short of DF-213/DF-215 closure because the run was not driven from the packaged production UI and did not exercise the required follow-up-turn path for missing answers.

## Library-Level Text Pipeline Workflow Recheck

Using the current `codex app-server --stdio` binary through the same temporary runtime-adapter boundary on 2026-06-19, `runDesktopLiveTextPipelineProductionWorkflow` completed the production Deck Plan, Design System, and Layout IR stages with real App Server structured turns:

- Workflow result: `ready`.
- Resulting project stage: `LAYOUT_APPROVAL_PENDING`.
- Deck Plan artifact: `p_live_text_pipeline_20260619_deck_plan_live`, thread `019edbf8-da2a-7c60-9854-b031e54501c1`, turn `019edbf8-dce2-7a51-90ff-6fdb46137aaa`, hash `sha256:26f87b8c`, prompt version `deck_plan_desktop@v1`, duration 80,923 ms.
- Design System artifact: `p_live_text_pipeline_20260619_design_system_live`, thread `019edbfa-14d8-7b00-a9d3-ef8b5aea6da9`, turn `019edbfa-171c-7983-b2b8-33de3ead05f3`, hash `sha256:52bf2e5c`, prompt version `design_system_desktop@v1`, duration 81,551 ms.
- Layout IR artifact: `p_live_text_pipeline_20260619_layout_ir_live`, thread `019edbfb-536a-73f3-be20-80c1f434b09e`, turn `019edbfb-55b5-7973-b2e2-a9825d7aa9d4`, hash `sha256:5e92ef55`, prompt version `layout_ir_desktop@v1`, duration 137,636 ms.
- The persisted bundle contained five planned slides, design id `brief_live_pipeline_20260619_design_system`, and five Layout IR slides.

This proves the library-level desktop text-pipeline workflow can pass three authenticated App Server structured turns into DeckForge artifact persistence. It remains short of DF-214/DF-215 closure because the run was not driven from the packaged production UI, used preapproved local Brief/Research inputs, and did not include schema-repair, project restart, or full interview-through-export evidence.

## Desktop Bridge Command Coverage

The App Server smoke path and reusable structured-turn path are now represented at the desktop app boundary:

- `src-tauri/src/codex_app_server_smoke.rs` registers the `deckforge_codex_app_server_smoke` Tauri command through `src-tauri/src/lib.rs`.
- The command starts `codex app-server --stdio`, sends `initialize`, `account/read`, `thread/start`, and schema-constrained `turn/start` JSON-RPC requests, drains protocol stdout separately from stderr, and returns account type, thread id, turn id, completion flag, event methods, and final text.
- `src-tauri/src/codex_app_server_protocol.rs` owns JSON-RPC request construction, the smoke output schema, protocol field extraction, and notification accumulation.
- `src-tauri/src/codex_app_server_session.rs` owns the child process, stdin/stdout request-response loop, timeouts, cleanup, and raw JSON-RPC notification capture.
- `src-tauri/src/codex_app_server_structured_turn.rs` registers `deckforge_codex_app_server_structured_turn`, accepts a production prompt plus `outputSchema`, starts a read-only App Server thread/turn, waits for `turn/completed`, and returns runtime, duration, thread id, turn id, event methods, and raw notifications.
- `src/lib/desktop-app-server-bridge.ts` detects `window.__TAURI__.core.invoke`, reports the production text App Server bridge as available when present, calls both desktop commands, and parses returned evidence with Zod.
- `src/lib/desktop-codex-app-server-production-job.ts` feeds structured-turn notifications into `runProductionCodexAppServerJob`, so the existing event mapper and Job Manager provenance path can consume desktop App Server turns.
- `src/lib/desktop-live-text-pipeline-workflow.ts` and `src/lib/desktop-live-text-pipeline-jobs.ts` build desktop Plan/Design/Layout stage prompts, parse structured outputs, run all three desktop turns through the Tauri bridge adapter, and pass accepted outputs to the live text persistence gate.
- `ProductionWorkflowStage` now uses that bridge detector when no test override is supplied, so packaged Tauri runtime can move the production text gate from `missing` to `available`.
- `src/lib/desktop-live-interview-workflow.ts` and `src/lib/desktop-live-interview-jobs.ts` build the desktop interview `questions` and `brief` prompts, parse structured `InterviewQuestionPlan` and `InterviewBrief` output, run the desktop `questions` turn through the Tauri bridge adapter, create a persisted live question artifact when follow-up answers are still required, and run a second desktop `brief` turn when answers are present.
- `ProductionTextWorkflowLauncher` now wires the ready production text-pipeline button to the desktop Plan/Design/Layout launcher and persists the ready project patch after accepted live outputs; a library-level live run through that same workflow produced real Deck Plan, Design System, and Layout IR artifacts.
- `src/lib/live-interview-answer-map.ts` converts an existing project draft Brief plus initial prompt into the answer map consumed by the desktop live interview launcher.
- The same launcher wires the ready production interview button to the desktop interview launcher, passes draft-Brief answers when present, stores the resulting live question artifact record when follow-up is still required, and can apply the ready Brief patch after both live turns complete.
- `src/lib/live-text-smoke-gate.ts` now evaluates a complete DF-215 smoke bundle across `questions`, `brief`, `deck_plan`, `design_system`, and `layout_ir` artifacts plus post-resume turn evidence.
- The smoke bundle gate blocks missing or duplicate text stages, `non_codex_text_artifact`, `non_production_text_artifact`, non-session Codex auth, mock/fixture lineage contamination, `text_artifact_missing_turn_id`, `text_artifact_missing_thread_id`, missing resume evidence, incomplete resume turns, `missing_resume_next_turn`, and resume turns that do not continue from an already produced text artifact.
- Desktop `questions`, `brief`, Design System, and Layout IR stage jobs now send App Server strict response schemas with nested `additionalProperties: false` object definitions instead of loose object schemas rejected by the live response-format validator.

Local verification:

- `cargo test --manifest-path src-tauri/Cargo.toml codex_app_server` covers JSON-RPC request construction, notification accumulation, structured-turn parameter construction, and event-method summarization.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` passes for the desktop command code.
- `bun test src/lib/desktop-app-server-bridge.test.ts src/lib/desktop-codex-app-server-production-job.test.ts src/lib/codex-app-server-production-job.test.ts src/lib/codex-app-server-event-mapper.test.ts` covers missing bridge, smoke evidence parsing, structured-turn evidence parsing, typed command errors, and notification flow into production Job Manager provenance.
- `bun test src/lib/desktop-live-text-pipeline-workflow.test.ts` covers the app-level desktop launcher calling three structured turns before persistence and blocking before turn invocation when prerequisites are missing.
- `bun test src/lib/live-interview-answer-map.test.ts` covers draft-Brief answer handoff for the production interview launcher.
- `bun test src/lib/desktop-live-interview-workflow.test.ts` covers the app-level desktop interview launcher calling a structured `questions` turn, preserving the question artifact record when follow-up is required, calling a second structured `brief` turn after supplied answers, preserving question input lineage, and keeping both response schemas strict.
- `bun test src/lib/desktop-live-text-pipeline-workflow.test.ts` covers App Server strict response schemas for Deck Plan, Design System, and Layout IR stage jobs.
- `bun test src/lib/codex-app-server-event-mapper.test.ts` covers current nested App Server error notifications and failed turn completion mapping.
- `bun test src/lib/live-text-smoke-gate.test.ts` covers the full text smoke bundle contract, mock/fixture and missing-turn rejection, and the requirement for a completed post-resume next turn.
- `bun run typecheck`, targeted ESLint, and the TypeScript no-excuse checker pass for the bridge and production UI files.

This is still not a full DeckForge Live text run. The reusable command can execute schema-constrained turns and return App Server notifications, the library-level desktop interview workflow has now persisted live `questions` and `brief` artifacts from real App Server turns, the production interview button can launch that desktop interview path, the production Plan/Design/Layout button is wired to call the desktop launcher, and the library-level text pipeline has now persisted live Plan/Design/Layout artifacts from real App Server turns. A recorded packaged-app run with authenticated follow-up behavior and persisted end-to-end text artifacts is still required.

## Crash/Restart Evidence

The standalone App Server daemon process was forced down to verify the restart path:

```text
target_pid=97850
kill -9 97850
```

Immediately after the forced stop, `codex app-server daemon version` failed against the control socket:

```text
Error: failed to connect to /Users/jake/.codex/app-server-control/app-server-control.sock

Caused by:
    Connection refused (os error 61)
```

`PATH="/Users/jake/.local/bin:$PATH" codex app-server daemon start` then started a new daemon process:

```json
{
  "status": "started",
  "backend": "pid",
  "pid": 5889,
  "managedCodexPath": "/Users/jake/.codex/packages/standalone/current/codex",
  "managedCodexVersion": "0.141.0",
  "socketPath": "/Users/jake/.codex/app-server-control/app-server-control.sock",
  "cliVersion": "0.141.0",
  "appServerVersion": "0.141.0"
}
```

After restart, `codex app-server --stdio` completed another authenticated health turn:

- `account/read` returned `requiresOpenaiAuth: true` with account type `chatgpt`.
- `thread/start` created thread `019eda6a-81a9-7db0-91d7-ec73d6c78880`.
- `turn/start` completed post-restart health turn `019eda6a-8419-7ab3-be96-ea93f517aa6f`.

## Project Thread Resume Recheck

Using the current authenticated `codex app-server --stdio` binary and generated `ThreadResumeParams` schema on 2026-06-19, a library-level DF-212 recheck created worker thread `019edc28-bf27-7380-b7d2-65405e6c6758`, completed pre-restart turn `019edc28-c179-7453-a5a5-c87e29096422`, recreated the App Server process, called `thread/resume` for the same worker thread, and completed resumed turn `019edc28-f9ec-72e1-9695-1a9a2c2ca61d`.

The persisted recovery manifest used project `project_df212_live_resume`, deck context `deckctx_df212_live_resume`, context hash `sha256:context_df212_live_resume`, and approved artifacts `brief_df212_live`, `research_df212_live`, `plan_df212_live`, `design_df212_live`, and `layout_df212_live`. `evaluateProjectThreadResumeEvidence` returned `ready` for that recovered worker thread. This proves protocol-level project worker resume after App Server process recreation; it is still not packaged desktop restart/reopen evidence from the production UI.

## Acceptance Criteria Check

| Requirement                              | Status  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| supported runtime/protocol 범위 기록     | pass    | CLI `0.141.0`; generated protocol schemas include v1 `initialize` and v2 `thread/start`, `thread/resume`, `turn/start`, and notification schemas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| JSON-RPC initialize 성공                 | pass    | `codex app-server --stdio` returned `codexHome`, `platformFamily`, `platformOs`, and `userAgent` for request id `1`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| stdout/stderr protocol/log 채널 분리     | pass    | protocol responses were emitted as JSON on stdout while local MCP/plugin warnings were emitted separately as log events.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| durable daemon bootstrap                 | pass    | standalone 0.141.0 install exists, daemon bootstrap returned `bootstrapped`, and doctor reports persistent App Server running.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 비정상 종료 후 재시작 경로               | pass    | `kill -9` made the control socket refuse connections; `daemon start` launched new pid `5889`; post-restart health turn completed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| authenticated health turn                | pass    | `account/read` confirmed ChatGPT auth, then `thread/start` and `turn/start` produced completed thread/turn ids.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| schema-constrained structured turn       | pass    | `turn/start` accepted an `outputSchema`, streamed `item/agentMessage/delta`, emitted `thread/tokenUsage/updated`, and completed turn `019edb09-77f6-7332-a8d1-e9f6240bf331` on thread `019edb09-7568-70e2-a74c-5f2cc47e48fc`; the current recheck completed turn `019edb32-0a20-7812-ba4b-8603beb1b4aa` on thread `019edb32-07eb-7902-85bd-04823b1c47c2`; the goal-continuation recheck completed turn `019edbdc-6472-7252-a846-334f23436989` on thread `019edbdc-61ca-7fc1-9cb4-9146ef9a1237`.                                                                                                                      |
| desktop Tauri bridge command             | partial | `deckforge_codex_app_server_smoke` and `deckforge_codex_app_server_structured_turn` are registered, compile, have Rust protocol tests, have Zod-parsed TS bridge adapters, and the library-level desktop interview workflow consumed real App Server structured turns for both `questions` and `brief`; packaged-app manual invocation is not yet recorded.                                                                                                                                                                                                                                                          |
| Mock 없이 전체 텍스트 경로 완료          | partial | App Server health turns work, the library-level desktop interview workflow produced live `questions` and `brief` artifacts, the library-level desktop text pipeline produced live Deck Plan, Design System, and Layout IR artifacts, the Plan/Design/Layout production button is wired to the desktop structured-turn launcher, and `evaluateLiveTextSmokeGate` now rejects incomplete text-stage bundles; the production app has not yet recorded a packaged full interview through Layout IR live Codex-only run.                                                                                                  |
| 생성 artifact provider가 모두 live Codex | partial | The smoke bundle gate rejects non-Codex, non-production, non-session-auth, mock, and fixture artifacts; library-level desktop workflows produced live Codex `questions`, `brief`, `deck_plan`, `design_system`, and `layout_ir` artifacts, but the packaged production text artifact set has not been generated.                                                                                                                                                                                                                                                                                                     |
| turn id 없는 AI artifact 0개             | partial | The smoke bundle gate counts and rejects text artifacts without turn ids, health/resume/structured probe turns have turn ids, the library-level live `questions` artifact has turn `019edbeb-0baf-71e3-85be-a4c331202d4b`, the ready interview run has question turn `019edc17-b011-74d2-ae54-49842b7abd9d` and Brief turn `019edc19-d06e-7793-9fbc-80ec053bb9fa`, and the library-level Plan/Design/Layout artifacts have turns `019edbf8-dce2-7a51-90ff-6fdb46137aaa`, `019edbfa-171c-7983-b2b8-33de3ead05f3`, and `019edbfb-55b5-7973-b2e2-a9825d7aa9d4`; packaged production artifact evidence is still missing. |
| 프로젝트 재개 후 다음 turn 실행 가능     | partial | `thread/resume` plus a second turn succeeded for the App Server health thread, the smoke bundle gate requires a completed next turn after a produced text-artifact turn, and the DF-212 recheck resumed recovered worker thread `019edc28-bf27-7380-b7d2-65405e6c6758` from pre-restart turn `019edc28-c179-7453-a5a5-c87e29096422` to post-restart turn `019edc28-f9ec-72e1-9695-1a9a2c2ca61d`; packaged DeckForge project reopen/resume is not verified.                                                                                                                                                           |

## Conclusion

The local machine is authenticated for Codex CLI, now has the standalone 0.141.0 App Server install, and can run a persistent App Server daemon. Stdio protocol initialize, authenticated account read, thread creation, a completed health turn, thread resume, a second completed turn, forced daemon crash, daemon restart, post-restart health turn, and schema-constrained structured probe turns all succeeded, including the current recheck with thread `019edb32-07eb-7902-85bd-04823b1c47c2` and turn `019edb32-0a20-7812-ba4b-8603beb1b4aa`, plus the goal-continuation recheck with thread `019edbdc-61ca-7fc1-9cb4-9146ef9a1237` and turn `019edbdc-6472-7252-a846-334f23436989`. The DF-212 project-thread recheck also resumed recovered worker thread `019edc28-bf27-7380-b7d2-65405e6c6758` after recreating the App Server process and completed resumed turn `019edc28-f9ec-72e1-9695-1a9a2c2ca61d`. The app now has Tauri commands and TypeScript adapters for both App Server smoke evidence and reusable structured turns, and the structured-turn notifications can flow into the production Job Manager provenance path. The interview production button is wired to call the desktop interview launcher; the library-level desktop interview workflow has now persisted live `questions` and `brief` artifacts from turns `019edc17-b011-74d2-ae54-49842b7abd9d` and `019edc19-d06e-7793-9fbc-80ec053bb9fa`; the Plan/Design/Layout production button is wired to call the desktop structured-turn launcher and persist the ready patch after accepted outputs with strict response schemas. `evaluateLiveTextSmokeGate` now prevents DF-215 from being marked ready unless all text artifacts are live Codex production artifacts with turn/thread ids and a completed post-resume next turn. DF-210 still needs clean-machine reproduction before it should be marked Verified Live. DF-211 common runner criteria are satisfied by the real protocol-level structured event log, current error-event mapping, cancellation/invalid/partial-output tests, and desktop structured-turn command surface. DF-212 still needs packaged desktop restart/reopen evidence. DF-213/DF-214/DF-215 still need a recorded packaged-app live run that persists real DeckForge artifacts, and DF-215 remains partial because the actual packaged DeckForge text pipeline has not yet completed interview through Layout IR with live Codex-only artifacts.
