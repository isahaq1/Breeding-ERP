// Lightweight dependency-free SVG charts.

export function BarChart({
  data,
  height = 180,
  color = "var(--color-brand-500)",
  valueFormat = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueFormat?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => {
        const h = (d.value / max) * (height - 28);
        return (
          <div key={d.label} className="group flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted opacity-0 transition group-hover:opacity-100">
              {valueFormat(d.value)}
            </span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{ height: Math.max(h, 2), background: color }}
              title={`${d.label}: ${valueFormat(d.value)}`}
            />
            <span className="text-[10px] text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function LineChart({
  data,
  height = 200,
  color = "var(--color-brand-600)",
  valueFormat = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueFormat?: (n: number) => string;
}) {
  const w = 600;
  const padX = 8;
  const padY = 16;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const stepX = (w - padX * 2) / (data.length - 1);
  const y = (v: number) => padY + (1 - (v - min) / range) * (height - padY * 2);
  const points = data.map((d, i) => [padX + i * stepX, y(d.value)] as const);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${path} L${points[points.length - 1][0]},${height - padY} L${padX},${height - padY} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lineFill)" />
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-muted">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-muted">
        Range {valueFormat(min)} – {valueFormat(max)}
      </p>
    </div>
  );
}

export function Donut({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d) => {
            const frac = d.value / total;
            const dash = frac * c;
            const seg = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={16}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-ink text-lg font-bold"
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-muted">{d.label}</span>
            <span className="ml-auto font-semibold text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
