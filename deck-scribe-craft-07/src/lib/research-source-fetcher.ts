import type { ResearchSourceType } from "./research-types";

export type ResearchFetchKind = "web_page" | "pdf" | "csv" | "xlsx" | "official_api" | "text_file";
export type ResearchTransferTarget = "local" | "external_provider";
export type ResearchFetchStatus = "succeeded" | "failed" | "blocked";

export interface ResearchFetchRequest {
  readonly id: string;
  readonly kind: ResearchFetchKind;
  readonly sourceType: ResearchSourceType;
  readonly transferTarget: ResearchTransferTarget;
  readonly url?: string;
  readonly filePath?: string;
  readonly userProvided?: boolean;
  readonly sensitive?: boolean;
}

export interface ResearchFetchDependencies {
  readonly now: () => number;
  readonly fetchUrl: (url: string, request: ResearchFetchRequest) => Promise<string>;
  readonly readFile: (filePath: string, request: ResearchFetchRequest) => Promise<string>;
}

export interface ResearchSourceLocator {
  readonly url?: string;
  readonly filePath?: string;
}

export interface ResearchFetchResult {
  readonly id: string;
  readonly kind: ResearchFetchKind;
  readonly sourceType: ResearchSourceType;
  readonly status: ResearchFetchStatus;
  readonly locator: ResearchSourceLocator;
  readonly fetchedAt: number;
  readonly retryable: boolean;
  readonly rawContent?: string;
  readonly error?: string;
  readonly needsUserReview?: boolean;
}

export async function fetchResearchSource(
  request: ResearchFetchRequest,
  dependencies: ResearchFetchDependencies,
): Promise<ResearchFetchResult> {
  const fetchedAt = dependencies.now();
  const locator = createLocator(request);
  if (requiresSensitiveTransferReview(request)) {
    return {
      id: request.id,
      kind: request.kind,
      sourceType: request.sourceType,
      status: "blocked",
      locator,
      fetchedAt,
      retryable: false,
      needsUserReview: true,
      error: "Sensitive user material requires review before external transfer.",
    };
  }

  try {
    const rawContent = await readRawContent(request, dependencies);
    return {
      id: request.id,
      kind: request.kind,
      sourceType: request.sourceType,
      status: "succeeded",
      locator,
      fetchedAt,
      retryable: false,
      rawContent,
    };
  } catch (error) {
    return {
      id: request.id,
      kind: request.kind,
      sourceType: request.sourceType,
      status: "failed",
      locator,
      fetchedAt,
      retryable: true,
      error: getErrorMessage(error),
    };
  }
}

export function requiresSensitiveTransferReview(request: ResearchFetchRequest): boolean {
  return (
    request.transferTarget === "external_provider" &&
    request.userProvided === true &&
    request.sensitive === true
  );
}

function createLocator(request: ResearchFetchRequest): ResearchSourceLocator {
  return isUrlFetchKind(request.kind) ? { url: request.url } : { filePath: request.filePath };
}

async function readRawContent(
  request: ResearchFetchRequest,
  dependencies: ResearchFetchDependencies,
): Promise<string> {
  if (isUrlFetchKind(request.kind)) {
    if (!request.url) throw new ResearchFetchInputError("URL is required for URL fetch sources.");
    return dependencies.fetchUrl(request.url, request);
  }
  if (!request.filePath) {
    throw new ResearchFetchInputError("File path is required for file sources.");
  }
  return dependencies.readFile(request.filePath, request);
}

function isUrlFetchKind(kind: ResearchFetchKind): boolean {
  return kind === "web_page" || kind === "official_api";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ResearchFetchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchFetchInputError";
  }
}
