import { describe, expect, test } from "bun:test";
import { createDeckProject } from "./project-creation";
import { parseProjectList, serializeProjectList } from "./project-list-codec";

describe("project list codec", () => {
  test("round-trips projects for restart recovery", () => {
    const project = createDeckProject(
      {
        name: "Restartable",
        initialPrompt: "Create a restart-safe deck",
        slideCount: 6,
        aspectRatio: "16:9",
        language: "en",
      },
      { createId: () => "p_restart", now: () => 42 },
    );

    const restored = parseProjectList(serializeProjectList([project]));

    expect(restored).toEqual([project]);
  });

  test("returns an empty list for malformed storage text", () => {
    expect(parseProjectList("{not valid json")).toEqual([]);
    expect(parseProjectList(null)).toEqual([]);
  });
});
