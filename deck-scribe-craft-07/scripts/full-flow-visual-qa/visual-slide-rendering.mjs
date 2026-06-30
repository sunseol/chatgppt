import { createHash } from "node:crypto";
import { encodeRgbaPngDataUrl } from "../../src/lib/png-encoder.ts";

const SLIDE_IMAGES = new Map();

export function paddedSlide(slideNumber) {
  return String(slideNumber).padStart(3, "0");
}

export function liveHash(slideNumber) {
  return liveSlideImage(slideNumber).hash;
}

export function liveSlideImage(slideNumber) {
  const cached = SLIDE_IMAGES.get(slideNumber);
  if (cached) return cached;
  const dataUrl = createGeneratedSlidePngDataUrl(slideNumber);
  const image = {
    dataUrl,
    hash: `sha256:${createHash("sha256").update(dataUrl).digest("hex")}`,
  };
  SLIDE_IMAGES.set(slideNumber, image);
  return image;
}

export function liveCompositionSvg({ slideNumber, imageDataUrl, title, body, source }) {
  const chartBars = slideNumber === 1 ? [116, 172, 136, 224] : [124, 166, 214, 244];
  const titleSize = slideNumber === 1 ? 78 : 70;
  const bodyLines = body
    .split(". ")
    .map((line, index, lines) =>
      index === lines.length - 1 || line.endsWith(".") ? line : `${line}.`,
    );
  return [
    `<svg data-final-slide="${slideNumber}" data-export-basis="compositor" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">`,
    `<rect x="0" y="0" width="1280" height="720" fill="#f6f1e7" />`,
    `<image data-role="generated-background" data-locked="true" href="${imageDataUrl}" data-background-artifact-id="p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1" data-background-artifact-path="projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.png" data-background-artifact-hash="${liveHash(slideNumber)}" x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice" opacity="0.16" />`,
    `<rect x="44" y="40" width="1192" height="640" rx="14" fill="#fffaf1" stroke="#d8cfc2" stroke-width="2" />`,
    `<rect x="742" y="134" width="448" height="376" rx="10" fill="#ffffff" stroke="#ddd5ca" stroke-width="2" />`,
    `<text x="76" y="88" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="750" letter-spacing="4" fill="#c87324">FINAL PPT SLIDE</text>`,
    `<g data-role="editable-overlays">`,
    `<text data-editable-layer="title_${slideNumber}" data-layer-type="text" data-role="title" x="76" y="150" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="850" fill="#202735">${escapeXml(title)}</text>`,
    `<text data-editable-layer="body_${slideNumber}" data-layer-type="text" data-role="body" x="78" y="234" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="800" fill="#303a4a">${escapeXml(bodyLines[0] ?? body)}</text>`,
    bodyLines[1]
      ? `<text data-editable-layer="body_${slideNumber}_line_2" data-layer-type="text" data-role="body" x="78" y="290" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="800" fill="#303a4a">${escapeXml(bodyLines[1])}</text>`
      : "",
    `<rect x="78" y="336" width="534" height="10" rx="5" fill="#c87324" opacity="0.92" />`,
    `<rect x="78" y="374" width="578" height="8" rx="4" fill="#637182" opacity="0.7" />`,
    `<rect x="78" y="410" width="426" height="8" rx="4" fill="#637182" opacity="0.45" />`,
    `<g data-editable-layer="chart_${slideNumber}" data-layer-type="shape" data-role="chart">`,
    `<text x="778" y="196" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#303a4a">Approval confidence</text>`,
    `<line x1="778" y1="448" x2="1136" y2="448" stroke="#202735" stroke-width="4" opacity="0.72" />`,
    ...chartBars.map(
      (height, index) =>
        `<rect x="${820 + index * 78}" y="${448 - height}" width="46" height="${height}" rx="6" fill="${index === chartBars.length - 1 ? "#c87324" : "#637182"}" opacity="${index === chartBars.length - 1 ? "1" : "0.85"}" />`,
    ),
    `</g>`,
    `<text data-editable-layer="source_${slideNumber}" data-layer-type="text" data-role="source" x="76" y="638" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="650" fill="#4f5968">${escapeXml(source)}</text>`,
    `</g>`,
    `</svg>`,
  ].join("");
}

function createGeneratedSlidePngDataUrl(slideNumber) {
  const width = 320;
  const height = 180;
  const rgba = new Uint8Array((1 + width * 4) * height);
  const palette = slideNumber === 1 ? warmPalette() : coolPalette();

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    rgba[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const drift = Math.round((x / width) * 10 + (y / height) * 8);
      setPixel(rgba, width, x, y, {
        r: Math.min(255, palette.base.r + drift),
        g: Math.min(255, palette.base.g + Math.round(drift / 2)),
        b: Math.min(255, palette.base.b + drift),
        a: 255,
      });
    }
  }

  drawRect(rgba, width, height, 18, 20, 126, 122, palette.panel);
  drawRect(rgba, width, height, 166, 26, 132, 104, { ...palette.panel, a: 235 });
  drawRect(rgba, width, height, 34, 38, 76, 8, { ...palette.accent, a: 230 });
  drawRect(rgba, width, height, 34, 58, 92, 6, { ...palette.ink, a: 185 });
  drawRect(rgba, width, height, 34, 74, 62, 6, { ...palette.soft, a: 170 });
  drawRect(rgba, width, height, 34, 96, 92, 26, { ...palette.accent, a: 45 });

  const bars = slideNumber === 1 ? [36, 58, 42, 78] : [42, 60, 82, 96];
  bars.forEach((barHeight, index) => {
    drawRect(
      rgba,
      width,
      height,
      184 + index * 24,
      128 - barHeight,
      14,
      barHeight,
      index === bars.length - 1 ? palette.accent : { ...palette.soft, a: 190 },
    );
  });
  drawRect(rgba, width, height, 176, 132, 108, 3, { ...palette.ink, a: 150 });
  drawRect(rgba, width, height, 24, 154, 272, 2, { ...palette.ink, a: 45 });
  return encodeRgbaPngDataUrl({ width, height, rgba });
}

function warmPalette() {
  return {
    base: { r: 244, g: 238, b: 227, a: 255 },
    panel: { r: 255, g: 250, b: 241, a: 255 },
    accent: { r: 196, g: 111, b: 38, a: 255 },
    ink: { r: 31, g: 39, b: 53, a: 255 },
    soft: { r: 99, g: 113, b: 130, a: 255 },
  };
}

function coolPalette() {
  return {
    base: { r: 237, g: 244, b: 241, a: 255 },
    panel: { r: 250, g: 253, b: 249, a: 255 },
    accent: { r: 44, g: 139, b: 103, a: 255 },
    ink: { r: 31, g: 39, b: 53, a: 255 },
    soft: { r: 96, g: 116, b: 128, a: 255 },
  };
}

function drawRect(rgba, width, height, x, y, w, h, color) {
  for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) {
      blendPixel(rgba, width, xx, yy, color);
    }
  }
}

function setPixel(rgba, width, x, y, color) {
  const offset = y * (1 + width * 4) + 1 + x * 4;
  rgba[offset] = color.r;
  rgba[offset + 1] = color.g;
  rgba[offset + 2] = color.b;
  rgba[offset + 3] = color.a;
}

function blendPixel(rgba, width, x, y, color) {
  const offset = y * (1 + width * 4) + 1 + x * 4;
  const alpha = color.a / 255;
  rgba[offset] = Math.round(color.r * alpha + rgba[offset] * (1 - alpha));
  rgba[offset + 1] = Math.round(color.g * alpha + rgba[offset + 1] * (1 - alpha));
  rgba[offset + 2] = Math.round(color.b * alpha + rgba[offset + 2] * (1 - alpha));
  rgba[offset + 3] = 255;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
