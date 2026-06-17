import type { DesignSystem, GeneratedSlide, SlideSpec } from "@/lib/deck-types";

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
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width={w} height={h} fill={background} />
      {/* corner mark */}
      <rect x={64} y={64} width={56} height={2} fill={accent} />
      <text x={64} y={104} fontSize={24} fontFamily="ui-sans-serif" fill={textPrimary} opacity={0.55}>
        {String(slide.number).padStart(2, "0")} · {spec.role}
      </text>

      {/* title */}
      <foreignObject x={96} y={150} width={w - 192} height={180}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: textPrimary,
          }}
        >
          {spec.title}
        </div>
      </foreignObject>

      {/* message */}
      <foreignObject x={96} y={350} width={w - 192} height={120}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 34,
            color: textPrimary,
            opacity: 0.75,
            lineHeight: 1.35,
          }}
        >
          {spec.coreMessage}
        </div>
      </foreignObject>

      {/* visual block */}
      {isLayout ? (
        <g>
          <rect x={96} y={500} width={w - 192} height={h - 640} fill="none" stroke={textPrimary} strokeOpacity={0.25} strokeDasharray="6 6" />
          <text x={120} y={540} fontSize={22} fill={textPrimary} opacity={0.5} fontFamily="ui-sans-serif">
            VISUAL · {spec.visualType}
          </text>
        </g>
      ) : (
        <VisualBlock x={96} y={500} w={w - 192} h={h - 640} role={spec.role} primary={primary} accent={accent} ink={textPrimary} />
      )}

      {/* footer */}
      <line x1={96} y1={h - 110} x2={w - 96} y2={h - 110} stroke={textPrimary} strokeOpacity={0.2} />
      <text x={96} y={h - 60} fontSize={22} fill={textPrimary} opacity={0.5} fontFamily="ui-sans-serif">
        {spec.evidence.length ? `출처: ${spec.evidence.join(", ")}` : ""}
      </text>
      <text x={w - 96} y={h - 60} textAnchor="end" fontSize={22} fill={textPrimary} opacity={0.5} fontFamily="ui-sans-serif">
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

function LayerBox({ x, y, w, h, label, accent }: { x: number; y: number; w: number; h: number; label: string; accent: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={accent} strokeWidth={2} />
      <rect x={x} y={y - 28} width={label.length * 14 + 24} height={28} fill={accent} />
      <text x={x + 12} y={y - 8} fontSize={18} fill="#1A1B26" fontFamily="ui-monospace">data-layer="{label}"</text>
    </g>
  );
}

function VisualBlock({ x, y, w, h, role, primary, accent, ink }: { x: number; y: number; w: number; h: number; role: string; primary: string; accent: string; ink: string }) {
  // Different mock visualizations based on role
  if (/Market|Chart/i.test(role)) {
    const bars = [0.45, 0.6, 0.55, 0.78, 0.92];
    const bw = (w - 80) / bars.length - 24;
    return (
      <g>
        {bars.map((v, i) => (
          <rect
            key={i}
            x={x + 40 + i * (bw + 24)}
            y={y + h - h * v}
            width={bw}
            height={h * v - 40}
            fill={i === bars.length - 1 ? accent : primary}
            opacity={i === bars.length - 1 ? 1 : 0.8}
          />
        ))}
        <line x1={x + 20} y1={y + h - 40} x2={x + w - 20} y2={y + h - 40} stroke={ink} strokeOpacity={0.4} />
      </g>
    );
  }
  if (/Problem|Differentiator|Solution/i.test(role)) {
    const cols = 2, rows = 2;
    const gap = 24;
    const cw = (w - gap) / cols, ch = (h - gap) / rows;
    return (
      <g>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const cx = x + (i % cols) * (cw + gap);
          const cy = y + Math.floor(i / cols) * (ch + gap);
          return (
            <g key={i}>
              <rect x={cx} y={cy} width={cw} height={ch} fill="none" stroke={ink} strokeOpacity={0.25} />
              <rect x={cx} y={cy} width={6} height={ch} fill={i === 0 ? accent : primary} />
              <text x={cx + 32} y={cy + 60} fontSize={28} fill={ink} fontFamily="ui-sans-serif" opacity={0.9}>
                포인트 {i + 1}
              </text>
            </g>
          );
        })}
      </g>
    );
  }
  if (/Business|Roadmap|Timeline/i.test(role)) {
    return (
      <g>
        <line x1={x + 40} y1={y + h / 2} x2={x + w - 40} y2={y + h / 2} stroke={ink} strokeOpacity={0.3} strokeWidth={2} />
        {[0, 1, 2, 3].map((i) => {
          const cx = x + 60 + i * ((w - 120) / 3);
          return (
            <g key={i}>
              <circle cx={cx} cy={y + h / 2} r={14} fill={i === 1 ? accent : primary} />
              <text x={cx} y={y + h / 2 + 60} textAnchor="middle" fontSize={22} fill={ink} opacity={0.7} fontFamily="ui-sans-serif">
                Q{i + 1}
              </text>
            </g>
          );
        })}
      </g>
    );
  }
  // Title / closing — clean hero mark
  return (
    <g>
      <rect x={x + w - 360} y={y + h - 240} width={320} height={200} fill={primary} opacity={0.95} />
      <rect x={x + w - 380} y={y + h - 220} width={20} height={200} fill={accent} />
    </g>
  );
}
