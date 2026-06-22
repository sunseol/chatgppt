import { describe, expect, test } from "bun:test";
import {
  parseVersionedProjectImageArtifactPath,
  parseVersionedProjectImageProvenancePath,
} from "./image-artifact-path";

describe("versioned project image artifact paths", () => {
  test("rejects non-positive slide numbers and artifact versions", () => {
    // Given / When / Then
    expect(
      parseVersionedProjectImageArtifactPath("projects/project_001/slides/images/slide_000.v1.png"),
    ).toBe(undefined);
    expect(
      parseVersionedProjectImageArtifactPath("projects/project_001/slides/images/slide_001.v0.png"),
    ).toBe(undefined);
    expect(
      parseVersionedProjectImageProvenancePath(
        "projects/project_001/slides/images/slide_001.v0.provenance.json",
      ),
    ).toBe(undefined);
  });
});
