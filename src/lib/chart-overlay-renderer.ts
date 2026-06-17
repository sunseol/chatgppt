import type { BasicChartOverlay, ChartOverlayRow } from "./chart-overlay";

type PlotArea = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function renderBasicChartOverlaySvg(overlay: BasicChartOverlay): string {
  const width = 640;
  const height = 360;
  const plot = { x: 48, y: 32, width: 544, height: 248 };
  const body = overlay.chartType === "bar" ? renderBars(overlay, plot) : renderLine(overlay, plot);

  return [
    `<svg data-chart-overlay="${escapeXml(overlay.id)}" data-dataset-id="${escapeXml(
      overlay.datasetId,
    )}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escapeXml(overlay.chartId)} ${escapeXml(overlay.period)}</title>`,
    `<g data-placeholder-id="${escapeXml(overlay.placeholderId)}">`,
    body,
    `<text x="48" y="330" font-size="16">${escapeXml(overlay.unit)} · ${escapeXml(
      overlay.sourceIds.join(", "),
    )}</text>`,
    "</g>",
    "</svg>",
  ].join("");
}

function renderBars(overlay: BasicChartOverlay, plot: PlotArea): string {
  const max = maxValue(overlay.rows);
  const gap = 18;
  const barWidth = (plot.width - gap * (overlay.rows.length - 1)) / overlay.rows.length;
  return overlay.rows
    .map((row, index) => {
      const barHeight = (row.value / max) * plot.height;
      const x = plot.x + index * (barWidth + gap);
      const y = plot.y + plot.height - barHeight;
      return [
        `<rect data-row-label="${escapeXml(row.label)}" x="${round(x)}" y="${round(y)}" width="${round(
          barWidth,
        )}" height="${round(barHeight)}" />`,
        `<text x="${round(x)}" y="${plot.y + plot.height + 28}" font-size="14">${escapeXml(
          row.label,
        )}</text>`,
      ].join("");
    })
    .join("");
}

function renderLine(overlay: BasicChartOverlay, plot: PlotArea): string {
  const max = maxValue(overlay.rows);
  const step = overlay.rows.length <= 1 ? 0 : plot.width / (overlay.rows.length - 1);
  const points = overlay.rows.map((row, index) => ({
    label: row.label,
    x: plot.x + index * step,
    y: plot.y + plot.height - (row.value / max) * plot.height,
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`)
    .join(" ");
  const circles = points
    .map(
      (point) =>
        `<circle data-row-label="${escapeXml(point.label)}" cx="${round(point.x)}" cy="${round(
          point.y,
        )}" r="5" />`,
    )
    .join("");
  const labels = points
    .map(
      (point) =>
        `<text x="${round(point.x)}" y="${plot.y + plot.height + 28}" font-size="14">${escapeXml(
          point.label,
        )}</text>`,
    )
    .join("");
  return `<path d="${path}" fill="none" stroke-width="4" />${circles}${labels}`;
}

function maxValue(rows: readonly ChartOverlayRow[]): number {
  return Math.max(1, ...rows.map((row) => row.value));
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
