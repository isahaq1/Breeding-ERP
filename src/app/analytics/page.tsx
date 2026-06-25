"use client";

import { useMemo } from "react";
import { PageHeader, StatCard, Card, CardHeader, Badge, StatusBadge } from "@/components/ui";
import { LineChart, BarChart, Donut } from "@/components/charts";
import {
  milkYield,
  monthlyBirths,
  breedDistribution,
  muzzlePrints,
} from "@/lib/data";
import { number, currency } from "@/lib/format";
import { useData } from "@/lib/store";

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
  const {
    breedingRecords,
    birthRecords,
    cattle,
    inseminationEvents,
    semenOrders,
    semenCatalog,
    semenBatches,
    agentStrawIssues,
    saleAgents,
  } = useData();

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

  // ── Section A: AI Semen Programme ──────────────────────────────────────────

  const bullBarData = useMemo(() => {
    const map: Record<string, { services: number; pregnancies: number; bullName: string }> = {};
    for (const ev of inseminationEvents) {
      const entry = map[ev.semenCatalogId] ?? { services: 0, pregnancies: 0, bullName: "" };
      entry.services += 1;
      if (ev.result === "Pregnant") entry.pregnancies += 1;
      if (!entry.bullName) {
        const cat = semenCatalog.find((c) => c.id === ev.semenCatalogId);
        entry.bullName = cat?.bullName ?? ev.semenCatalogId;
      }
      map[ev.semenCatalogId] = entry;
    }
    return Object.values(map)
      .filter((e) => e.services > 0)
      .map((e) => ({
        label: e.bullName.slice(0, 8),
        value: Math.round((e.pregnancies / e.services) * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [inseminationEvents, semenCatalog]);

  const aiOutcomeDonut = useMemo(() => {
    const counts: Record<string, number> = {
      Pregnant: 0,
      Open: 0,
      "Pending PD": 0,
      "Repeat Service": 0,
      Aborted: 0,
    };
    for (const ev of inseminationEvents) {
      if (ev.result in counts) counts[ev.result] += 1;
    }
    const colorMap: Record<string, string> = {
      Pregnant: "#16a34a",
      Open: "#ef4444",
      "Pending PD": "#f59e0b",
      "Repeat Service": "#a855f7",
      Aborted: "#9ca3af",
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value, color: colorMap[label] }));
  }, [inseminationEvents]);

  // ── Section B: Semen Revenue & Financial KPIs ─────────────────────────────

  const semenFinancials = useMemo(() => {
    const totalRevenue = semenOrders.reduce((s, o) => s + o.totalAmountUsd, 0);
    const collected = semenOrders
      .filter((o) => o.paymentStatus === "Paid")
      .reduce((s, o) => s + o.totalAmountUsd, 0);
    const outstanding = semenOrders
      .filter((o) => o.paymentStatus === "Unpaid" || o.paymentStatus === "Partial")
      .reduce((s, o) => s + o.totalAmountUsd, 0);
    const avgOrder = semenOrders.length > 0 ? totalRevenue / semenOrders.length : 0;
    return { totalRevenue, collected, outstanding, avgOrder };
  }, [semenOrders]);

  const revenueByMonth = useMemo(() => {
    const monthMap: Record<string, number> = {};
    for (const o of semenOrders) {
      const month = o.orderDate.slice(0, 7); // "2026-01"
      monthMap[month] = (monthMap[month] ?? 0) + o.totalAmountUsd;
    }
    const sorted = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b));
    const last6 = sorted.slice(-6);
    return last6.map(([month, value]) => ({
      label: month.slice(5), // "01"
      value,
    }));
  }, [semenOrders]);

  // ── Section C: Semen Production Efficiency ────────────────────────────────

  const batchYieldData = useMemo(() => {
    return [...semenBatches]
      .sort((a, b) => a.processingDate.localeCompare(b.processingDate))
      .slice(-5);
  }, [semenBatches]);

  const agentUtilisation = useMemo(() => {
    const map: Record<string, { issued: number; used: number; name: string }> = {};
    for (const issue of agentStrawIssues) {
      const entry = map[issue.agentId] ?? { issued: 0, used: 0, name: "" };
      entry.issued += issue.quantityIssued;
      entry.used += issue.quantityUsed;
      if (!entry.name) {
        const agent = saleAgents.find((a) => a.id === issue.agentId);
        entry.name = agent ? `${agent.firstName} ${agent.lastName}`.slice(0, 10) : issue.agentId;
      }
      map[issue.agentId] = entry;
    }
    return Object.values(map)
      .filter((e) => e.issued > 0)
      .map((e) => ({
        label: e.name,
        value: Math.round((e.used / e.issued) * 100),
      }));
  }, [agentStrawIssues, saleAgents]);

  // ── Section D: Herd Fertility Summary ─────────────────────────────────────

  const ownBreedingMethodDonut = useMemo(() => {
    const natural = breedingRecords.filter((b) => b.method === "Natural").length;
    const ai = breedingRecords.filter((b) => b.method === "Artificial Insemination").length;
    const et = breedingRecords.filter((b) => b.method === "Embryo Transfer").length;
    return [
      { label: "Natural", value: natural, color: "#16a34a" },
      { label: "AI", value: ai, color: "#22c55e" },
      { label: "ET", value: et, color: "#86efac" },
    ].filter((d) => d.value > 0);
  }, [breedingRecords]);

  const calvingEaseData = useMemo(() => {
    const ease: Record<string, number> = { Easy: 0, Assisted: 0, Difficult: 0, "C-Section": 0 };
    for (const b of birthRecords) {
      if (b.calvingEase in ease) ease[b.calvingEase] += 1;
    }
    return Object.entries(ease).map(([label, value]) => ({ label, value }));
  }, [birthRecords]);

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

      {/* ── Section A: AI Semen Programme ── */}
      <div className="mt-8">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted/70">AI Semen Programme</p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Bull Conception Rate Bar Chart */}
          <Card>
            <CardHeader title="Conception Rate by Bull" />
            <div className="px-5 pb-5 pt-2">
              {bullBarData.length > 0 ? (
                <BarChart
                  data={bullBarData}
                  color="#16a34a"
                  valueFormat={(n) => `${n}%`}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted">No insemination data available.</p>
              )}
            </div>
          </Card>

          {/* AI Result Distribution */}
          <Card>
            <CardHeader title="AI Service Outcome Distribution" />
            <div className="px-5 pb-5 pt-2 flex justify-center">
              {aiOutcomeDonut.length > 0 ? (
                <Donut data={aiOutcomeDonut} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">No outcome data available.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Section B: Semen Programme Financial ── */}
      <div className="mt-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted/70">Semen Programme — Financial</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Order Revenue"
            value={currency(semenFinancials.totalRevenue)}
            delta={0}
            sublabel="all orders"
            iconName="analytics"
            tone="green"
          />
          <StatCard
            label="Revenue Collected"
            value={currency(semenFinancials.collected)}
            delta={0}
            sublabel="paid orders"
            iconName="heart"
            tone="blue"
          />
          <StatCard
            label="Outstanding"
            value={currency(semenFinancials.outstanding)}
            delta={0}
            sublabel="unpaid / partial"
            iconName="report"
            tone="purple"
          />
          <StatCard
            label="Avg Order Value"
            value={currency(semenFinancials.avgOrder)}
            delta={0}
            sublabel={`across ${semenOrders.length} orders`}
            iconName="feed"
            tone="green"
          />
        </div>
        {revenueByMonth.length > 0 && (
          <Card className="mt-4">
            <CardHeader title="Revenue by Month (USD)" />
            <div className="p-5">
              <BarChart
                data={revenueByMonth}
                color="#16a34a"
                valueFormat={(n) => currency(n)}
              />
            </div>
          </Card>
        )}
      </div>

      {/* ── Section C: Semen Production Efficiency ── */}
      <div className="mt-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted/70">Laboratory — Production Efficiency</p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Batch yield: accepted vs rejected straws per batch */}
          <Card>
            <CardHeader title="Batch Straw Yield (Accepted vs Rejected)" />
            <div className="px-5 pb-5 pt-2">
              {batchYieldData.length > 0 ? (
                <div className="space-y-3">
                  {batchYieldData.map((batch) => {
                    const total = batch.totalStrawsFilled || 1;
                    const acceptedPct = Math.round((batch.strawsAccepted / total) * 100);
                    const rejectedPct = Math.round((batch.strawsRejected / total) * 100);
                    return (
                      <div key={batch.id}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-ink">{batch.batchNo}</span>
                          <span className="text-muted">{batch.strawsAccepted} accepted / {batch.strawsRejected} rejected</span>
                        </div>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-canvas">
                          <div className="h-full bg-brand-500" style={{ width: `${acceptedPct}%` }} />
                          <div className="h-full bg-red-400" style={{ width: `${rejectedPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-brand-500" />Accepted</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-400" />Rejected</span>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted">No batch data available.</p>
              )}
            </div>
          </Card>

          {/* Agent straw utilisation */}
          <Card>
            <CardHeader title="Agent Straw Utilisation (%)" />
            <div className="px-5 pb-5 pt-2">
              {agentUtilisation.length > 0 ? (
                <BarChart
                  data={agentUtilisation}
                  color="#22c55e"
                  valueFormat={(n) => `${n}%`}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted">No agent straw data available.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Section D: Herd Fertility Summary ── */}
      <div className="mt-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted/70">Herd Fertility</p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Own herd breeding method donut */}
          <Card>
            <CardHeader title="Own Herd — Breeding Method" />
            <div className="p-5 flex justify-center">
              {ownBreedingMethodDonut.length > 0 ? (
                <Donut data={ownBreedingMethodDonut} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">No breeding records available.</p>
              )}
            </div>
          </Card>

          {/* Calving ease distribution */}
          <Card>
            <CardHeader title="Calving Ease Distribution" />
            <div className="p-5">
              {calvingEaseData.some((d) => d.value > 0) ? (
                <BarChart
                  data={calvingEaseData}
                  color="#16a34a"
                  valueFormat={(n) => String(n)}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted">No birth records available.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
