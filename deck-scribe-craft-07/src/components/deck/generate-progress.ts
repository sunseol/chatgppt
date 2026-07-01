import type { GeneratedSlide } from "@/lib/deck-types";

export function resolveGenerateProgress(slides: readonly GeneratedSlide[] | undefined): number {
  if (slides === undefined || slides.length === 0) return 0;
  const readyCount = slides.filter((slide) => slide.status === "ready").length;
  return Math.round((readyCount / slides.length) * 100);
}
