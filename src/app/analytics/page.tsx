import { PageHeader, StatCard, Card, CardHeader, Badge, StatusBadge } from "@/components/ui";
import { LineChart, BarChart, Donut } from "@/components/charts";
import {
  milkYield,
  monthlyBirths,
  breedDistribution,
  breedingRecords,
  birthRecords,
  cattle,
  muzzlePrints,
} from "@/lib/data";
import { number } from "@/lib/format";

const donutColors = ["#16a34a", "#22c55e", "#86efac", "#bbf7d0"];

const QUALITY_COLOR: Record<string, string> = {
  High:   "bg-brand-500",
  Medium: "bg-amber-400",
  Low:    "bg-red-400",
};
const QUALITY_TONE: Record<string, "green" | "amber" | "red"> = {
  High: "green", Medium: "amber", Low: "red",
};
const METHOD_COLOR: Record<string, string> = {
  "Digital Scanner": "#16a34a",
  "Camera Scan":     "#22c55e",
  "Ink Pad":         "#86efac",
};

// Animals eligible for muzzle print (exclude calves + sold)
const ELIGIBLE_CLASSES = ["Cow", "Bull", "Heifer", "Steer"];

function MuzzleSVG({ printHash }: { printHash?: string }) {
  // Deterministic ridge offsets derived from printHash so each animal looks unique
  const seed = printHash
    ? printHash.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
    : 42;
  const r = (i: number, range: number, base: number) =>
    base + ((seed * (i + 3)) % range) - range / 2;

  return (
    <svg viewBox="0 0 200 162" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px]">
      {/* scan-grid background */}
      <defs>
        <pattern id={`grid-${seed}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0L0 0 0 10" fill="none" stroke="#dcfce7" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="162" rx="10" fill={`url(#grid-${seed})`} />

      {/* corner brackets */}
      {[
        "M12 12 h18 M12 12 v18",
        "M188 12 h-18 M188 12 v18",
        "M12 150 h18 M12 150 v-18",
        "M188 150 h-18 M188 150 v-18",
      ].map((d, i) => (
        <path key={i} d={d} stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      ))}

      {/* outer muzzle ellipse */}
      <ellipse cx="100" cy="90" rx="74" ry="56" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />

      {/* left nostril */}
      <ellipse cx="72" cy="87" rx="19" ry="14" fill="white" stroke="#15803d" strokeWidth="1.5" />
      <ellipse cx="72" cy="89" rx="13" ry="9"  fill="#dcfce7" />

      {/* right nostril */}
      <ellipse cx="128" cy="87" rx="19" ry="14" fill="white" stroke="#15803d" strokeWidth="1.5" />
      <ellipse cx="128" cy="89" rx="13" ry="9"  fill="#dcfce7" />

      {/* ridge lines — left flank */}
      {[68, 77, 86, 95, 104].map((y, i) => (
        <path
          key={`lr${i}`}
          d={`M${28 + r(i, 6, 0)} ${y + r(i, 4, 0)} Q${42 + r(i, 5, 0)} ${y - 5 + r(i, 4, 0)} ${53 + r(i, 4, 0)} ${y + r(i, 3, 0)}`}
          stroke="#15803d" strokeWidth="1.1" fill="none" opacity="0.65"
        />
      ))}

      {/* ridge lines — right flank */}
      {[68, 77, 86, 95, 104].map((y, i) => (
        <path
          key={`rr${i}`}
          d={`M${147 + r(i + 5, 4, 0)} ${y + r(i + 5, 4, 0)} Q${158 + r(i + 5, 5, 0)} ${y - 5 + r(i + 5, 3, 0)} ${172 + r(i + 5, 4, 0)} ${y + r(i + 5, 3, 0)}`}
          stroke="#15803d" strokeWidth="1.1" fill="none" opacity="0.65"
        />
      ))}

      {/* ridge lines — bottom chin */}
      {[116, 126, 135].map((y, i) => (
        <path
          key={`br${i}`}
          d={`M${58 + r(i + 10, 4, 0)} ${y} Q100 ${y + 8 + r(i + 10, 5, 0)} ${142 + r(i + 10, 4, 0)} ${y}`}
          stroke="#15803d" strokeWidth="1.1" fill="none" opacity="0.65"
        />
      ))}

      {/* ridge lines — between nostrils */}
      {[84, 91].map((y, i) => (
        <path
          key={`mr${i}`}
          d={`M${91 + r(i + 15, 3, 0)} ${y} Q100 ${y - 4} ${109 + r(i + 15, 3, 0)} ${y}`}
          stroke="#15803d" strokeWidth="0.9" fill="none" opacity="0.6"
        />
      ))}

      {/* biometric dots */}
      {[
        [38, 74], [32, 86], [39, 100], [162, 74], [168, 86], [161, 100], [100, 72],
      ].map(([cx, cy], i) => (
        <circle key={`dot${i}`} cx={cx + r(i + 20, 4, 0)} cy={cy} r="2.2" fill="#15803d" opacity="0.6" />
      ))}

      {/* scan line */}
      <line x1="12" y1="90" x2="188" y2="90" stroke="#4ade80" strokeWidth="0.8" opacity="0.45" strokeDasharray="4 4" />

      {/* hash label */}
      {printHash && (
        <text x="100" y="154" textAnchor="middle" fontSize="8.5" fill="#15803d" fontFamily="monospace" letterSpacing="0.5">
          {printHash}
        </text>
      )}
    </svg>
  );
}

export default function AnalyticsPage() {
  const confirmed = breedingRecords.filter((b) => b.result === "Confirmed Pregnant").length;
  const conception = Math.round((confirmed / breedingRecords.length) * 100);
  const liveBirths = birthRecords.filter((b) => b.outcome === "Live").length;
  const calvingSuccess = Math.round((liveBirths / birthRecords.length) * 100);
  const avgBirthWeight = (
    birthRecords.reduce((s, b) => s + b.birthWeightKg, 0) / birthRecords.length
  ).toFixed(1);

  // Muzzle print analytics
  const eligible   = cattle.filter((c) => ELIGIBLE_CLASSES.includes(c.class) && c.status !== "Sold");
  const registered = muzzlePrints.length;
  const coverage   = Math.round((registered / eligible.length) * 100);
  const unregistered = eligible.filter((c) => !muzzlePrints.find((p) => p.cattleId === c.id));

  const highQ   = muzzlePrints.filter((p) => p.quality === "High").length;
  const medQ    = muzzlePrints.filter((p) => p.quality === "Medium").length;
  const lowQ    = muzzlePrints.filter((p) => p.quality === "Low").length;

  const methodCounts = ["Digital Scanner", "Camera Scan", "Ink Pad"].map((m) => ({
    method: m,
    count: muzzlePrints.filter((p) => p.method === m).length,
  }));

  const recentPrints = [...muzzlePrints]
    .sort((a, b) => b.capturedDate.localeCompare(a.capturedDate))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Production, reproduction and herd performance trends."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conception Rate"  value={`${conception}%`}       delta={6} sublabel="last 12 mo"   iconName="heart"     tone="blue"   />
        <StatCard label="Calving Success"  value={`${calvingSuccess}%`}   delta={3} sublabel="live births"  iconName="baby"      tone="green"  />
        <StatCard label="Avg Birth Weight" value={`${avgBirthWeight} kg`} delta={1} sublabel="per calf"     iconName="analytics" tone="purple" />
        <StatCard label="Milk (June)"      value={`${number(milkYield[milkYield.length - 1].liters)} L`} delta={9} sublabel="monthly total" iconName="feed" tone="green" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Milk Yield Trend (Liters / month)" />
          <div className="p-5">
            <LineChart
              data={milkYield.map((m) => ({ label: m.month, value: m.liters }))}
              valueFormat={(n) => `${number(n)} L`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Herd Composition" />
          <div className="grid place-items-center p-5">
            <Donut
              data={breedDistribution.map((b, i) => ({
                label: b.breed,
                value: b.count,
                color: donutColors[i % donutColors.length],
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Births per Month" />
          <div className="p-5">
            <BarChart
              data={monthlyBirths.map((m) => ({ label: m.month, value: m.count }))}
              color="var(--color-brand-600)"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Breeding Method Mix" />
          <div className="p-5">
            <BarChart
              data={["Natural", "Artificial Insemination", "Embryo Transfer"].map((m) => ({
                label: m === "Artificial Insemination" ? "AI" : m === "Embryo Transfer" ? "ET" : "Natural",
                value: breedingRecords.filter((b) => b.method === m).length,
              }))}
              color="#22c55e"
            />
          </div>
        </Card>
      </div>

      {/* ── Muzzle Print Biometrics ── */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Muzzle Print Biometrics</p>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* stat row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Coverage"       value={`${coverage}%`}    delta={0}  sublabel={`${registered} of ${eligible.length} eligible`} iconName="analytics" tone="green"  />
          <StatCard label="High Quality"   value={String(highQ)}     delta={0}  sublabel="sharp prints"     iconName="heart"     tone="green"  />
          <StatCard label="Needs Recapture" value={String(lowQ)}     delta={0}  sublabel="low quality"      iconName="report"    tone="blue"   />
          <StatCard label="Unregistered"   value={String(unregistered.length)} delta={0} sublabel="pending enrollment" iconName="cow" tone="purple" />
        </div>

        {/* main cards row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* visual + coverage */}
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold text-ink">Latest Registered Print</p>
            <div className="flex justify-center">
              <MuzzleSVG printHash={recentPrints[0]?.printHash} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Biometric Coverage</span>
                <span className="font-semibold text-ink">{coverage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${coverage}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted">
                <span>{registered} registered</span>
                <span>{unregistered.length} unregistered</span>
              </div>
            </div>
          </Card>

          {/* quality + method breakdown */}
          <Card className="p-5">
            <p className="mb-4 text-sm font-semibold text-ink">Quality Distribution</p>
            <div className="space-y-3">
              {[
                { label: "High",   count: highQ,   bar: QUALITY_COLOR.High },
                { label: "Medium", count: medQ,     bar: QUALITY_COLOR.Medium },
                { label: "Low",    count: lowQ,     bar: QUALITY_COLOR.Low },
              ].map(({ label, count, bar }) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">{label}</span>
                    <span className="font-semibold text-ink">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                    <div
                      className={`h-full rounded-full ${bar}`}
                      style={{ width: `${Math.round((count / registered) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mb-3 mt-6 text-sm font-semibold text-ink">Capture Method</p>
            <div className="space-y-3">
              {methodCounts.map(({ method, count }) => (
                <div key={method}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">{method}</span>
                    <span className="font-semibold text-ink">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((count / registered) * 100)}%`,
                        backgroundColor: METHOD_COLOR[method],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* unregistered animals */}
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold text-ink">Pending Enrollment</p>
            {unregistered.length === 0 ? (
              <p className="text-sm text-muted">All eligible animals are registered.</p>
            ) : (
              <ul className="space-y-2">
                {unregistered.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-ink">{c.name}</p>
                      <p className="text-[11px] text-muted">{c.id} · {c.class}</p>
                    </div>
                    <StatusBadge status={c.health} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

        </div>

        {/* full registry table */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader title="Muzzle Print Registry" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Print ID</th>
                  <th className="px-5 py-3">Animal</th>
                  <th className="px-5 py-3">Hash</th>
                  <th className="px-5 py-3">Quality</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Captured By</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {muzzlePrints
                  .sort((a, b) => b.capturedDate.localeCompare(a.capturedDate))
                  .map((p) => {
                    const animal = cattle.find((c) => c.id === p.cattleId);
                    return (
                      <tr key={p.id} className="transition hover:bg-canvas/60">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{p.id}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink">{animal?.name ?? "—"}</p>
                          <p className="text-[11px] text-muted">{p.cattleId}</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-muted">{p.printHash}</td>
                        <td className="px-5 py-3">
                          <Badge tone={QUALITY_TONE[p.quality]}>{p.quality}</Badge>
                        </td>
                        <td className="px-5 py-3 text-muted">{p.method}</td>
                        <td className="px-5 py-3 text-muted">{p.capturedBy}</td>
                        <td className="px-5 py-3 text-muted">{p.capturedDate}</td>
                        <td className="px-5 py-3">
                          <div className="w-12">
                            <MuzzleSVG printHash={p.printHash} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
