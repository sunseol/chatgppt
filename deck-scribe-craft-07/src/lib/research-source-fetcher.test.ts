import { describe, expect, test } from "bun:test";
import { fetchResearchSource, requiresSensitiveTransferReview } from "./research-source-fetcher";

describe("research source fetcher", () => {
  test("fetches a web page with source metadata", async () => {
    const result = await fetchResearchSource(
      {
        id: "fetch_web",
        kind: "web_page",
        sourceType: "government",
        url: "https://example.gov/report",
        transferTarget: "local",
      },
      {
        now: () => 1_789_200_000,
        fetchUrl: async () => "<html>official report</html>",
        readFile: async () => "unused",
      },
    );

    expect(result.status).toBe("succeeded");
    expect(result.rawContent).toBe("<html>official report</html>");
    expect(result.locator).toEqual({ url: "https://example.gov/report" });
    expect(result.fetchedAt).toBe(1_789_200_000);
    expect(result.sourceType).toBe("government");
    expect(result.kind).toBe("web_page");
  });

  test("captures live URL response metadata and a content hash", async () => {
    const result = await fetchResearchSource(
      {
        id: "fetch_pdf",
        kind: "pdf",
        sourceType: "government",
        url: "https://example.gov/report.pdf",
        transferTarget: "local",
        method: "GET",
      },
      {
        now: () => 1_789_200_010,
        fetchUrl: async () => ({
          rawContent: "PDF text",
          finalUrl: "https://cdn.example.gov/report.pdf",
          mimeType: "application/pdf",
          statusCode: 200,
        }),
        readFile: async () => "unused",
      },
    );

    expect(result.status).toBe("succeeded");
    expect(result.rawContent).toBe("PDF text");
    expect(result.originalUrl).toBe("https://example.gov/report.pdf");
    expect(result.finalUrl).toBe("https://cdn.example.gov/report.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.statusCode).toBe(200);
    expect(result.contentHash?.startsWith("sha256:")).toBe(true);
  });

  test("blocks non GET or HEAD network methods before fetch", async () => {
    let fetchCount = 0;
    const result = await fetchResearchSource(
      {
        id: "fetch_post",
        kind: "web_page",
        sourceType: "company",
        url: "https://example.com/form",
        transferTarget: "local",
        method: "POST",
      },
      {
        now: () => 1_789_200_011,
        fetchUrl: async () => {
          fetchCount += 1;
          return "<html>should not fetch</html>";
        },
        readFile: async () => "unused",
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.retryable).toBe(false);
    expect(result.error?.includes("GET/HEAD")).toBe(true);
    expect(fetchCount).toBe(0);
  });

  test("reads local data files with file metadata", async () => {
    const result = await fetchResearchSource(
      {
        id: "fetch_csv",
        kind: "csv",
        sourceType: "user_material",
        filePath: "/project/assets/revenue.csv",
        transferTarget: "local",
      },
      {
        now: () => 1_789_200_001,
        fetchUrl: async () => "unused",
        readFile: async () => "year,value\n2025,42",
      },
    );

    expect(result.status).toBe("succeeded");
    expect(result.rawContent).toBe("year,value\n2025,42");
    expect(result.locator).toEqual({ filePath: "/project/assets/revenue.csv" });
    expect(result.fetchedAt).toBe(1_789_200_001);
    expect(result.sourceType).toBe("user_material");
    expect(result.kind).toBe("csv");
  });

  test("returns retryable failed state", async () => {
    const result = await fetchResearchSource(
      {
        id: "fetch_api",
        kind: "official_api",
        sourceType: "international",
        url: "https://api.example.int/data",
        transferTarget: "local",
      },
      {
        now: () => 1_789_200_002,
        fetchUrl: async () => {
          throw new Error("timeout");
        },
        readFile: async () => "unused",
      },
    );

    expect(result.status).toBe("failed");
    expect(result.retryable).toBe(true);
    expect(result.error).toBe("timeout");
    expect(result.locator).toEqual({ url: "https://api.example.int/data" });
  });

  test("blocks sensitive user files before external transfer", async () => {
    let readCount = 0;
    const request = {
      id: "fetch_sensitive",
      kind: "pdf" as const,
      sourceType: "user_material" as const,
      filePath: "/project/assets/private.pdf",
      transferTarget: "external_provider" as const,
      userProvided: true,
      sensitive: true,
    };
    const result = await fetchResearchSource(request, {
      now: () => 1_789_200_003,
      fetchUrl: async () => "unused",
      readFile: async () => {
        readCount += 1;
        return "secret";
      },
    });

    expect(requiresSensitiveTransferReview(request)).toBe(true);
    expect(result.status).toBe("blocked");
    expect(result.needsUserReview).toBe(true);
    expect(result.retryable).toBe(false);
    expect(readCount).toBe(0);
  });
});
