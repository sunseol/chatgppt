import type { LayoutPrototype } from "@/lib/deck-types";

const LIVE_REVIEW_OVERLAY_ROLES: readonly string[] = [
  "title",
  "subtitle",
  "body",
  "metric",
  "caption",
  "source",
  "sectionMarker",
  "cta",
  "chart",
  "table",
];

export function buildRequiredOverlayRolesBySlide(
  layout: LayoutPrototype | undefined,
): Readonly<Record<number, readonly string[]>> | undefined {
  if (layout === undefined) return undefined;
  const rolesBySlide: Record<number, readonly string[]> = {};
  for (const slide of layout.slides) {
    rolesBySlide[slide.number] = uniqueReservedOverlayRoles(slide.domLayers);
  }
  return rolesBySlide;
}

function uniqueReservedOverlayRoles(
  layers: LayoutPrototype["slides"][number]["domLayers"],
): readonly string[] {
  const roles: string[] = [];
  for (const layer of layers) {
    if (!LIVE_REVIEW_OVERLAY_ROLES.includes(layer.role) || roles.includes(layer.role)) continue;
    roles.push(layer.role);
  }
  return roles;
}
