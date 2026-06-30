import path from "node:path";

export function releaseTemplatePaths(templateDir) {
  return {
    packagedGoldenPathManifest: path.join(templateDir, "packaged-golden-path-manifest.json"),
    cleanMachineManifest: path.join(templateDir, "clean-machine-manifest.json"),
    powerPointRoundTripManifest: path.join(templateDir, "powerpoint-round-trip-manifest.json"),
    nonDeveloperUatManifest: path.join(templateDir, "non-developer-uat-manifest.json"),
    releaseEvidenceTemplate: path.join(templateDir, "release-evidence-manifest.json"),
    releaseArtifactVerification: path.join(templateDir, "release-artifact", "verification.json"),
    uiContractVerification: path.join(templateDir, "gppt-ui-contract", "verification.json"),
    automationVerification: path.join(templateDir, "production-ui-e2e", "verification.json"),
    section45Verification: path.join(templateDir, "section45", "verification.json"),
    visualCouncilVerification: path.join(templateDir, "visual-council", "verification.json"),
    packagedGoldenPathVerification: path.join(
      templateDir,
      "packaged-golden-path",
      "verification.json",
    ),
    cleanMachineVerification: path.join(templateDir, "clean-machine", "verification.json"),
    powerPointRoundTripVerification: path.join(
      templateDir,
      "powerpoint-round-trip",
      "verification.json",
    ),
    nonDeveloperUatVerification: path.join(templateDir, "non-developer-uat", "verification.json"),
    secretScanVerification: path.join(templateDir, "evidence-secret-scan", "verification.json"),
    releaseEvidenceManifest: path.join(templateDir, "release-evidence-manifest.intake.json"),
    preflightVerification: path.join(
      templateDir,
      "release-evidence-preflight",
      "verification.json",
    ),
    ticketStatus: path.join(templateDir, "split-ticket-status.json"),
    ticketStatusReport: path.join(templateDir, "split-ticket-status.md"),
    ticketIssueComments: path.join(templateDir, "split-ticket-comments.json"),
  };
}
