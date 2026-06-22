import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

export const PROJECT_ID = "df240_live_final_export";
export const CREATED_AT = Date.UTC(2026, 5, 21, 0, 0, 0);
export const EVIDENCE_DIR = "docs/live-evidence/df240-final-export-20260621";
export const EXPORT_DIR = `projects/${PROJECT_ID}/exports`;
export const PNG_DIR = `${EXPORT_DIR}/png`;
export const SVG_DIR = `${EXPORT_DIR}/svg`;
export const HYBRID_SVG_DIR = `${EXPORT_DIR}/hybrid-svg`;
export const TEXT_ARTIFACT_ID = "lane_e_live_text_20260621_layout_ir_live";

export const SourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
});

export const ProviderArtifactProvenanceSchema = z.object({
  artifactId: z.string().min(1),
  executionMode: z.union([z.literal("test"), z.literal("development"), z.literal("production")]),
  providerKind: z.union([
    z.literal("mock"),
    z.literal("codex"),
    z.literal("openaiImage"),
    z.literal("local"),
  ]),
  authMode: z.union([
    z.literal("none"),
    z.literal("codex_session"),
    z.literal("api_key"),
    z.literal("local"),
  ]),
  modelOrRuntime: z.string().min(1),
  promptVersion: z.string().min(1),
  durationMs: z.number().nonnegative(),
  inputArtifactIds: z.array(z.string().min(1)),
  fixture: z.boolean(),
  requestId: z.string().optional(),
  turnId: z.string().optional(),
  threadId: z.string().optional(),
});

export const ResearchPackSchema = z.object({
  id: z.string().min(1),
  approvedHash: z.string().optional(),
  sources: z.array(SourceSchema).min(1),
});

export const TextSmokeGateSchema = z.object({
  gate: z.object({
    kind: z.literal("ready"),
    provenanceLineage: z.array(ProviderArtifactProvenanceSchema).min(1),
  }),
});

export const CompositorExportSchema = z.object({
  slideNumber: z.number().int().positive(),
  imageArtifactId: z.string().min(1),
  imageTurnId: z.string().min(1),
  imageHash: z.string().min(1),
  compositorSvgPath: z.string().min(1),
  compositorSvgHash: z.string().min(1),
});

export const CompositorLineageSchema = z.object({
  compositorExports: z.array(CompositorExportSchema).length(5),
});

export type SourceEvidence = z.infer<typeof SourceSchema>;
export type CompositorExport = z.infer<typeof CompositorExportSchema>;

export type SlideExport = {
  readonly slideNumber: number;
  readonly sourceIds: readonly string[];
  readonly textArtifactId: string;
  readonly imageArtifactId: string;
  readonly imageTurnId: string;
  readonly compositorSvgPath: string;
  readonly compositorSvgHash: string;
  readonly exportedSvgPath: string;
  readonly exportedHybridSvgPath: string;
  readonly exportedPngPath: string;
  readonly exportedPngHash: string;
};

export class EvidenceGenerationError extends Error {
  readonly name = "EvidenceGenerationError";

  constructor(message: string) {
    super(message);
  }
}

export function readJson<TValue>(path: string, schema: z.ZodType<TValue>): TValue {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return schema.parse(parsed);
}

export function writeJsonFile(path: string, value: unknown): void {
  writeFileSync(path, stableJson(value));
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256File(path: string): string {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

export function sha256Text(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function imageProvenancePath(slideNumber: number): string {
  return `projects/df232_live_codex_batch/slides/images/slide_${pad3(slideNumber)}.v1.provenance.json`;
}

export function sourceIdsForSlide(
  slideNumber: number,
  sources: readonly SourceEvidence[],
): readonly string[] {
  const ids = sources.map((source) => source.id);
  switch (slideNumber) {
    case 1:
      return [ids[0] ?? "src_solar_capacity"];
    case 2:
      return [ids[1] ?? "src_solar_module_cost"];
    case 3:
      return [ids[2] ?? "src_worldbank_renewable_ex_hydro"];
    case 4:
      return [ids[0] ?? "src_solar_capacity", ids[1] ?? "src_solar_module_cost"];
    case 5:
      return ids;
    default:
      throw new EvidenceGenerationError(`Unsupported slide number ${slideNumber}.`);
  }
}

export function renderPng(svgPath: string, pngPath: string): void {
  const result = spawnSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new EvidenceGenerationError(`sips failed for ${svgPath}: ${result.stderr}`);
  }
}

export function pad3(value: number): string {
  return String(value).padStart(3, "0");
}
