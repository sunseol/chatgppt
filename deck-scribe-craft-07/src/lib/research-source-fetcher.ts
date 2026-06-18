import { hashContent } from "./artifacts";
import type { ResearchSourceType } from "./research-types";

export type ResearchFetchKind = "web_page" | "pdf" | "csv" | "xlsx" | "official_api" | "text_file";
export type ResearchTransferTarget = "local" | "external_provider";
export type ResearchFetchStatus = "succeeded" | "failed" | "blocked";
export type ResearchNetworkMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ResearchUrlFetchResponse {
  readonly rawContent: string;
  readonly finalUrl: string;
  readonly mimeType: string;
  readonly statusCode: number;
}

export interface ResearchFetchRequest {
  readonly id: string;
  readonly kind: ResearchFetchKind;
  readonly sourceType: ResearchSourceType;
  readonly transferTarget: ResearchTransferTarget;
  readonly method?: ResearchNetworkMethod;
  readonly url?: string;
  readonly filePath?: string;
  readonly userProvided?: boolean;
  readonly sensitive?: boolean;
}

export interface ResearchFetchDependencies {
  readonly now: () => number;
  readonly fetchUrl: (
    url: string,
    request: ResearchFetchRequest,
  ) => Promise<string | ResearchUrlFetchResponse>;
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
  readonly originalUrl?: string;
  readonly finalUrl?: string;
  readonly mimeType?: string;
  readonly statusCode?: number;
  readonly contentHash?: string;
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
  if (isBlockedNetworkMethod(request)) {
    return {
      id: request.id,
      kind: request.kind,
      sourceType: request.sourceType,
      status: "blocked",
      locator,
      fetchedAt,
      retryable: false,
      error: "Source Fetcher only allows GET/HEAD network methods.",
    };
  }

  try {
    const content = await readRawContent(request, dependencies);
    return {
      id: request.id,
      kind: request.kind,
      sourceType: request.sourceType,
      status: "succeeded",
      locator,
      fetchedAt,
      retryable: false,
      rawContent: content.rawContent,
      contentHash: hashContent(content.rawContent),
      ...(content.originalUrl === undefined ? {} : { originalUrl: content.originalUrl }),
      ...(content.finalUrl === undefined ? {} : { finalUrl: content.finalUrl }),
      ...(content.mimeType === undefined ? {} : { mimeType: content.mimeType }),
      ...(content.statusCode === undefined ? {} : { statusCode: content.statusCode }),
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return {
      id: request.id,
      kind: request.kind,
      sourceType: request.sourceType,
      status: "failed",
      locator,
      fetchedAt,
      retryable: true,
      error: error.message,
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
  return isUrlRequest(request) ? { url: request.url } : { filePath: request.filePath };
}

async function readRawContent(
  request: ResearchFetchRequest,
  dependencies: ResearchFetchDependencies,
): Promise<{
  readonly rawContent: string;
  readonly originalUrl?: string;
  readonly finalUrl?: string;
  readonly mimeType?: string;
  readonly statusCode?: number;
}> {
  if (isUrlRequest(request)) {
    if (!request.url) throw new ResearchFetchInputError("URL is required for URL fetch sources.");
    const response = await dependencies.fetchUrl(request.url, request);
    return normalizeUrlResponse(request.url, response);
  }
  if (!request.filePath) {
    throw new ResearchFetchInputError("File path is required for file sources.");
  }
  return { rawContent: await dependencies.readFile(request.filePath, request) };
}

function isUrlRequest(request: ResearchFetchRequest): boolean {
  return (
    request.kind === "web_page" ||
    request.kind === "official_api" ||
    (request.kind === "pdf" && request.url !== undefined)
  );
}

function isBlockedNetworkMethod(request: ResearchFetchRequest): boolean {
  if (!isUrlRequest(request)) return false;
  const method = request.method ?? "GET";
  return method !== "GET" && method !== "HEAD";
}

function normalizeUrlResponse(
  originalUrl: string,
  response: string | ResearchUrlFetchResponse,
): {
  readonly rawContent: string;
  readonly originalUrl: string;
  readonly finalUrl?: string;
  readonly mimeType?: string;
  readonly statusCode?: number;
} {
  if (typeof response === "string") return { rawContent: response, originalUrl };
  return {
    rawContent: response.rawContent,
    originalUrl,
    finalUrl: response.finalUrl,
    mimeType: response.mimeType,
    statusCode: response.statusCode,
  };
}

export class ResearchFetchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchFetchInputError";
  }
}
