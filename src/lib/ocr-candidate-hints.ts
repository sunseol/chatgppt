import type { Png2SvgOcrEngine, Png2SvgTextCandidate } from "./png2svg-adapter-spike";

export type CanonicalTextLayerSource = "slide_spec" | "dom_layer_metadata";

export type CanonicalTextLayer = {
  readonly sourceLayerId: string;
  readonly role: string;
  readonly text: string;
  readonly source: CanonicalTextLayerSource;
};

export type OcrCorrectionDictionaryEntry = {
  readonly from: string;
  readonly to: string;
  readonly enabled: boolean;
};

export type OcrTextCandidateImport = {
  readonly candidate: Png2SvgTextCandidate;
  readonly matchedSourceLayerId?: string;
};

export type OcrCandidateReviewHintStatus = "matched" | "conflict" | "unmatched";
export type OcrCandidateReviewHintCode = "ocr-match" | "ocr-conflict" | "ocr-unmatched";
export type OcrCandidateReviewHintsStatus = "passed" | "review_required";

export type OcrCandidateReviewHint = {
  readonly candidateId: string;
  readonly candidateSourceLayerId: string;
  readonly matchedSourceLayerId: string;
  readonly candidateText: string;
  readonly correctedText: string;
  readonly canonicalText?: string;
  readonly confidence: number;
  readonly status: OcrCandidateReviewHintStatus;
  readonly code: OcrCandidateReviewHintCode;
  readonly reviewRequired: boolean;
  readonly appliedCorrections: readonly string[];
  readonly message: string;
};

export type BuildOcrCandidateReviewHintsInput = {
  readonly canonicalLayers: readonly CanonicalTextLayer[];
  readonly candidates: readonly OcrTextCandidateImport[];
  readonly ocrEngine: Png2SvgOcrEngine;
  readonly correctionDictionary?: readonly OcrCorrectionDictionaryEntry[];
};

export type OcrCandidateReviewHintsResult = {
  readonly status: OcrCandidateReviewHintsStatus;
  readonly pipelineAvailable: true;
  readonly ocrAvailable: boolean;
  readonly ocrEngine: Png2SvgOcrEngine;
  readonly reviewRequired: boolean;
  readonly resolvedTextLayers: readonly CanonicalTextLayer[];
  readonly hints: readonly OcrCandidateReviewHint[];
  readonly correctionDictionary: readonly OcrCorrectionDictionaryEntry[];
  readonly limitations: readonly string[];
};

export function buildOcrCandidateReviewHints(
  input: BuildOcrCandidateReviewHintsInput,
): OcrCandidateReviewHintsResult {
  const correctionDictionary = input.correctionDictionary ?? [];
  const canonicalBySourceLayerId = new Map(
    input.canonicalLayers.map((layer) => [layer.sourceLayerId, layer]),
  );
  const hints = input.candidates.map((candidateImport) =>
    toReviewHint(candidateImport, canonicalBySourceLayerId, correctionDictionary),
  );
  const reviewRequired = hints.some((hint) => hint.reviewRequired);

  return {
    status: reviewRequired ? "review_required" : "passed",
    pipelineAvailable: true,
    ocrAvailable: input.ocrEngine !== "none",
    ocrEngine: input.ocrEngine,
    reviewRequired,
    resolvedTextLayers: input.canonicalLayers.map(copyCanonicalLayer),
    hints,
    correctionDictionary: correctionDictionary.map(copyCorrectionEntry),
    limitations: limitationsForEngine(input.ocrEngine),
  };
}

function toReviewHint(
  candidateImport: OcrTextCandidateImport,
  canonicalBySourceLayerId: ReadonlyMap<string, CanonicalTextLayer>,
  correctionDictionary: readonly OcrCorrectionDictionaryEntry[],
): OcrCandidateReviewHint {
  const matchedSourceLayerId = sourceLayerIdForCandidate(candidateImport);
  const canonical = canonicalBySourceLayerId.get(matchedSourceLayerId);
  const corrected = applyCorrections(candidateImport.candidate.text, correctionDictionary);
  const base = {
    candidateId: candidateImport.candidate.id,
    candidateSourceLayerId: `png2svg.text.${candidateImport.candidate.id}`,
    matchedSourceLayerId,
    candidateText: candidateImport.candidate.text,
    correctedText: corrected.text,
    confidence: candidateImport.candidate.confidence,
    appliedCorrections: corrected.appliedCorrections,
  };

  if (canonical === undefined) {
    return {
      ...base,
      status: "unmatched",
      code: "ocr-unmatched",
      reviewRequired: true,
      message: "OCR candidate has no matching Slide Spec or DOM text layer.",
    };
  }

  if (normalizeText(canonical.text) === normalizeText(corrected.text)) {
    return {
      ...base,
      canonicalText: canonical.text,
      status: "matched",
      code: "ocr-match",
      reviewRequired: false,
      message: "OCR candidate matches canonical text after correction dictionary.",
    };
  }

  return {
    ...base,
    canonicalText: canonical.text,
    status: "conflict",
    code: "ocr-conflict",
    reviewRequired: true,
    message: "OCR candidate conflicts with canonical Slide Spec or DOM text.",
  };
}

function sourceLayerIdForCandidate(candidateImport: OcrTextCandidateImport): string {
  return candidateImport.matchedSourceLayerId ?? `png2svg.text.${candidateImport.candidate.id}`;
}

function applyCorrections(
  text: string,
  dictionary: readonly OcrCorrectionDictionaryEntry[],
): { readonly text: string; readonly appliedCorrections: readonly string[] } {
  let correctedText = text;
  const appliedCorrections: string[] = [];

  for (const entry of dictionary) {
    if (!entry.enabled || entry.from.length === 0) continue;
    if (!correctedText.includes(entry.from)) continue;

    correctedText = correctedText.replaceAll(entry.from, entry.to);
    appliedCorrections.push(`${entry.from} -> ${entry.to}`);
  }

  return { text: correctedText, appliedCorrections };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function limitationsForEngine(ocrEngine: Png2SvgOcrEngine): readonly string[] {
  return ocrEngine === "none"
    ? ["OCR unavailable; continuing with Slide Spec and DOM text only."]
    : [];
}

function copyCanonicalLayer(layer: CanonicalTextLayer): CanonicalTextLayer {
  return {
    sourceLayerId: layer.sourceLayerId,
    role: layer.role,
    text: layer.text,
    source: layer.source,
  };
}

function copyCorrectionEntry(entry: OcrCorrectionDictionaryEntry): OcrCorrectionDictionaryEntry {
  return {
    from: entry.from,
    to: entry.to,
    enabled: entry.enabled,
  };
}
