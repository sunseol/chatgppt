export type DeckConsistencyIssueCode =
  | "palette-token-drift"
  | "title-position-drift"
  | "safe-margin-breach"
  | "text-size-drift"
  | "chart-style-drift"
  | "decorative-drift";

export type DeckConsistencyIssue = {
  readonly code: DeckConsistencyIssueCode;
  readonly slideNumber: number;
  readonly layerId?: string;
  readonly message: string;
};

export type DeckRegenerationCandidate = {
  readonly slideNumber: number;
  readonly issueCodes: readonly DeckConsistencyIssueCode[];
  readonly reason: string;
};

export type DeckConsistencyReport = {
  readonly status: "passed" | "failed";
  readonly summary: {
    readonly slideCount: number;
    readonly driftSlideCount: number;
    readonly violationRate: number;
    readonly targetMaxDriftSlides: number;
    readonly targetPassed: boolean;
  };
  readonly issues: readonly DeckConsistencyIssue[];
  readonly regenerationCandidates: readonly DeckRegenerationCandidate[];
};
