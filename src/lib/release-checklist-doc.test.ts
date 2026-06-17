import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOC_PATH = new URL("../../docs/df155-mvp-release-checklist.md", import.meta.url);
const P0_TICKET_IDS =
  "DF-001 DF-002 DF-003 DF-004 DF-004A DF-005 DF-006 DF-007A DF-007B DF-010 DF-011 DF-012 DF-013 DF-013A DF-014 DF-015A DF-019 DF-020 DF-021 DF-022 DF-023A DF-025 DF-030 DF-031 DF-032 DF-033 DF-040 DF-041 DF-041A DF-041B DF-041C DF-042 DF-043A DF-044 DF-050 DF-051 DF-052 DF-053A DF-060 DF-061 DF-062A DF-066A DF-069 DF-070 DF-071 DF-072A DF-073 DF-074 DF-075 DF-076 DF-080 DF-081 DF-082 DF-089 DF-090 DF-091 DF-092 DF-093 DF-095 DF-096 DF-100 DF-110 DF-111A DF-112 DF-114 DF-120 DF-121 DF-122 DF-124 DF-130A DF-132 DF-133 DF-140 DF-141 DF-142 DF-144 DF-153".split(
    " ",
  );

describe("DF-155 release checklist document", () => {
  test("contains every P0 ticket id from the backlog", () => {
    const text = readReleaseChecklistDoc();

    expect(P0_TICKET_IDS.every((ticketId) => text.includes(ticketId))).toBe(true);
  });

  test("separates release evidence, unverified items, and blockers", () => {
    const text = readReleaseChecklistDoc();

    for (const section of requiredSections()) {
      expect(text.includes(section)).toBe(true);
    }
    expect(text.includes("src/lib/happy-path-e2e.test.ts")).toBe(true);
    expect(text.includes("src/lib/benchmark-suite.ts")).toBe(true);
    expect(text.includes("src/lib/mvp-scoring.fixture.ts")).toBe(true);
  });
});

function readReleaseChecklistDoc(): string {
  return readFileSync(DOC_PATH, "utf8");
}

function requiredSections(): readonly string[] {
  return [
    "# DF-155 MVP Release Checklist",
    "## Functional Gates",
    "## Quality Gates",
    "## User QA Gates",
    "## Security And Privacy Gates",
    "## Packaging Gates",
    "## P0 Completion Audit",
    "## Evidence Locations",
    "## Unverified Items",
    "## Release Blockers",
    "## Release Readiness Review",
  ];
}
