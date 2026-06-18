import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const PROJECT_STAGE_ROUTE = new URL("../routes/project.$projectId.$step.tsx", import.meta.url);

describe("production route isolation", () => {
  test("does not statically import mock workflow stages", () => {
    const routeSource = readFileSync(PROJECT_STAGE_ROUTE, "utf8");

    expect(/from\s+["']@\/components\/deck\/stages["']/.test(routeSource)).toBe(false);
  });
});
