export function secretMaterialCandidates(rawSecret: string): readonly string[] {
  const secretBytes = new TextEncoder().encode(rawSecret);
  const encodedSecret = encodeURIComponent(rawSecret);
  const base64Secret = bytesToBase64(secretBytes);
  const base64UrlSecret = base64Secret.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  const hexSecret = bytesToHex(secretBytes);
  return Array.from(
    new Set([
      rawSecret,
      encodedSecret,
      encodedSecret.toLowerCase(),
      base64Secret,
      base64UrlSecret,
      hexSecret,
    ]),
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)));
  }
  return btoa(chunks.join(""));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
