import { spawnSync } from "node:child_process";
import {
  AUTOMATED_TEST_SUITE_TARGETS,
  formatAutomatedSuiteFailure,
} from "../src/lib/automated-test-suite.ts";

for (const target of AUTOMATED_TEST_SUITE_TARGETS) {
  const result = spawnSync("bun", ["test", ...target.testFiles], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    const excerpt = [result.stdout, result.stderr].filter(Boolean).join("\n").slice(-4000);
    console.error(formatAutomatedSuiteFailure(target, excerpt));
    process.exit(result.status ?? 1);
  }
  process.stdout.write(`[suite] ${target.stage} passed (${target.artifactId})\n`);
}

process.stdout.write(`[suite] all ${AUTOMATED_TEST_SUITE_TARGETS.length} targets passed\n`);
