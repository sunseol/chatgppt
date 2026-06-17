export const REQUIRED_AUTOMATED_SUITE_STAGES = [
  "state_machine",
  "context_hash",
  "prompt_package",
  "source_map",
  "design_token",
  "layout_ir",
  "html_hardening",
  "layout_render",
  "dom_layer_metadata",
  "svg_editability",
  "export_regression",
] as const;

export type AutomatedSuiteStage = (typeof REQUIRED_AUTOMATED_SUITE_STAGES)[number];

export type AutomatedSuiteTarget = {
  readonly stage: AutomatedSuiteStage;
  readonly artifactId: string;
  readonly command: "bun test";
  readonly testFiles: readonly string[];
};

export type AutomatedSuitePlan = {
  readonly command: typeof AUTOMATED_TEST_SUITE_COMMAND;
  readonly mockProviderRunnable: true;
  readonly targets: readonly AutomatedSuiteTarget[];
};

export const AUTOMATED_TEST_SUITE_COMMAND = "bun run test:suite";

export const AUTOMATED_TEST_SUITE_TARGETS: readonly AutomatedSuiteTarget[] = [
  target("state_machine", "workflow_state_machine", [
    "src/lib/workflow-engine.test.ts",
    "src/lib/workflow-stepper.test.ts",
  ]),
  target("context_hash", "frozen_context_hash", ["src/lib/deck-context.test.ts"]),
  target("prompt_package", "prompt_package_lineage", [
    "src/lib/prompt-assets.test.ts",
    "src/lib/deck-plan-prompt.test.ts",
    "src/lib/slide-prompt-package.test.ts",
  ]),
  target("source_map", "slide_source_map", [
    "src/lib/slide-source-map.test.ts",
    "src/lib/source-map-review.test.ts",
  ]),
  target("design_token", "design_token_policy", [
    "src/lib/design-system.test.ts",
    "src/lib/design-system-generator.test.ts",
    "src/lib/font-policy.test.ts",
  ]),
  target("layout_ir", "layout_ir_contract", [
    "src/lib/layout-ir.test.ts",
    "src/lib/layout-ir-prompt.test.ts",
  ]),
  target("html_hardening", "layout_renderer_sandbox", ["src/lib/layout-renderer-sandbox.test.ts"]),
  target("layout_render", "layout_render_validation", [
    "src/lib/layout-html-renderer.test.ts",
    "src/lib/layout-validation.test.ts",
  ]),
  target("dom_layer_metadata", "dom_layer_metadata_bounds", ["src/lib/dom-layer-metadata.test.ts"]),
  target("svg_editability", "svg_editability_export", [
    "src/lib/editable-layer-model.test.ts",
    "src/lib/editable-layer-composer.test.ts",
    "src/lib/editable-svg-renderer.test.ts",
  ]),
  target("export_regression", "final_export_regression", [
    "src/lib/happy-path-e2e.test.ts",
    "src/lib/png2svg-regression-corpus.test.ts",
    "src/lib/project-export.test.ts",
    "src/lib/final-export-gate.test.ts",
    "src/lib/generation-report.test.ts",
  ]),
];

export function createAutomatedSuitePlan(): AutomatedSuitePlan {
  return {
    command: AUTOMATED_TEST_SUITE_COMMAND,
    mockProviderRunnable: true,
    targets: AUTOMATED_TEST_SUITE_TARGETS,
  };
}

export function formatAutomatedSuiteFailure(target: AutomatedSuiteTarget, excerpt: string): string {
  return [
    `[DeckForge automated suite failure]`,
    `stage=${target.stage}`,
    `artifact_id=${target.artifactId}`,
    `command=${target.command} ${target.testFiles.join(" ")}`,
    `excerpt=${excerpt.trim()}`,
  ].join("\n");
}

function target(
  stage: AutomatedSuiteStage,
  artifactId: string,
  testFiles: readonly string[],
): AutomatedSuiteTarget {
  return { stage, artifactId, command: "bun test", testFiles };
}
