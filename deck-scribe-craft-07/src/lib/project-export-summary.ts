export interface ProjectExportSummary {
  readonly artifactId: string;
  readonly artifactHash: string;
  readonly artifactPath: string;
  readonly createdAt: number;
  readonly pngCount: number;
  readonly svgCount: number;
  readonly hybridSvgCount: number;
  readonly projectFilePath: string;
}
