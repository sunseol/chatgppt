import { FONT_POLICY, type FontPolicy } from "./font-policy";

export const FONT_SURFACES = ["html_preview", "editor", "svg_export", "pptx_export"] as const;
export const FONT_ROLES = ["title", "body", "caption", "number", "source"] as const;

export type FontSurface = (typeof FONT_SURFACES)[number];
export type FontRole = (typeof FONT_ROLES)[number];

export interface FontRoleMapping {
  readonly family: string;
  readonly lineHeight: number;
  readonly letterSpacing: "0em";
}

export type FontRoleMappings = Record<FontRole, FontRoleMapping>;

export interface FontSurfaceMapping {
  readonly surface: FontSurface;
  readonly roles: FontRoleMappings;
}

export interface ManagedFontPolicy {
  readonly basePolicy: FontPolicy;
  readonly availableKoreanFamilies: readonly string[];
  readonly roleMappings: FontRoleMappings;
  readonly surfaceMappings: readonly FontSurfaceMapping[];
  readonly bundledFontFiles: readonly string[];
}

export interface CreateManagedFontPolicyInput {
  readonly availableFontFamilies?: readonly string[];
}

export interface FontSurfaceConsistencyReport {
  readonly passed: boolean;
  readonly inconsistentRoles: readonly string[];
}

const KOREAN_FALLBACK_CANDIDATES = [
  "Apple SD Gothic Neo",
  "Malgun Gothic",
  "Noto Sans KR",
  "AppleMyungjo",
  "Noto Serif KR",
] as const;

export function detectAvailableKoreanFonts(
  availableFontFamilies: readonly string[],
): readonly string[] {
  const available = new Set(availableFontFamilies.map((family) => family.trim()));
  return KOREAN_FALLBACK_CANDIDATES.filter((candidate) => available.has(candidate));
}

export function createManagedFontPolicy(
  input: CreateManagedFontPolicyInput = {},
): ManagedFontPolicy {
  const roleMappings = createRoleMappings(FONT_POLICY);
  return Object.freeze({
    basePolicy: FONT_POLICY,
    availableKoreanFamilies: Object.freeze(
      detectAvailableKoreanFonts(input.availableFontFamilies ?? []),
    ),
    roleMappings,
    surfaceMappings: Object.freeze(
      FONT_SURFACES.map((surface) => Object.freeze({ surface, roles: roleMappings })),
    ),
    bundledFontFiles: FONT_POLICY.bundledFontFiles,
  });
}

export function validateFontSurfaceConsistency(
  policy: ManagedFontPolicy,
): FontSurfaceConsistencyReport {
  const inconsistentRoles = policy.surfaceMappings.flatMap((surfaceMapping) =>
    FONT_ROLES.filter(
      (role) => !sameMapping(policy.roleMappings[role], surfaceMapping.roles[role]),
    ).map((role) => `${surfaceMapping.surface}:${role}`),
  );
  return {
    passed: inconsistentRoles.length === 0,
    inconsistentRoles,
  };
}

function createRoleMappings(policy: FontPolicy): FontRoleMappings {
  return {
    title: {
      family: policy.serifFamily,
      lineHeight: policy.lineHeight.title,
      letterSpacing: policy.letterSpacing,
    },
    body: {
      family: policy.sansFamily,
      lineHeight: policy.lineHeight.body,
      letterSpacing: policy.letterSpacing,
    },
    caption: {
      family: policy.sansFamily,
      lineHeight: policy.lineHeight.caption,
      letterSpacing: policy.letterSpacing,
    },
    number: {
      family: policy.monoFamily,
      lineHeight: policy.lineHeight.body,
      letterSpacing: policy.letterSpacing,
    },
    source: {
      family: policy.sansFamily,
      lineHeight: policy.lineHeight.caption,
      letterSpacing: policy.letterSpacing,
    },
  };
}

function sameMapping(left: FontRoleMapping, right: FontRoleMapping): boolean {
  return (
    left.family === right.family &&
    left.lineHeight === right.lineHeight &&
    left.letterSpacing === right.letterSpacing
  );
}
