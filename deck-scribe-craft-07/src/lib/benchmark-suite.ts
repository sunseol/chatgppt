export const REQUIRED_BENCHMARK_CATEGORIES = [
  "investment_pitch",
  "internal_report",
  "education",
  "data_centered",
  "brand_centered",
  "korean_centered",
  "comparison",
  "revision",
  "editing",
  "error_inducing",
] as const;

export type BenchmarkCategory = (typeof REQUIRED_BENCHMARK_CATEGORIES)[number];

export type BenchmarkDefinition = {
  readonly id: string;
  readonly category: BenchmarkCategory;
  readonly initialPrompt: string;
  readonly expectedVerificationPoints: readonly string[];
};

export type BenchmarkSuiteManifest = {
  readonly version: string;
  readonly targetBenchmarkCount: 30;
  readonly evaluableThreshold: 0.8;
  readonly benchmarks: readonly BenchmarkDefinition[];
};

export type BenchmarkSuiteValidationReport = {
  readonly benchmarkCount: number;
  readonly evaluableCount: number;
  readonly evaluableRate: number;
  readonly missingCategories: readonly BenchmarkCategory[];
  readonly duplicateIds: readonly string[];
  readonly issues: readonly string[];
  readonly passed: boolean;
};

type CategorySpec = {
  readonly category: BenchmarkCategory;
  readonly prompts: readonly string[];
  readonly verificationPoints: readonly string[];
};

const CATEGORY_SPECS: readonly CategorySpec[] = [
  {
    category: "investment_pitch",
    prompts: [
      "Seed deck for a Korean climate SaaS startup raising a Series A from global investors.",
      "Investor pitch for an AI operations tool entering the US mid-market manufacturing sector.",
      "Fundraising story for a consumer health app with traction, retention, and regulatory risks.",
    ],
    verificationPoints: ["audience-fit", "market-sizing", "traction-evidence"],
  },
  {
    category: "internal_report",
    prompts: [
      "Executive weekly business review for a marketplace with revenue, supply, and churn movement.",
      "Internal product strategy memo deck explaining roadmap tradeoffs for leadership approval.",
      "Quarterly operating review for a sales team with pipeline risk and hiring constraints.",
    ],
    verificationPoints: ["decision-summary", "metric-lineage", "risk-section"],
  },
  {
    category: "education",
    prompts: [
      "Training deck teaching new analysts how to read cohort retention curves and caveats.",
      "Teacher-friendly lesson slides explaining generative AI safety to high school students.",
      "Workshop deck for onboarding customer success managers to enterprise escalation handling.",
    ],
    verificationPoints: ["learning-objective", "stepwise-structure", "knowledge-check"],
  },
  {
    category: "data_centered",
    prompts: [
      "Data-heavy deck comparing CAC, LTV, payback, and margin across three growth channels.",
      "Board-ready KPI narrative using tables, charts, and source-backed metric definitions.",
      "Analytics report deck diagnosing why activation dropped after a mobile onboarding change.",
    ],
    verificationPoints: ["chart-editability", "source-map", "metric-definition"],
  },
  {
    category: "brand_centered",
    prompts: [
      "Brand launch presentation for a premium Korean skincare line entering Japan.",
      "Visual identity deck for a B2B fintech product with restrained enterprise design rules.",
      "Campaign concept deck for a sports apparel collaboration with clear brand guardrails.",
    ],
    verificationPoints: ["brand-consistency", "visual-language", "negative-rules"],
  },
  {
    category: "korean_centered",
    prompts: [
      "Korean executive report deck about local government digital transformation priorities.",
      "한글 중심 투자 제안서: 국내 B2B SaaS의 매출 성장과 고객 유지율을 설명해줘.",
      "Korean-English mixed deck for a Seoul product team presenting global expansion plans.",
    ],
    verificationPoints: ["korean-typography", "mixed-text-readability", "source-caption"],
  },
  {
    category: "comparison",
    prompts: [
      "Competitive comparison deck for three CRM vendors with weighted evaluation criteria.",
      "Before-and-after strategy deck comparing legacy support workflow to AI-assisted triage.",
      "Vendor selection presentation comparing security, cost, and integration risk.",
    ],
    verificationPoints: ["comparison-frame", "fair-criteria", "tradeoff-summary"],
  },
  {
    category: "revision",
    prompts: [
      "Revise an approved sales deck by changing only the pricing slide and preserving all else.",
      "Update a market sizing slide with new assumptions while keeping the original visual style.",
      "Make the title more executive-friendly without changing chart values or source citations.",
    ],
    verificationPoints: ["preserve-original", "delta-check", "revision-lineage"],
  },
  {
    category: "editing",
    prompts: [
      "Create a deck whose final title, subtitle, and callout text must remain editable.",
      "Generate a data report deck where chart labels and comparison cards can be moved later.",
      "Build a workshop deck with grouped agenda blocks that can be duplicated and deleted.",
    ],
    verificationPoints: ["editable-layer-count", "editor-command", "export-metadata"],
  },
  {
    category: "error_inducing",
    prompts: [
      "Create a deck using unsupported sources and vague metrics, then surface validation failures.",
      "Ask for confidential API keys to appear on slides and ensure redaction blocks exposure.",
      "Generate a layout with intentionally dense Korean paragraphs to trigger overflow checks.",
    ],
    verificationPoints: ["error-surfacing", "redaction", "approval-blocking"],
  },
];

export const FULL_30_BENCHMARK_SUITE: BenchmarkSuiteManifest = {
  version: "2026-06-df150",
  targetBenchmarkCount: 30,
  evaluableThreshold: 0.8,
  benchmarks: CATEGORY_SPECS.flatMap((spec) =>
    spec.prompts.map((prompt, index) => ({
      id: `${spec.category}_${String(index + 1).padStart(2, "0")}`,
      category: spec.category,
      initialPrompt: prompt,
      expectedVerificationPoints: spec.verificationPoints,
    })),
  ),
};

export function validateBenchmarkSuiteManifest(
  manifest: BenchmarkSuiteManifest,
): BenchmarkSuiteValidationReport {
  const duplicateIds = findDuplicateIds(manifest.benchmarks);
  const missingCategories = REQUIRED_BENCHMARK_CATEGORIES.filter(
    (category) => !manifest.benchmarks.some((benchmark) => benchmark.category === category),
  );
  const evaluableCount = manifest.benchmarks.filter(isEvaluable).length;
  const benchmarkCount = manifest.benchmarks.length;
  const evaluableRate =
    benchmarkCount === 0 ? 0 : Number((evaluableCount / benchmarkCount).toFixed(3));
  const issues = [
    ...(benchmarkCount === manifest.targetBenchmarkCount
      ? []
      : [`expected ${manifest.targetBenchmarkCount} benchmarks, received ${benchmarkCount}`]),
    ...duplicateIds.map((id) => `duplicate benchmark id: ${id}`),
    ...missingCategories.map((category) => `missing category: ${category}`),
    ...(evaluableRate >= manifest.evaluableThreshold
      ? []
      : [`evaluable rate ${evaluableRate} below threshold ${manifest.evaluableThreshold}`]),
  ];
  return {
    benchmarkCount,
    evaluableCount,
    evaluableRate,
    missingCategories,
    duplicateIds,
    issues,
    passed: issues.length === 0,
  };
}

function isEvaluable(benchmark: BenchmarkDefinition): boolean {
  return (
    benchmark.initialPrompt.trim().length > 0 &&
    benchmark.expectedVerificationPoints.filter((point) => point.trim().length > 0).length >= 2
  );
}

function findDuplicateIds(benchmarks: readonly BenchmarkDefinition[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  benchmarks.forEach((benchmark) => {
    if (seen.has(benchmark.id)) duplicates.add(benchmark.id);
    seen.add(benchmark.id);
  });
  return [...duplicates];
}
