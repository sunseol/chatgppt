import { FONT_POLICY } from "@/lib/font-policy";

type VisualBaseProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly primary: string;
  readonly accent: string;
  readonly ink: string;
};

type HeroVisualProps = Omit<VisualBaseProps, "ink">;

export function LayerBox({
  x,
  y,
  w,
  h,
  label,
  accent,
}: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly accent: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={accent} strokeWidth={2} />
      <rect x={x} y={y - 28} width={label.length * 14 + 24} height={28} fill={accent} />
      <text x={x + 12} y={y - 8} fontSize={18} fill="#1A1B26" fontFamily={FONT_POLICY.monoFamily}>
        data-layer="{label}"
      </text>
    </g>
  );
}

export function VisualBlock({
  x,
  y,
  w,
  h,
  role,
  primary,
  accent,
  ink,
}: VisualBaseProps & {
  readonly role: string;
}) {
  if (/Market|Chart/i.test(role)) {
    return <MarketVisual x={x} y={y} w={w} h={h} primary={primary} accent={accent} ink={ink} />;
  }
  if (/Problem|Differentiator|Solution/i.test(role)) {
    return <CardGridVisual x={x} y={y} w={w} h={h} primary={primary} accent={accent} ink={ink} />;
  }
  if (/Business|Roadmap|Timeline/i.test(role)) {
    return <TimelineVisual x={x} y={y} w={w} h={h} primary={primary} accent={accent} ink={ink} />;
  }
  return <HeroVisual x={x} y={y} w={w} h={h} primary={primary} accent={accent} />;
}

function MarketVisual(props: VisualBaseProps) {
  const bars = [0.45, 0.6, 0.55, 0.78, 0.92];
  const barWidth = (props.w - 80) / bars.length - 24;
  return (
    <g>
      {bars.map((value, index) => (
        <rect
          key={index}
          x={props.x + 40 + index * (barWidth + 24)}
          y={props.y + props.h - props.h * value}
          width={barWidth}
          height={props.h * value - 40}
          fill={index === bars.length - 1 ? props.accent : props.primary}
          opacity={index === bars.length - 1 ? 1 : 0.8}
        />
      ))}
      <line
        x1={props.x + 20}
        y1={props.y + props.h - 40}
        x2={props.x + props.w - 20}
        y2={props.y + props.h - 40}
        stroke={props.ink}
        strokeOpacity={0.4}
      />
    </g>
  );
}

function CardGridVisual(props: VisualBaseProps) {
  const cols = 2;
  const rows = 2;
  const gap = 24;
  const cellWidth = (props.w - gap) / cols;
  const cellHeight = (props.h - gap) / rows;
  return (
    <g>
      {Array.from({ length: cols * rows }).map((_, index) => {
        const cellX = props.x + (index % cols) * (cellWidth + gap);
        const cellY = props.y + Math.floor(index / cols) * (cellHeight + gap);
        return (
          <g key={index}>
            <rect
              x={cellX}
              y={cellY}
              width={cellWidth}
              height={cellHeight}
              fill="none"
              stroke={props.ink}
              strokeOpacity={0.25}
            />
            <rect
              x={cellX}
              y={cellY}
              width={6}
              height={cellHeight}
              fill={index === 0 ? props.accent : props.primary}
            />
            <text
              x={cellX + 32}
              y={cellY + 60}
              fontSize={28}
              fill={props.ink}
              fontFamily={FONT_POLICY.sansFamily}
              opacity={0.9}
            >
              포인트 {index + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function TimelineVisual(props: VisualBaseProps) {
  return (
    <g>
      <line
        x1={props.x + 40}
        y1={props.y + props.h / 2}
        x2={props.x + props.w - 40}
        y2={props.y + props.h / 2}
        stroke={props.ink}
        strokeOpacity={0.3}
        strokeWidth={2}
      />
      {[0, 1, 2, 3].map((index) => {
        const circleX = props.x + 60 + index * ((props.w - 120) / 3);
        return (
          <g key={index}>
            <circle
              cx={circleX}
              cy={props.y + props.h / 2}
              r={14}
              fill={index === 1 ? props.accent : props.primary}
            />
            <text
              x={circleX}
              y={props.y + props.h / 2 + 60}
              textAnchor="middle"
              fontSize={22}
              fill={props.ink}
              opacity={0.7}
              fontFamily={FONT_POLICY.sansFamily}
            >
              Q{index + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function HeroVisual(props: HeroVisualProps) {
  return (
    <g>
      <rect
        x={props.x + props.w - 360}
        y={props.y + props.h - 240}
        width={320}
        height={200}
        fill={props.primary}
        opacity={0.95}
      />
      <rect
        x={props.x + props.w - 380}
        y={props.y + props.h - 220}
        width={20}
        height={200}
        fill={props.accent}
      />
    </g>
  );
}
