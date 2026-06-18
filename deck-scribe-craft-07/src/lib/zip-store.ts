export type StoredZipEntry = {
  readonly path: string;
  readonly content: string | Uint8Array;
};

type PreparedZipEntry = {
  readonly pathBytes: Uint8Array;
  readonly contentBytes: Uint8Array;
  readonly crc: number;
  readonly localOffset: number;
};

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;

export function buildStoredZip(entries: readonly StoredZipEntry[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const preparedEntries: PreparedZipEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const pathBytes = utf8(entry.path);
    const contentBytes = typeof entry.content === "string" ? utf8(entry.content) : entry.content;
    const prepared = {
      pathBytes,
      contentBytes,
      crc: crc32(contentBytes),
      localOffset: offset,
    };
    const localHeader = localHeaderFor(prepared);
    localParts.push(localHeader, contentBytes);
    preparedEntries.push(prepared);
    offset += localHeader.length + contentBytes.length;
  }

  const centralOffset = offset;
  for (const entry of preparedEntries) {
    const centralHeader = centralHeaderFor(entry);
    centralParts.push(centralHeader);
    offset += centralHeader.length;
  }
  const centralSize = offset - centralOffset;
  return concatBytes([
    ...localParts,
    ...centralParts,
    endOfCentralDirectory(preparedEntries.length, centralSize, centralOffset),
  ]);
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)));
  }
  return btoa(chunks.join(""));
}

function localHeaderFor(entry: PreparedZipEntry): Uint8Array {
  const header = new Uint8Array(30 + entry.pathBytes.length);
  const view = new DataView(header.buffer);
  setU32(view, 0, ZIP_LOCAL_FILE_HEADER);
  setU16(view, 4, 20);
  setU16(view, 6, 0);
  setU16(view, 8, 0);
  setU16(view, 10, 0);
  setU16(view, 12, 0);
  setU32(view, 14, entry.crc);
  setU32(view, 18, entry.contentBytes.length);
  setU32(view, 22, entry.contentBytes.length);
  setU16(view, 26, entry.pathBytes.length);
  setU16(view, 28, 0);
  header.set(entry.pathBytes, 30);
  return header;
}

function centralHeaderFor(entry: PreparedZipEntry): Uint8Array {
  const header = new Uint8Array(46 + entry.pathBytes.length);
  const view = new DataView(header.buffer);
  setU32(view, 0, ZIP_CENTRAL_DIRECTORY_HEADER);
  setU16(view, 4, 20);
  setU16(view, 6, 20);
  setU16(view, 8, 0);
  setU16(view, 10, 0);
  setU16(view, 12, 0);
  setU16(view, 14, 0);
  setU32(view, 16, entry.crc);
  setU32(view, 20, entry.contentBytes.length);
  setU32(view, 24, entry.contentBytes.length);
  setU16(view, 28, entry.pathBytes.length);
  setU16(view, 30, 0);
  setU16(view, 32, 0);
  setU16(view, 34, 0);
  setU16(view, 36, 0);
  setU32(view, 38, 0);
  setU32(view, 42, entry.localOffset);
  header.set(entry.pathBytes, 46);
  return header;
}

function endOfCentralDirectory(
  entryCount: number,
  centralSize: number,
  centralOffset: number,
): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  setU32(view, 0, ZIP_END_OF_CENTRAL_DIRECTORY);
  setU16(view, 4, 0);
  setU16(view, 6, 0);
  setU16(view, 8, entryCount);
  setU16(view, 10, entryCount);
  setU32(view, 12, centralSize);
  setU32(view, 16, centralOffset);
  setU16(view, 20, 0);
  return header;
}

function setU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function setU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
