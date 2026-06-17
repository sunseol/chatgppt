import { describe, expect, test } from "bun:test";
import { createVisualAssetPlacementPlan, ProjectAssetPlacementError } from "./asset-placement";
import { importProjectAsset } from "./project-assets";

describe("visual asset placement", () => {
  test("prioritizes user-provided logo assets over generated candidates", () => {
    const logo = importProjectAsset(
      {
        projectId: "project_001",
        fileName: "brand-logo.png",
        mimeType: "image/png",
        content: "logo-bytes",
        sensitive: false,
      },
      { version: 1, importedAt: 100 },
    );

    const plan = createVisualAssetPlacementPlan({
      role: "logo",
      destination: "design_system",
      transferTarget: "external_provider",
      userAssets: [logo],
      generatedCandidates: [
        {
          id: "generated_logo_001",
          role: "logo",
          description: "generic generated mark",
        },
      ],
    });

    expect(plan.suggestions.map((suggestion) => suggestion.kind)).toEqual([
      "user_asset",
      "generated",
    ]);
    expect(plan.suggestions.at(0)).toEqual({
      kind: "user_asset",
      role: "logo",
      destination: "design_system",
      sourceAssetId: logo.artifact.id,
      assetPath: "projects/project_001/assets/brand-logo.png.v1",
      originalFileName: "brand-logo.png",
      priority: 0,
      transferReview: {
        target: "external_provider",
        requiresUserConfirmation: false,
        reason:
          "User asset project_001_asset_brand-logo_png_v1 can be sent to an external provider after normal confirmation.",
      },
      promptInstruction:
        "Use user-provided logo asset project_001_asset_brand-logo_png_v1 from brand-logo.png before considering generated imagery.",
    });
  });

  test("requires confirmation before external provider transfer for sensitive product images", () => {
    const productImage = importProjectAsset(
      {
        projectId: "project_001",
        fileName: "roadmap-product.png",
        mimeType: "image/png",
        content: "private-product-image",
        sensitive: true,
      },
      { version: 3, importedAt: 200 },
    );

    const plan = createVisualAssetPlacementPlan({
      role: "product_image",
      destination: "slide_spec",
      transferTarget: "external_provider",
      userAssets: [productImage],
      generatedCandidates: [],
    });

    expect(plan.suggestions.at(0)).toEqual({
      kind: "user_asset",
      role: "product_image",
      destination: "slide_spec",
      sourceAssetId: productImage.artifact.id,
      assetPath: "projects/project_001/assets/roadmap-product.png.v3",
      originalFileName: "roadmap-product.png",
      priority: 0,
      transferReview: {
        target: "external_provider",
        requiresUserConfirmation: true,
        reason:
          "Sensitive user asset project_001_asset_roadmap-product_png_v3 requires review before external provider transfer.",
      },
      promptInstruction:
        "Use user-provided product image asset project_001_asset_roadmap-product_png_v3 from roadmap-product.png before considering generated imagery.",
    });
  });

  test("keeps local slide-spec placement usable without provider confirmation", () => {
    const productImage = importProjectAsset(
      {
        projectId: "project_001",
        fileName: "public-product.png",
        mimeType: "image/png",
        content: "public-product-image",
        sensitive: false,
      },
      { version: 1, importedAt: 300 },
    );

    const plan = createVisualAssetPlacementPlan({
      role: "product_image",
      destination: "slide_spec",
      transferTarget: "local",
      userAssets: [productImage],
      generatedCandidates: [],
    });

    expect(plan.suggestions.at(0)).toEqual({
      kind: "user_asset",
      role: "product_image",
      destination: "slide_spec",
      sourceAssetId: productImage.artifact.id,
      assetPath: "projects/project_001/assets/public-product.png.v1",
      originalFileName: "public-product.png",
      priority: 0,
      transferReview: {
        target: "local",
        requiresUserConfirmation: false,
        reason: "Local use does not transfer the user asset to an external provider.",
      },
      promptInstruction:
        "Use user-provided product image asset project_001_asset_public-product_png_v1 from public-product.png before considering generated imagery.",
    });
  });

  test("rejects non-image assets for visual placement", () => {
    const pdf = importProjectAsset(
      {
        projectId: "project_001",
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        content: "%PDF",
        sensitive: false,
      },
      { version: 1, importedAt: 400 },
    );

    expect(() =>
      createVisualAssetPlacementPlan({
        role: "logo",
        destination: "design_system",
        transferTarget: "local",
        userAssets: [pdf],
        generatedCandidates: [],
      }),
    ).toThrow(ProjectAssetPlacementError);
  });
});
