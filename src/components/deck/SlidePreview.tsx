import type { DesignSystem, GeneratedSlide, SlideSpec } from "@/lib/deck-types";
import { FONT_POLICY } from "@/lib/font-policy";
import { LayerBox, VisualBlock } from "@/components/deck/SlidePreviewVisuals";

export function SlidePreview({
  slide,
  spec,
  design,
  mode = "image",
}: {
  slide: GeneratedSlide;
  spec: SlideSpec;
  design: DesignSystem;
  mode?: "layout" | "image" | "layers";
}) {
  const { w, h } = design.canvas;
  const { background, textPrimary, primary, accent } = design.colors;

  const showLayerBoxes = mode === "layers";
  const isLayout = mode === "layout";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={w} height={h} fill={background} />
      {/* corner mark */}
      <rect x={64} y={64} width={56} height={2} fill={accent} />
      <text
        x={64}
        y={104}
        fontSize={24}
        fontFamily={FONT_POLICY.monoFamily}
        fill={textPrimary}
        opacity={0.55}
      >
        {String(slide.number).padStart(2, "0")} · {spec.role}
      </text>

      {/* title */}
      <foreignObject x={96} y={150} width={w - 192} height={180}>
        <div
          style={{
            fontFamily: FONT_POLICY.serifFamily,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: FONT_POLICY.lineHeight.title,
            letterSpacing: FONT_POLICY.letterSpacing,
            color: textPrimary,
          }}
        >
          {spec.title}
        </div>
      </foreignObject>

      {/* message */}
      <foreignObject x={96} y={350} width={w - 192} height={120}>
        <div
          style={{
            fontFamily: FONT_POLICY.sansFamily,
            fontSize: 34,
            color: textPrimary,
            opacity: 0.75,
            lineHeight: FONT_POLICY.lineHeight.body,
            letterSpacing: FONT_POLICY.letterSpacing,
          }}
        >
          {spec.coreMessage}
        </div>
      </foreignObject>

      {/* visual block */}
      {isLayout ? (
        <g>
          <rect
            x={96}
            y={500}
            width={w - 192}
            height={h - 640}
            fill="none"
            stroke={textPrimary}
            strokeOpacity={0.25}
            strokeDasharray="6 6"
          />
          <text
            x={120}
            y={540}
            fontSize={22}
            fill={textPrimary}
            opacity={0.5}
            fontFamily={FONT_POLICY.sansFamily}
          >
            VISUAL · {spec.visualType}
          </text>
        </g>
      ) : (
        <VisualBlock
          x={96}
          y={500}
          w={w - 192}
          h={h - 640}
          role={spec.role}
          primary={primary}
          accent={accent}
          ink={textPrimary}
        />
      )}

      {/* footer */}
      <line
        x1={96}
        y1={h - 110}
        x2={w - 96}
        y2={h - 110}
        stroke={textPrimary}
        strokeOpacity={0.2}
      />
      <text
        x={96}
        y={h - 60}
        fontSize={22}
        fill={textPrimary}
        opacity={0.5}
        fontFamily={FONT_POLICY.sansFamily}
      >
        {spec.evidence.length ? `출처: ${spec.evidence.join(", ")}` : ""}
      </text>
      <text
        x={w - 96}
        y={h - 60}
        textAnchor="end"
        fontSize={22}
        fill={textPrimary}
        opacity={0.5}
        fontFamily={FONT_POLICY.sansFamily}
      >
        DeckForge · v{slide.version}
      </text>

      {/* layer overlay */}
      {showLayerBoxes && (
        <g>
          <LayerBox x={96} y={150} w={w - 192} h={110} label="title" accent={accent} />
          <LayerBox x={96} y={350} w={w - 192} h={90} label="message" accent={accent} />
          <LayerBox x={96} y={500} w={w - 192} h={h - 640} label="visual" accent={accent} />
          <LayerBox x={96} y={h - 100} w={w - 192} h={40} label="source" accent={accent} />
        </g>
      )}
    </svg>
  );
}
