import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  ProjectAssetImportError,
  createAssetExternalTransferReview,
  importProjectAsset,
} from "./project-assets";

describe("project asset import", () => {
  test("imports uploaded files as hashed project asset artifacts", () => {
    const asset = importProjectAsset(
      {
        projectId: "project_001",
        fileName: " Revenue Table.csv ",
        mimeType: "text/csv",
        content: "year,value\n2026,42",
        sensitive: false,
      },
      { version: 2, importedAt: 123 },
    );

    expect(asset.artifact).toEqual({
      id: "project_001_asset_revenue-table_csv_v2",
      projectId: "project_001",
      type: "asset",
      version: 2,
      hash: hashContent("year,value\n2026,42"),
      path: "projects/project_001/assets/revenue-table.csv.v2",
      createdAt: 123,
    });
    expect(asset.kind).toBe("table");
    expect(asset.referenceTargets).toEqual(["research", "plan", "design"]);
  });

  test("marks sensitive user assets for review before external provider transfer", () => {
    const asset = importProjectAsset(
      {
        projectId: "project_001",
        fileName: "private-research.pdf",
        mimeType: "application/pdf",
        content: "%PDF private",
        sensitive: true,
      },
      { version: 1, importedAt: 200 },
    );

    expect(createAssetExternalTransferReview(asset, "local")).toEqual({
      target: "local",
      requiresUserConfirmation: false,
      reason: "Local use does not transfer the user asset to an external provider.",
    });
    expect(createAssetExternalTransferReview(asset, "external_provider")).toEqual({
      target: "external_provider",
      requiresUserConfirmation: true,
      reason:
        "Sensitive user asset project_001_asset_private-research_pdf_v1 requires review before external provider transfer.",
    });
  });

  test("rejects unsupported uploaded file types", () => {
    expect(() =>
      importProjectAsset(
        {
          projectId: "project_001",
          fileName: "archive.zip",
          mimeType: "application/zip",
          content: "zip",
          sensitive: false,
        },
        { version: 1, importedAt: 1 },
      ),
    ).toThrow(ProjectAssetImportError);
  });
});
