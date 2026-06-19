import { describe, expect, test } from "bun:test";
import { findStaleLiveContextJobs, type LiveContextJobSnapshot } from "./project-thread-lifecycle";

describe("project thread stale context hash", () => {
  test("marks active live jobs stale when the context hash changes under the same context id", () => {
    const jobs: readonly LiveContextJobSnapshot[] = [
      {
        jobId: "job_same_id_old_hash",
        providerId: "codex",
        deckContextId: "deckctx_001",
        deckContextHash: "sha256:old",
        status: "running",
      },
      {
        jobId: "job_same_id_current_hash",
        providerId: "codex",
        deckContextId: "deckctx_001",
        deckContextHash: "sha256:current",
        status: "running",
      },
      {
        jobId: "job_same_id_missing_hash",
        providerId: "codex",
        deckContextId: "deckctx_001",
        status: "running",
      },
    ];

    const staleJobIds = findStaleLiveContextJobs({
      currentDeckContextId: "deckctx_001",
      currentDeckContextHash: "sha256:current",
      jobs,
    });

    expect(staleJobIds).toEqual(["job_same_id_old_hash"]);
  });
});
