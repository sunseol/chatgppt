export function compositionSvg({ slide, title, body, imagePath }) {
  const artifactId = slide.provenance.artifactId;
  return `<svg data-final-slide="${slide.slideNumber}" data-export-basis="compositor" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
<image data-role="generated-background" data-locked="true" data-background-artifact-id="${artifactId}" data-background-artifact-path="${slide.binaryPath}" data-background-artifact-hash="${slide.binaryHash}" href="${imagePath}" x="0" y="0" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
<rect x="72" y="70" width="720" height="180" fill="rgba(255,255,255,0.86)"/>
<text data-editable-layer="slide_${pad3(slide.slideNumber)}_title" data-layer-type="text" data-role="title" x="112" y="150" font-size="56">${escapeXml(title)}</text>
<text data-editable-layer="slide_${pad3(slide.slideNumber)}_body" data-layer-type="text" data-role="body" x="112" y="218" font-size="32">${escapeXml(body)}</text>
<g data-editable-layer="slide_${pad3(slide.slideNumber)}_chart" data-layer-type="chart" data-role="chart"><rect x="920" y="180" width="520" height="360" fill="none" stroke="#111827" stroke-width="4"/><text x="960" y="248" font-size="30">chart overlay</text></g>
<text data-editable-layer="slide_${pad3(slide.slideNumber)}_source" data-layer-type="text" data-role="source" x="112" y="830" font-size="24">Sources: live-codex-image-${pad3(slide.slideNumber)}</text>
</svg>`;
}

export function reviewCard(item) {
  return `<article><img src="${item.path.split("/").at(-1)}"><h2>Slide ${item.slideNumber}</h2><p>${item.artifactId}</p><button>Approve</button><button>Regenerate</button></article>`;
}

export function presentation(item) {
  return `<h2>Selected presentation preview</h2><img src="${item.path.split("/").at(-1)}"><p>${item.binaryHash}</p>`;
}

export function htmlPage(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:24px;background:#f8fafc;color:#111827}.gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.gallery img,.present img,.compare img{width:100%;border:1px solid #94a3b8}.compare{display:grid;grid-template-columns:1fr 1fr;gap:16px}button{margin-right:8px}</style></head><body><h1>${title}</h1>${body}</body></html>`;
}

export function pad3(value) {
  return String(value).padStart(3, "0");
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
