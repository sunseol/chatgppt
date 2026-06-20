export class ImageArtifactStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageArtifactStoreError";
  }
}
