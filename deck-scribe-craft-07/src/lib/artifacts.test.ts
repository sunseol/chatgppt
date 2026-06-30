import { describe, expect, test } from "bun:test";
import {
  createArtifactRecord,
  getProjectFolderSchema,
  hashContent,
  sha256Bytes,
} from "./artifacts";

describe("artifact metadata", () => {
  test("creates stable hash-prefixed metadata for approved artifacts", () => {
    const artifact = createArtifactRecord({
      projectId: "p_test",
      type: "plan",
      version: 2,
      content: "# Deck Plan\n- Slide 1",
      createdAt: 42,
    });

    expect(artifact).toEqual({
      id: "p_test_plan_v2",
      projectId: "p_test",
      type: "plan",
      version: 2,
      hash: hashContent("# Deck Plan\n- Slide 1"),
      path: "projects/p_test/plans/plan.v2.json",
      createdAt: 42,
    });
  });

  test("documents the local-first project folder schema", () => {
    expect(getProjectFolderSchema("p_test")).toEqual([
      "projects/p_test/briefs",
      "projects/p_test/research",
      "projects/p_test/plans",
      "projects/p_test/design",
      "projects/p_test/layout_prototypes",
      "projects/p_test/contexts",
      "projects/p_test/assets",
      "projects/p_test/slides",
      "projects/p_test/exports",
      "projects/p_test/audit",
    ]);
  });

  test("computes full SHA-256 digests for release artifact identity", () => {
    expect(sha256Bytes(new TextEncoder().encode("abc"))).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
