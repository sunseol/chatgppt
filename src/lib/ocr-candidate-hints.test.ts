import { describe, expect, test } from "bun:test";
import {
  buildOcrCandidateReviewHints,
  type CanonicalTextLayer,
  type OcrCandidateReviewHintsResult,
  type OcrCorrectionDictionaryEntry,
  type OcrTextCandidateImport,
} from "./ocr-candidate-hints";

describe("OCR candidate review hints", () => {
  test("keeps canonical DOM text authoritative over conflicting OCR candidates", () => {
    // Given
    const canonical = canonicalTextLayers();
    const ocrCandidate = mappedCandidate("ocr_title", "잘못된 제목", "dom_title");

    // When
    const result = buildOcrCandidateReviewHints({
      canonicalLayers: canonical,
      candidates: [ocrCandidate],
      ocrEngine: "windows",
      correctionDictionary: [],
    });

    // Then
    expect(result.resolvedTextLayers).toEqual(canonical);
    expect(result.status).toBe("review_required");
    expect(result.reviewRequired).toBe(true);

    const hint = requireHint(result.hints, "ocr_title");
    expect(hint.status).toBe("conflict");
    expect(hint.code).toBe("ocr-conflict");
    expect(hint.reviewRequired).toBe(true);
    expect(hint.canonicalText).toBe("원본 제목");
    expect(hint.correctedText).toBe("잘못된 제목");
  });

  test("applies user-editable correction dictionary before hint comparison", () => {
    // Given
    const dictionary: readonly OcrCorrectionDictionaryEntry[] = [
      { from: "챠트", to: "차트", enabled: true },
    ];
    const canonical: readonly CanonicalTextLayer[] = [
      {
        sourceLayerId: "dom_body",
        role: "body",
        text: "차트 성장률",
        source: "slide_spec",
      },
    ];

    // When
    const result = buildOcrCandidateReviewHints({
      canonicalLayers: canonical,
      candidates: [mappedCandidate("ocr_body", "챠트 성장률", "dom_body")],
      ocrEngine: "external",
      correctionDictionary: dictionary,
    });

    // Then
    const hint = requireHint(result.hints, "ocr_body");
    expect(result.status).toBe("passed");
    expect(result.correctionDictionary).toEqual(dictionary);
    expect(hint.status).toBe("matched");
    expect(hint.correctedText).toBe("차트 성장률");
    expect(hint.appliedCorrections).toEqual(["챠트 -> 차트"]);
  });

  test("keeps the generated slide pipeline available when OCR is absent", () => {
    // Given
    const canonical = canonicalTextLayers();

    // When
    const result = buildOcrCandidateReviewHints({
      canonicalLayers: canonical,
      candidates: [],
      ocrEngine: "none",
      correctionDictionary: [],
    });

    // Then
    expect(result.status).toBe("passed");
    expect(result.pipelineAvailable).toBe(true);
    expect(result.ocrAvailable).toBe(false);
    expect(result.resolvedTextLayers).toEqual(canonical);
    expect(
      result.limitations.includes("OCR unavailable; continuing with Slide Spec and DOM text only."),
    ).toBe(true);
  });
});

function canonicalTextLayers(): readonly CanonicalTextLayer[] {
  return [
    {
      sourceLayerId: "dom_title",
      role: "title",
      text: "원본 제목",
      source: "dom_layer_metadata",
    },
  ];
}

function mappedCandidate(
  id: string,
  text: string,
  matchedSourceLayerId: string,
): OcrTextCandidateImport {
  return {
    candidate: {
      id,
      text,
      bounds: { x: 80, y: 64, w: 720, h: 120 },
      confidence: 0.82,
    },
    matchedSourceLayerId,
  };
}

function requireHint(hints: OcrCandidateReviewHintsResult["hints"], candidateId: string) {
  const hint = hints.find((item) => item.candidateId === candidateId);
  if (hint === undefined) throw new Error(`Expected hint for ${candidateId}.`);
  return hint;
}
