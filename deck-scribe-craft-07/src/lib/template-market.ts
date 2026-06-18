import { isAllowedLayoutComponent, type LayoutComponentType } from "./layout-component-catalog";

export type TemplateMarketCategory = "pitch" | "report" | "strategy" | "education";

export type TemplateMarketSlide = {
  readonly id: string;
  readonly componentType: string;
  readonly html: string;
};

export type TemplateMarketEntry = {
  readonly id: string;
  readonly name: string;
  readonly category: TemplateMarketCategory;
  readonly aspectRatio: "16:9" | "4:3";
  readonly tags: readonly string[];
  readonly slides: readonly TemplateMarketSlide[];
};

export type TemplateMarketFilter = {
  readonly query?: string;
  readonly aspectRatio?: "16:9" | "4:3";
  readonly componentType?: LayoutComponentType;
};

export type TemplateValidationIssue = {
  readonly code: "script-tag" | "inline-handler" | "external-resource" | "unknown-component";
  readonly slideId: string;
};

export class TemplateInstantiationError extends Error {
  readonly name = "TemplateInstantiationError";
}

export function filterTemplateCatalog(
  catalog: readonly TemplateMarketEntry[],
  filter: TemplateMarketFilter,
): readonly TemplateMarketEntry[] {
  const query = filter.query?.trim().toLowerCase();
  return catalog.filter((entry) => {
    if (filter.aspectRatio !== undefined && entry.aspectRatio !== filter.aspectRatio) return false;
    if (
      filter.componentType !== undefined &&
      !entry.slides.some((slide) => slide.componentType === filter.componentType)
    ) {
      return false;
    }
    if (query === undefined || query.length === 0) return true;
    const haystack = `${entry.name} ${entry.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function validateTemplateMarketEntry(
  entry: TemplateMarketEntry,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly TemplateValidationIssue[] } {
  const issues: TemplateValidationIssue[] = [];
  for (const slide of entry.slides) {
    if (/<script\b/i.test(slide.html)) issues.push({ code: "script-tag", slideId: slide.id });
    if (/\son[a-z]+\s*=/i.test(slide.html)) {
      issues.push({ code: "inline-handler", slideId: slide.id });
    }
    if (
      /(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(slide.html) ||
      /@import\s+url\(["']?https?:\/\//i.test(slide.html)
    ) {
      issues.push({ code: "external-resource", slideId: slide.id });
    }
    if (!isAllowedLayoutComponent(slide.componentType)) {
      issues.push({ code: "unknown-component", slideId: slide.id });
    }
  }
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export function instantiateTemplate(
  entry: TemplateMarketEntry,
  placeholders: Readonly<Record<string, string>>,
): {
  readonly id: string;
  readonly name: string;
  readonly slides: readonly {
    readonly id: string;
    readonly componentType: LayoutComponentType;
    readonly html: string;
  }[];
} {
  const validation = validateTemplateMarketEntry(entry);
  if (!validation.ok) {
    throw new TemplateInstantiationError(
      `Template "${entry.id}" failed validation: ${validation.issues
        .map((issue) => issue.code)
        .join(", ")}.`,
    );
  }
  return {
    id: entry.id,
    name: entry.name,
    slides: entry.slides.map((slide) => ({
      id: slide.id,
      componentType: ensureComponentType(slide.componentType),
      html: slide.html.replace(
        /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
        (_, token: string) => placeholders[token] ?? "",
      ),
    })),
  };
}

function ensureComponentType(componentType: string): LayoutComponentType {
  if (!isAllowedLayoutComponent(componentType)) {
    throw new TemplateInstantiationError(`Unsupported component type "${componentType}".`);
  }
  return componentType;
}
