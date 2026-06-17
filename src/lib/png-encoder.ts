export type RgbaColor = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const ZLIB_HEADER = new Uint8Array([0x78, 0x01]);
const MAX_STORE_BLOCK = 65_535;

export function encodeSolidPngDataUrl(input: {
  readonly width: number;
  readonly height: number;
  readonly color: RgbaColor;
}): string {
  const raw = createRgbaScanlines(input.width, input.height, input.color);
  const png = concatBytes([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr(input.width, input.height)),
    pngChunk("IDAT", zlibStore(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
  return `data:image/png;base64,${bytesToBase64(png)}`;
}

function createRgbaScanlines(width: number, height: number, color: RgbaColor): Uint8Array {
  const rowSize = 1 + width * 4;
  const bytes = new Uint8Array(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowSize;
    bytes[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * 4;
      bytes[offset] = color.r;
      bytes[offset + 1] = color.g;
      bytes[offset + 2] = color.b;
      bytes[offset + 3] = color.a;
    }
  }
  return bytes;
}

function ihdr(width: number, height: number): Uint8Array {
  return concatBytes([u32be(width), u32be(height), new Uint8Array([8, 6, 0, 0, 0])]);
}

function zlibStore(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [ZLIB_HEADER];
  for (let offset = 0; offset < data.length; offset += MAX_STORE_BLOCK) {
    const end = Math.min(offset + MAX_STORE_BLOCK, data.length);
    const block = data.subarray(offset, end);
    const isFinal = end === data.length;
    blocks.push(storedBlock(block, isFinal));
  }
  blocks.push(u32be(adler32(data)));
  return concatBytes(blocks);
}

function storedBlock(data: Uint8Array, isFinal: boolean): Uint8Array {
  const len = data.length;
  const header = new Uint8Array([
    isFinal ? 1 : 0,
    len & 0xff,
    (len >> 8) & 0xff,
    ~len & 0xff,
    (~len >> 8) & 0xff,
  ]);
  return concatBytes([header, data]);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = asciiBytes(type);
  return concatBytes([
    u32be(data.length),
    typeBytes,
    data,
    u32be(crc32(concatBytes([typeBytes, data]))),
  ]);
}

function asciiBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i);
  }
  return bytes;
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

function u32be(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
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

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65_521;
    b = (b + a) % 65_521;
  }
  return ((b << 16) | a) >>> 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)));
  }
  return btoa(chunks.join(""));
}
