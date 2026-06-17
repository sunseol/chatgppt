import type {
  ClaimConfidence,
  ClaimStatus,
  ResearchSourceType,
  SourceGrade,
} from "./research-types";

export type SourcePolicyUse = "priority" | "allowed" | "supporting" | "restricted" | "forbidden";

export interface GradePolicy {
  readonly grade: SourceGrade;
  readonly usePolicy: SourcePolicyUse;
  readonly canSupportMajorClaim: boolean;
  readonly canSupportMajorNumber: boolean;
  readonly canStandAlone: boolean;
  readonly forbiddenConditions: readonly string[];
}

export interface SourcePolicy extends GradePolicy {
  readonly sourceType: ResearchSourceType;
}

export interface UncertaintyPolicyInput {
  readonly confidence: ClaimConfidence;
  readonly status: ClaimStatus;
}

export interface UncertaintyPolicy {
  readonly labelRequired: boolean;
  readonly reviewRequired: boolean;
  readonly label?: "uncertain" | "assumption" | "conflicting";
}

const GRADE_POLICIES: Record<SourceGrade, GradePolicy> = {
  A: {
    grade: "A",
    usePolicy: "priority",
    canSupportMajorClaim: true,
    canSupportMajorNumber: true,
    canStandAlone: true,
    forbiddenConditions: [],
  },
  B: {
    grade: "B",
    usePolicy: "allowed",
    canSupportMajorClaim: true,
    canSupportMajorNumber: true,
    canStandAlone: true,
    forbiddenConditions: [],
  },
  C: {
    grade: "C",
    usePolicy: "supporting",
    canSupportMajorClaim: false,
    canSupportMajorNumber: false,
    canStandAlone: false,
    forbiddenConditions: ["주요 주장 또는 주요 수치의 단독 근거 금지"],
  },
  D: {
    grade: "D",
    usePolicy: "restricted",
    canSupportMajorClaim: false,
    canSupportMajorNumber: false,
    canStandAlone: false,
    forbiddenConditions: ["단독 근거 금지", "보조 맥락 외 사용 금지"],
  },
  E: {
    grade: "E",
    usePolicy: "forbidden",
    canSupportMajorClaim: false,
    canSupportMajorNumber: false,
    canStandAlone: false,
    forbiddenConditions: ["사용 금지"],
  },
};

const DEFAULT_SOURCE_GRADES: Record<ResearchSourceType, SourceGrade> = {
  government: "A",
  international: "A",
  original_data: "A",
  research: "B",
  academic: "B",
  company: "B",
  media: "C",
  industry: "C",
  user_material: "B",
};

const CLEAR_POLICY: UncertaintyPolicy = {
  labelRequired: false,
  reviewRequired: false,
};

export function getGradePolicy(grade: SourceGrade): GradePolicy {
  return GRADE_POLICIES[grade];
}

export function getDefaultSourcePolicy(sourceType: ResearchSourceType): SourcePolicy {
  const gradePolicy = getGradePolicy(DEFAULT_SOURCE_GRADES[sourceType]);
  return { ...gradePolicy, sourceType };
}

export function canSupportMajorClaim(grade: SourceGrade): boolean {
  return getGradePolicy(grade).canSupportMajorClaim;
}

export function canSupportMajorNumber(grade: SourceGrade): boolean {
  return getGradePolicy(grade).canSupportMajorNumber;
}

export function canSourceStandAlone(grade: SourceGrade): boolean {
  return getGradePolicy(grade).canStandAlone;
}

export function getUncertaintyPolicy(input: UncertaintyPolicyInput): UncertaintyPolicy {
  if (input.status === "conflicting") {
    return {
      labelRequired: true,
      reviewRequired: true,
      label: "conflicting",
    };
  }
  if (input.status === "assumption" || input.confidence === "assumption") {
    return {
      labelRequired: true,
      reviewRequired: true,
      label: "assumption",
    };
  }
  if (input.status === "uncertain" || input.confidence === "low") {
    return {
      labelRequired: true,
      reviewRequired: true,
      label: "uncertain",
    };
  }
  return CLEAR_POLICY;
}
