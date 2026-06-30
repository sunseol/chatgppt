import { describe, expect, test } from "bun:test";
import { missingProjectArtifactsFromRaw } from "./project-state.mjs";

describe("production UI project state helpers", () => {
  test("reports only missing project artifact keys", () => {
    const raw = JSON.stringify([
      {
        id: "project-1",
        exportPackage: { id: "project-1_export_v1" },
        pptxPackage: null,
      },
    ]);

    expect(
      missingProjectArtifactsFromRaw(raw, "project-1", [
        "exportPackage",
        "pptxPackage",
        "renderSnapshot",
      ]),
    ).toEqual(["pptxPackage", "renderSnapshot"]);
  });

  test("treats absent projects as missing every requested artifact", () => {
    expect(missingProjectArtifactsFromRaw("[]", "project-404", ["exportPackage"])).toEqual([
      "exportPackage",
    ]);
  });
});
