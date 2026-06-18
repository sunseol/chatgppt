import type { DesignSystem } from "./deck-types";

const FONT_ROLES = ["title", "body", "caption", "number"] as const;
const FONT_LICENSES = ["owned", "licensed", "unknown", "restricted"] as const;
const LOGO_VARIANTS = ["primary", "secondary", "mark"] as const;
const COLOR_TARGETS = [
  "background",
  "textPrimary",
  "textSecondary",
  "primary",
  "secondary",
  "accent",
] as const;

type BrandFontRole = (typeof FONT_ROLES)[number];
type BrandFontLicense = (typeof FONT_LICENSES)[number];
type BrandLogoVariant = (typeof LOGO_VARIANTS)[number];
type BrandColorTarget = (typeof COLOR_TARGETS)[number];

export type BrandKitColorToken = {
  readonly id: string;
  readonly target: BrandColorTarget;
  readonly hex: string;
};

export type BrandKitFontAsset = {
  readonly family: string;
  readonly role: BrandFontRole;
  readonly license: BrandFontLicense;
  readonly embeddable: boolean;
  readonly formats: readonly string[];
};

export type BrandKitLogoAsset = {
  readonly id: string;
  readonly variant: BrandLogoVariant;
  readonly mimeType: string;
  readonly path: string;
};

export type BrandKit = {
  readonly id: string;
  readonly name: string;
  readonly logos: readonly BrandKitLogoAsset[];
  readonly fonts: readonly BrandKitFontAsset[];
  readonly colors: readonly BrandKitColorToken[];
  readonly guidance: readonly string[];
};

export type BrandKitWarning = {
  readonly code: "font-license-review" | "font-embedding-review";
  readonly message: string;
  readonly fontFamily: string;
};

export class BrandKitParseError extends Error {
  readonly name = "BrandKitParseError";
}

export function parseBrandKit(input: unknown): BrandKit {
  const record = asRecord(input, "Brand kit payload must be an object.");
  return {
    id: readString(record, "id"),
    name: readString(record, "name"),
    logos: readArray(record, "logos").map(parseLogo),
    fonts: readArray(record, "fonts").map(parseFont),
    colors: readArray(record, "colors").map(parseColor),
    guidance: readArray(record, "guidance").map((value, index) =>
      readStringAt(value, `guidance[${index}]`),
    ),
  };
}

export function inspectBrandKit(brandKit: BrandKit): readonly BrandKitWarning[] {
  return brandKit.fonts.flatMap((font) => {
    const warnings: BrandKitWarning[] = [];
    if (font.license === "unknown" || font.license === "restricted") {
      warnings.push({
        code: "font-license-review",
        message: `Font ${font.family} needs license review before product use.`,
        fontFamily: font.family,
      });
    }
    if (!font.embeddable) {
      warnings.push({
        code: "font-embedding-review",
        message: `Font ${font.family} may require local installation instead of embedding.`,
        fontFamily: font.family,
      });
    }
    return warnings;
  });
}

export function applyBrandKitToDesignSystem(
  design: DesignSystem,
  brandKit: BrandKit,
): { readonly design: DesignSystem; readonly warnings: readonly BrandKitWarning[] } {
  const typographyByRole = new Map(brandKit.fonts.map((font) => [font.role, font.family] as const));
  const colors = { ...design.colors };
  for (const token of brandKit.colors) colors[token.target] = token.hex;
  const componentRules = dedupe([
    ...design.componentRules,
    ...brandKit.guidance.map((line) => `brand-kit: ${line}`),
    ...(brandKit.logos.length === 0
      ? []
      : [`brand-kit logos: ${brandKit.logos.map((logo) => logo.variant).join(", ")}`]),
  ]);
  return {
    design: {
      ...design,
      colors,
      typography: {
        ...design.typography,
        titleStyle: typographyByRole.get("title") ?? design.typography.titleStyle,
        bodyStyle: typographyByRole.get("body") ?? design.typography.bodyStyle,
        title: {
          ...design.typography.title,
          style: typographyByRole.get("title") ?? design.typography.title.style,
        },
        body: {
          ...design.typography.body,
          style: typographyByRole.get("body") ?? design.typography.body.style,
        },
        caption: {
          ...design.typography.caption,
          style: typographyByRole.get("caption") ?? design.typography.caption.style,
        },
        number: {
          ...design.typography.number,
          style: typographyByRole.get("number") ?? design.typography.number.style,
        },
      },
      componentRules: [...componentRules],
      visualLanguage: design.visualLanguage.includes(brandKit.name)
        ? design.visualLanguage
        : `${design.visualLanguage} · ${brandKit.name}`,
    },
    warnings: inspectBrandKit(brandKit),
  };
}

function parseLogo(value: unknown): BrandKitLogoAsset {
  const record = asRecord(value, "Brand logo must be an object.");
  const variant = readString(record, "variant");
  if (!isBrandLogoVariant(variant)) {
    throw new BrandKitParseError(`Unsupported logo variant "${variant}".`);
  }
  return {
    id: readString(record, "id"),
    variant: variant as BrandLogoVariant,
    mimeType: readString(record, "mimeType"),
    path: readString(record, "path"),
  };
}

function parseFont(value: unknown): BrandKitFontAsset {
  const record = asRecord(value, "Brand font must be an object.");
  const role = readString(record, "role");
  const license = readString(record, "license");
  if (!isBrandFontRole(role)) {
    throw new BrandKitParseError(`Unsupported font role "${role}".`);
  }
  if (!isBrandFontLicense(license)) {
    throw new BrandKitParseError(`Unsupported font license "${license}".`);
  }
  return {
    family: readString(record, "family"),
    role: role as BrandFontRole,
    license: license as BrandFontLicense,
    embeddable: readBoolean(record, "embeddable"),
    formats: readArray(record, "formats").map((item, index) =>
      readStringAt(item, `formats[${index}]`),
    ),
  };
}

function parseColor(value: unknown): BrandKitColorToken {
  const record = asRecord(value, "Brand color token must be an object.");
  const target = readString(record, "target");
  const hex = readString(record, "hex");
  if (!isBrandColorTarget(target)) {
    throw new BrandKitParseError(`Unsupported brand color target "${target}".`);
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new BrandKitParseError(`Brand color "${hex}" must be a 6-digit hex value.`);
  }
  return { id: readString(record, "id"), target: target as BrandColorTarget, hex };
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BrandKitParseError(message);
  }
  return value as Record<string, unknown>;
}

function readArray(record: Record<string, unknown>, key: string): readonly unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new BrandKitParseError(`Field "${key}" must be an array.`);
  return value;
}

function readString(record: Record<string, unknown>, key: string): string {
  return readStringAt(record[key], key);
}

function readStringAt(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BrandKitParseError(`Field "${label}" must be a non-empty string.`);
  }
  return value.trim();
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  if (typeof record[key] !== "boolean") {
    throw new BrandKitParseError(`Field "${key}" must be a boolean.`);
  }
  return record[key];
}

function isBrandLogoVariant(value: string): value is BrandLogoVariant {
  return LOGO_VARIANTS.includes(value as BrandLogoVariant);
}

function isBrandFontRole(value: string): value is BrandFontRole {
  return FONT_ROLES.includes(value as BrandFontRole);
}

function isBrandFontLicense(value: string): value is BrandFontLicense {
  return FONT_LICENSES.includes(value as BrandFontLicense);
}

function isBrandColorTarget(value: string): value is BrandColorTarget {
  return COLOR_TARGETS.includes(value as BrandColorTarget);
}

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)];
}
