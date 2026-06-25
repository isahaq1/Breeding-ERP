"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  PageHeader, StatCard, Card, CardHeader, Badge, StatusBadge,
  Table, Th, Td, EmptyRow, PrimaryButton,
} from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import { monthlyBirths } from "@/lib/data";
import { formatDate, daysUntil, number, currency } from "@/lib/format";

// ── Quick-action button ───────────────────────────────────────────────────────
function QAction({ label, icon, href, tone = "default" }: {
  label: string; icon: keyof typeof Icon; href: string; tone?: "default" | "brand";
}) {
  const IconCmp = Icon[icon];
  return (
    <Link href={href}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition
        ${tone === "brand"
          ? "border-brand-500 bg-brand-600 text-white hover:bg-brand-700"
          : "border-line bg-surface text-ink hover:bg-canvas hover:text-brand-700"
        }`}>
      <IconCmp width={15} height={15} />{label}
    </Link>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted/70">{children}</p>;
}

// ── Mini KPI pill ─────────────────────────────────────────────────────────────
function KPill({ label, value, tone = "gray" }: {
  label: string; value: string; tone?: "green" | "blue" | "amber" | "red" | "purple" | "gray";
}) {
  const tones = {
    green:  "bg-green-50  text-green-800  border-green-200",
    blue:   "bg-blue-50   text-blue-800   border-blue-200",
    amber:  "bg-amber-50  text-amber-800  border-amber-200",
    red:    "bg-red-50    text-red-800    border-red-200",
    purple: "bg-purple-50 text-purple-800 border-purple-200",
    gray:   "bg-gray-50   text-gray-700   border-gray-200",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium opacity-80">{label}</p>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = "#16a34a" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const router = useRouter();
  const {
    cattle, breedingRecords, birthRecords, vaccinations, healthRecords,
    semenCatalog, semenOrders, semenCollections, semenBirths,
    saleAgents, farmers, farms, heatDetectionAlerts, collarReadings,
    transactions, hierarchyNodes, territoryManagers,
    bullRegistrations, cattleLabel,
    farmerCattle, inseminationEvents, pregnancyDiagnoses,
    distributionPoints, agentStrawIssues, farmerCalfBirths,
    incentiveSettlements,
  } = useData();

  // ── Herd ────────────────────────────────────────────────────────────────
  const activeHerd = useMemo(() => cattle.filter(c => c.status !== "Sold" && c.status !== "Deceased"), [cattle]);
  const pregnant    = useMemo(() => cattle.filter(c => c.status === "Pregnant").length, [cattle]);
  const calves      = useMemo(() => cattle.filter(c => c.status === "Calf").length, [cattle]);
  const activeBulls = useMemo(() => cattle.filter(c => c.class === "Bull" && c.status !== "Sold" && c.status !== "Deceased"), [cattle]);

  // ── Health ───────────────────────────────────────────────────────────────
  const overdueVaxList = useMemo(() => vaccinations.filter(v => v.status === "Overdue"), [vaccinations]);
  const dueVaxList     = useMemo(() => vaccinations.filter(v => v.status === "Due"),     [vaccinations]);
  const healthAlerts   = overdueVaxList.length + dueVaxList.length;
  const ongoingHealth  = useMemo(() => healthRecords.filter(h => h.status === "Ongoing"), [healthRecords]);

  // ── Semen programme ───────────────────────────────────────────────────────
  const availableLots  = useMemo(() => semenCatalog.filter(c => c.status === "Available" || c.status === "Low Stock"), [semenCatalog]);
  const totalStraws    = useMemo(() => availableLots.reduce((s, c) => s + c.initialStraws, 0), [availableLots]);
  const pendingOrders  = useMemo(() => semenOrders.filter(o => o.status === "Pending" || o.status === "Approved"), [semenOrders]);
  const deliveredOrders= useMemo(() => semenOrders.filter(o => o.status === "Delivered"), [semenOrders]);
  const aiBirthsLive   = useMemo(() => semenBirths.filter(b => b.status === "Live Birth").length, [semenBirths]);
  const aiPregnant     = useMemo(() => semenBirths.filter(b => b.status === "Pregnant").length,   [semenBirths]);
  const conceptionRate = semenBirths.length > 0
    ? Math.round(((aiBirthsLive + aiPregnant) / semenBirths.length) * 100) : 0;
  const activeAgents   = useMemo(() => saleAgents.filter(a => a.isActive).length, [saleAgents]);

  // ── Finance ──────────────────────────────────────────────────────────────
  const totalOrderValue    = useMemo(() => semenOrders.reduce((s, o) => s + o.totalAmountUsd, 0), [semenOrders]);
  const paidOrderValue     = useMemo(() => semenOrders.filter(o => o.paymentStatus === "Paid").reduce((s, o) => s + o.totalAmountUsd, 0), [semenOrders]);
  const outstandingValue   = useMemo(() => semenOrders.filter(o => o.paymentStatus !== "Paid" && o.status !== "Cancelled").reduce((s, o) => s + o.totalAmountUsd, 0), [semenOrders]);
  const recentTransactions = useMemo(() => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [transactions]);

  // ── IoT ──────────────────────────────────────────────────────────────────
  const onlineCollars  = useMemo(() => collarReadings.filter(r => r.isOnline).length,          [collarReadings]);
  const lowBattery     = useMemo(() => collarReadings.filter(r => r.batteryPct < 20).length,   [collarReadings]);
  const highTempAlerts = useMemo(() => collarReadings.filter(r => r.temperature > 39.5).length,[collarReadings]);

  // ── Heat detection ────────────────────────────────────────────────────────
  const activeHeat  = useMemo(() => heatDetectionAlerts.filter(h => h.status === "Active").length,   [heatDetectionAlerts]);
  const confirmedHeat= useMemo(() => heatDetectionAlerts.filter(h => h.status === "Confirmed").length,[heatDetectionAlerts]);

  // ── Distribution ─────────────────────────────────────────────────────────
  const activeNodes = useMemo(() => hierarchyNodes.filter(n => n.status === "Active").length, [hierarchyNodes]);
  const activeDPs   = useMemo(() => distributionPoints.filter(d => d.status === "Active").length, [distributionPoints]);
  const lowNitrogenDPs = useMemo(() => distributionPoints.filter(d => d.currentNitrogenLiters / Math.max(d.nitrogenCapacityLiters, 1) < 0.3).length, [distributionPoints]);

  // ── AI Programme (insemination-based) ────────────────────────────────────
  const totalInseminations = inseminationEvents.length;
  const pendingPD   = useMemo(() => inseminationEvents.filter(e => e.result === "Pending PD").length,  [inseminationEvents]);
  const aiPregnantFC= useMemo(() => inseminationEvents.filter(e => e.result === "Pregnant").length,     [inseminationEvents]);
  const openAI      = useMemo(() => inseminationEvents.filter(e => e.result === "Open").length,          [inseminationEvents]);
  const aiConceptionRate = totalInseminations > 0
    ? Math.round((aiPregnantFC / totalInseminations) * 100) : 0;
  const farmerCalfBirthsLive = useMemo(() => farmerCalfBirths.filter(b => b.outcome === "Live Birth").length, [farmerCalfBirths]);
  const totalStrawsIssued = useMemo(() => agentStrawIssues.reduce((s, i) => s + i.quantityIssued, 0), [agentStrawIssues]);
  const totalStrawsUsed   = useMemo(() => agentStrawIssues.reduce((s, i) => s + i.quantityUsed,   0), [agentStrawIssues]);

  // ── Recent insemination events ────────────────────────────────────────────
  const recentInseminations = useMemo(() =>
    [...inseminationEvents].sort((a, b) => b.inseminationDate.localeCompare(a.inseminationDate)).slice(0, 5),
    [inseminationEvents]);

  // ── Settlement summary ────────────────────────────────────────────────────
  const pendingSettlements = useMemo(() => incentiveSettlements.filter(s => s.status === "Draft" || s.status === "Approved").length, [incentiveSettlements]);

  // ── Smart alerts ──────────────────────────────────────────────────────────
  const overdueCalvings = useMemo(() =>
    breedingRecords.filter(b => b.result === "Confirmed Pregnant" && daysUntil(b.expectedCalving) < 0).length,
    [breedingRecords]);
  const imminent = useMemo(() =>
    breedingRecords.filter(b => b.result === "Confirmed Pregnant" && daysUntil(b.expectedCalving) >= 0 && daysUntil(b.expectedCalving) <= 7).length,
    [breedingRecords]);

  // ── Activity feeds ────────────────────────────────────────────────────────
  const upcomingCalvings = useMemo(() =>
    [...breedingRecords]
      .filter(b => b.result === "Confirmed Pregnant")
      .sort((a, b) => daysUntil(a.expectedCalving) - daysUntil(b.expectedCalving))
      .slice(0, 6),
    [breedingRecords]);

  const recentOrders = useMemo(() =>
    [...semenOrders].sort((a, b) => (b.orderDate ?? "").localeCompare(a.orderDate ?? "")).slice(0, 6),
    [semenOrders]);

  const recentBirths = useMemo(() =>
    [...birthRecords].sort((a, b) => b.birthDate.localeCompare(a.birthDate)).slice(0, 5),
    [birthRecords]);

  const recentHeat = useMemo(() =>
    [...heatDetectionAlerts].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).slice(0, 5),
    [heatDetectionAlerts]);

  // ── Charts ────────────────────────────────────────────────────────────────
  const breedingMethodData = useMemo(() => [
    { label: "AI",      value: breedingRecords.filter(b => b.method === "Artificial Insemination").length, color: "#2563eb" },
    { label: "Natural", value: breedingRecords.filter(b => b.method === "Natural").length,                 color: "#16a34a" },
  ].filter(d => d.value > 0), [breedingRecords]);

  const aiStatusData = useMemo(() => [
    { label: "Live Birth", value: aiBirthsLive, color: "#16a34a" },
    { label: "Pregnant",   value: aiPregnant,   color: "#2563eb" },
    { label: "Open",       value: semenBirths.filter(b => b.status === "Open").length,      color: "#d97706" },
    { label: "Stillbirth", value: semenBirths.filter(b => b.status === "Stillbirth").length,color: "#dc2626" },
  ].filter(d => d.value > 0), [semenBirths, aiBirthsLive, aiPregnant]);

  // helpers
  function farmerName(id: string) { const f = farmers.find(x => x.id === id); return f ? `${f.firstName} ${f.lastName}` : "—"; }
  function catalogBull(id: string) { const c = semenCatalog.find(x => x.id === id); return c ? `${c.bullName}` : "—"; }

  const heatStatusTone = (s: string) => s === "Active" ? "red" : s === "Confirmed" ? "amber" : s === "Bred" ? "green" : "gray" as "red"|"amber"|"green"|"gray";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Greenfield Ranch · ${formatDate("2026-06-24")} · Complete herd, semen programme & distribution overview`}
        action={
          <PrimaryButton onClick={() => router.push("/cattle")}>
            <Icon.plus width={16} height={16} />Register Cattle
          </PrimaryButton>
        }
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <QAction label="New Order"       icon="report"     href="/semen-supply?tab=orders"      tone="brand"/>
        <QAction label="Record Birth"    icon="baby"       href="/births"/>
        <QAction label="Collect Semen"   icon="collection" href="/semen-supply?tab=collections"/>
        <QAction label="Distribution"    icon="network"    href="/distribution"/>
        <QAction label="IoT Monitor"     icon="wifi"       href="/iot-monitoring"/>
        <QAction label="Reports"         icon="report"     href="/reports"/>
      </div>

      {/* ── Smart Alert Banners ──────────────────────────────────────────── */}
      <div className="mt-4 space-y-2">
        {overdueCalvings > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Icon.heart width={16} height={16} className="shrink-0 text-red-600"/>
            <p className="flex-1 text-sm font-medium text-red-900">
              <strong>{overdueCalvings}</strong> overdue calving{overdueCalvings !== 1 ? "s" : ""} — confirmed-pregnant cows past expected date.
            </p>
            <Link href="/breeding" className="shrink-0 text-xs font-semibold text-red-700 hover:underline">Review →</Link>
          </div>
        )}
        {imminent > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Icon.baby width={16} height={16} className="shrink-0 text-amber-600"/>
            <p className="flex-1 text-sm font-medium text-amber-900">
              <strong>{imminent}</strong> calving{imminent !== 1 ? "s" : ""} due within the next 7 days.
            </p>
            <Link href="/breeding" className="shrink-0 text-xs font-semibold text-amber-700 hover:underline">View →</Link>
          </div>
        )}
        {overdueVaxList.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Icon.syringe width={16} height={16} className="shrink-0 text-amber-600"/>
            <p className="flex-1 text-sm font-medium text-amber-900">
              <strong>{overdueVaxList.length}</strong> overdue vaccination{overdueVaxList.length !== 1 ? "s" : ""} · <strong>{dueVaxList.length}</strong> due soon.
            </p>
            <Link href="/vaccinations" className="shrink-0 text-xs font-semibold text-amber-700 hover:underline">View →</Link>
          </div>
        )}
        {activeHeat > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <Icon.flame width={16} height={16} className="shrink-0 text-blue-600"/>
            <p className="flex-1 text-sm font-medium text-blue-900">
              <strong>{activeHeat}</strong> active heat alert{activeHeat !== 1 ? "s" : ""} — optimal 12–18 h insemination window.
            </p>
            <Link href="/heat-detection" className="shrink-0 text-xs font-semibold text-blue-700 hover:underline">Act now →</Link>
          </div>
        )}
        {highTempAlerts > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Icon.thermometer width={16} height={16} className="shrink-0 text-red-600"/>
            <p className="flex-1 text-sm font-medium text-red-900">
              <strong>{highTempAlerts}</strong> collar reading{highTempAlerts !== 1 ? "s" : ""} showing elevated temperature (&gt; 39.5 °C).
            </p>
            <Link href="/iot-monitoring" className="shrink-0 text-xs font-semibold text-red-700 hover:underline">Check →</Link>
          </div>
        )}
      </div>

      {/* ── KPI Row 1: Herd ──────────────────────────────────────────────── */}
      <div className="mt-5">
        <SectionLabel>Herd Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Active Herd"      value={number(activeHerd.length)}   iconName="cow"     tone="green"  delta={4}   sublabel="vs last month"/>
          <StatCard label="Pregnant Cows"    value={number(pregnant)}            iconName="heart"   tone="blue"   delta={12}  sublabel="confirmed"/>
          <StatCard label="Calves (< 1 yr)"  value={number(calves)}              iconName="baby"    tone="purple"/>
          <StatCard label="Bulls Active"     value={number(activeBulls.length)}  iconName="shield"  tone="blue"/>
          <StatCard label="Health Alerts"    value={number(healthAlerts)}        iconName="syringe" tone={healthAlerts > 0 ? "amber" : "green"}/>
          <StatCard label="Ongoing Treatment"value={number(ongoingHealth.length)}iconName="stethoscope" tone={ongoingHealth.length > 0 ? "amber" : "green"}/>
        </div>
      </div>

      {/* ── KPI Row 2: Semen Programme ────────────────────────────────────── */}
      <div className="mt-5">
        <SectionLabel>Semen Programme</SectionLabel>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Semen Lots (Stock)"  value={number(availableLots.length)}    iconName="vial"       tone="blue"   sublabel={`${number(totalStraws)} straws`}/>
          <StatCard label="Pending Orders"       value={number(pendingOrders.length)}    iconName="report"     tone={pendingOrders.length > 0 ? "amber" : "green"}/>
          <StatCard label="Orders Delivered"     value={number(deliveredOrders.length)}  iconName="download"   tone="green"/>
          <StatCard label="Field Agents (AI)"    value={number(activeAgents)}            iconName="agent"      tone="blue"/>
          <StatCard label="AI Births (Live)"     value={number(aiBirthsLive)}            iconName="dna"        tone="green"/>
          <StatCard label="Conception Rate"      value={`${conceptionRate}%`}            iconName="percent"    tone={conceptionRate >= 60 ? "green" : "amber"}/>
        </div>
      </div>

      {/* ── KPI Row 3: People & Finance ───────────────────────────────────── */}
      <div className="mt-5">
        <SectionLabel>Farmers, Finance & Distribution</SectionLabel>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Registered Farmers"   value={number(farmers.length)}           iconName="farmer"  tone="green"/>
          <StatCard label="Active Farms"          value={number(farms.filter(f => f.status === "Active").length)} iconName="farm" tone="green"/>
          <StatCard label="Territory Locations"   value={number(activeNodes)}              iconName="network" tone="blue"/>
          <StatCard label="Territory Managers"    value={number(territoryManagers.filter(m => m.isActive).length)} iconName="agent" tone="blue"/>
        </div>
      </div>

      {/* ── Finance mini pills ────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPill label="Total Order Value"    value={currency(totalOrderValue)}    tone="blue"/>
        <KPill label="Revenue Collected"    value={currency(paidOrderValue)}     tone="green"/>
        <KPill label="Outstanding Payments" value={currency(outstandingValue)}   tone={outstandingValue > 0 ? "amber" : "green"}/>
        <KPill label="Collections This Season" value={number(semenCollections.length)} tone="purple"/>
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Births — Last 12 Months"
            action={<span className="text-xs text-muted">{birthRecords.length} total records</span>}/>
          <div className="p-5">
            <BarChart data={monthlyBirths.map(m => ({ label: m.month, value: m.count }))} height={180}/>
          </div>
        </Card>
        <Card>
          <CardHeader title="Breeding Method Mix"/>
          <div className="flex items-center justify-center p-5">
            <Donut data={breedingMethodData} size={160}/>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="AI Programme Outcomes"
            action={<Link href="/semen-supply?tab=births" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}/>
          <div className="p-5">
            {aiStatusData.length > 0
              ? <Donut data={aiStatusData} size={160}/>
              : <p className="py-8 text-center text-sm text-muted">No AI birth records yet.</p>}
          </div>
          {/* AI KPIs */}
          <div className="grid grid-cols-3 gap-px border-t border-line bg-line">
            {[
              { label: "Total Inseminations", value: number(semenBirths.length) },
              { label: "Conception Rate",      value: `${conceptionRate}%` },
              { label: "Live AI Births",        value: number(aiBirthsLive) },
            ].map(k => (
              <div key={k.label} className="bg-surface px-4 py-3 text-center">
                <p className="text-base font-bold">{k.value}</p>
                <p className="text-[11px] text-muted">{k.label}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="IoT Collar Status"
            action={<Link href="/iot-monitoring" className="text-xs font-semibold text-brand-700 hover:underline">View →</Link>}/>
          <div className="divide-y divide-line">
            {[
              { label: "Online",          value: onlineCollars,             tone: "green",  max: collarReadings.length },
              { label: "Offline",         value: collarReadings.length - onlineCollars, tone: "gray", max: collarReadings.length },
              { label: "Low Battery",     value: lowBattery,                tone: "amber",  max: collarReadings.length },
              { label: "High Temp Alert", value: highTempAlerts,            tone: "red",    max: collarReadings.length },
            ].map(r => (
              <div key={r.label} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-ink">{r.label}</span>
                  <span className="font-mono text-sm font-semibold">{r.value}<span className="text-muted font-normal"> / {r.max}</span></span>
                </div>
                <ProgressBar pct={(r.value / Math.max(r.max, 1)) * 100}
                  color={r.tone === "green" ? "#16a34a" : r.tone === "amber" ? "#d97706" : r.tone === "red" ? "#dc2626" : "#9ca3af"}/>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-5 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Heat Detection (today)</span>
              <span className="font-semibold">{activeHeat} active · {confirmedHeat} confirmed</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Activity Grid ────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Calvings */}
        <Card>
          <CardHeader title="Upcoming Calvings"
            action={<Link href="/breeding" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}/>
          <Table>
            <thead><tr><Th>Dam</Th><Th>Expected</Th><Th>Countdown</Th><Th>Method</Th></tr></thead>
            <tbody>
              {upcomingCalvings.length === 0 && <EmptyRow colSpan={4} label="No confirmed pregnancies."/>}
              {upcomingCalvings.map(b => {
                const d = daysUntil(b.expectedCalving);
                return (
                  <tr key={b.id}>
                    <Td className="font-medium text-sm">{cattleLabel(b.damId)}</Td>
                    <Td className="text-sm">{formatDate(b.expectedCalving)}</Td>
                    <Td>
                      {d < 0
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Overdue {Math.abs(d)}d</span>
                        : d <= 7
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">in {d} days</span>
                          : <span className="text-xs text-muted">in {d} days</span>
                      }
                    </Td>
                    <Td className="text-xs text-muted">{b.method}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        {/* Recent Semen Orders */}
        <Card>
          <CardHeader title="Recent Semen Orders"
            action={<Link href="/semen-supply?tab=orders" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}/>
          <Table>
            <thead><tr><Th>Farmer</Th><Th>Bull</Th><Th>Qty</Th><Th>Status</Th><Th>Payment</Th></tr></thead>
            <tbody>
              {recentOrders.length === 0 && <EmptyRow colSpan={5} label="No orders yet."/>}
              {recentOrders.map(o => (
                <tr key={o.id}>
                  <Td>
                    <p className="text-sm font-medium">{farmerName(o.farmerId)}</p>
                    <p className="text-[11px] text-muted">{formatDate(o.orderDate)}</p>
                  </Td>
                  <Td className="text-sm">{catalogBull(o.semenCatalogId)}</Td>
                  <Td className="font-mono text-sm font-semibold">{o.quantityOrdered}</Td>
                  <Td>
                    <Badge tone={o.status === "Delivered" ? "green" : o.status === "Cancelled" ? "gray" : o.status === "Shipped" ? "blue" : o.status === "Approved" ? "purple" : "amber"}>
                      {o.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={o.paymentStatus === "Paid" ? "green" : o.paymentStatus === "Partial" ? "amber" : "red"}>
                      {o.paymentStatus}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Heat Detection Alerts */}
        <Card>
          <CardHeader title="Heat Detection Alerts"
            action={<Link href="/heat-detection" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}/>
          <Table>
            <thead><tr><Th>Animal</Th><Th>Detected</Th><Th>Confidence</Th><Th>Source</Th><Th>Status</Th></tr></thead>
            <tbody>
              {recentHeat.length === 0 && <EmptyRow colSpan={5} label="No heat alerts."/>}
              {recentHeat.map(h => (
                <tr key={h.id}>
                  <Td className="font-medium text-sm">{cattleLabel(h.cattleId)}</Td>
                  <Td className="text-xs text-muted">{formatDate(h.detectedAt.slice(0, 10))}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-semibold">{h.confidence}%</span>
                      <ProgressBar pct={h.confidence} color={h.confidence >= 80 ? "#16a34a" : h.confidence >= 60 ? "#d97706" : "#9ca3af"}/>
                    </div>
                  </Td>
                  <Td className="text-xs text-muted">{h.source}</Td>
                  <Td><Badge tone={heatStatusTone(h.status)}>{h.status}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Recent Births */}
        <Card>
          <CardHeader title="Recent Births"
            action={<Link href="/births" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}/>
          <Table>
            <thead><tr><Th>Calf</Th><Th>Date</Th><Th>Dam</Th><Th>Class</Th><Th>Outcome</Th></tr></thead>
            <tbody>
              {recentBirths.length === 0 && <EmptyRow colSpan={5} label="No birth records."/>}
              {recentBirths.map(b => (
                <tr key={b.id}>
                  <Td className="font-medium text-sm">{cattleLabel(b.calfId)}</Td>
                  <Td className="text-sm">{formatDate(b.birthDate)}</Td>
                  <Td className="text-sm text-muted">{cattleLabel(b.damId)}</Td>
                  <Td className="text-xs text-muted">{b.class}</Td>
                  <Td><StatusBadge status={b.outcome}/></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      {/* ── Financial Summary ──────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent Transactions"
            action={<Link href="/finance" className="text-xs font-semibold text-brand-700 hover:underline">Finance →</Link>}/>
          <Table>
            <thead><tr><Th>Date</Th><Th>Description</Th><Th>Category</Th><Th>Amount</Th><Th>Status</Th></tr></thead>
            <tbody>
              {recentTransactions.length === 0 && <EmptyRow colSpan={5} label="No transactions."/>}
              {recentTransactions.map(t => (
                <tr key={t.id}>
                  <Td className="text-xs text-muted">{formatDate(t.date)}</Td>
                  <Td>
                    <p className="text-sm font-medium truncate max-w-[180px]">{t.description}</p>
                    <p className="text-[11px] text-muted">{t.reference}</p>
                  </Td>
                  <Td><Badge tone={t.type === "Income" || t.type === "Sale" ? "green" : "gray"}>{t.category}</Badge></Td>
                  <Td className={`font-mono text-sm font-semibold tabular-nums ${t.type === "Income" || t.type === "Sale" ? "text-green-700" : "text-ink"}`}>
                    {t.type === "Income" || t.type === "Sale" ? "+" : "−"}{currency(t.amount)}
                  </Td>
                  <Td><Badge tone={t.status === "Posted" ? "green" : t.status === "Draft" ? "amber" : "gray"}>{t.status}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Semen Stock summary */}
        <Card>
          <CardHeader title="Semen Stock Summary"
            action={<Link href="/semen-supply?tab=catalog" className="text-xs font-semibold text-brand-700 hover:underline">Catalogue →</Link>}/>
          <div className="divide-y divide-line">
            {[
              { label: "Available",    count: semenCatalog.filter(c => c.status === "Available").length,    tone: "green"  as const },
              { label: "Low Stock",    count: semenCatalog.filter(c => c.status === "Low Stock").length,    tone: "amber"  as const },
              { label: "Out of Stock", count: semenCatalog.filter(c => c.status === "Out of Stock").length, tone: "red"    as const },
              { label: "Expired",      count: semenCatalog.filter(c => c.status === "Expired").length,      tone: "gray"   as const },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-5 py-3">
                <Badge tone={s.tone}>{s.label}</Badge>
                <span className="font-mono text-sm font-semibold">{number(s.count)} lots</span>
              </div>
            ))}
            <div className="px-5 py-3 bg-canvas/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Total straws (available lots)</span>
                <span className="font-mono text-sm font-bold">{number(totalStraws)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Collections This Year</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-canvas px-3 py-2">
                <p className="text-lg font-bold">{semenCollections.length}</p>
                <p className="text-[11px] text-muted">Total Collections</p>
              </div>
              <div className="rounded-lg bg-canvas px-3 py-2">
                <p className="text-lg font-bold">{semenCollections.filter(c => c.status === "Accepted — Frozen").length}</p>
                <p className="text-[11px] text-muted">Accepted Frozen</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom: Overdue Vaccinations + Distribution quick view ──────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Overdue & Due Vaccinations"
            action={<Link href="/vaccinations" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}/>
          <Table>
            <thead><tr><Th>Animal</Th><Th>Vaccine</Th><Th>Due Date</Th><Th>Status</Th></tr></thead>
            <tbody>
              {overdueVaxList.length === 0 && dueVaxList.length === 0 && <EmptyRow colSpan={4} label="All vaccinations up to date."/>}
              {[...overdueVaxList, ...dueVaxList].slice(0, 6).map(v => (
                <tr key={v.id}>
                  <Td className="font-medium text-sm">{cattleLabel(v.cattleId)}</Td>
                  <Td className="text-sm">{v.vaccine}</Td>
                  <Td className="text-xs text-muted">{formatDate(v.nextDue)}</Td>
                  <Td><StatusBadge status={v.status}/></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Distribution Network"
            action={<Link href="/distribution" className="text-xs font-semibold text-brand-700 hover:underline">Manage →</Link>}/>
          <div className="divide-y divide-line">
            {[
              { label: "Hierarchy Levels",     value: number(hierarchyNodes.length > 0 ? new Set(hierarchyNodes.map(n => n.levelId)).size : 0), icon: "network"   as const },
              { label: "Active Locations",     value: number(activeNodes),                                                                        icon: "location"  as const },
              { label: "Active DPs",           value: number(activeDPs),                                                                          icon: "thermometer" as const },
              { label: "Territory Managers",   value: number(territoryManagers.filter(m => m.isActive).length),                                   icon: "agent"     as const },
              { label: "Field AI Technicians", value: number(activeAgents),                                                                       icon: "shield"    as const },
              { label: "Registered Farms",     value: number(farms.length),                                                                       icon: "farm"      as const },
              { label: "Registered Farmers",   value: number(farmers.length),                                                                     icon: "farmer"    as const },
              { label: "Farmer Cattle (AI)",   value: number(farmerCattle.length),                                                                icon: "cow"       as const },
            ].map(row => {
              const IconCmp = Icon[row.icon];
              return (
                <div key={row.label} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <IconCmp width={15} height={15}/>
                  </div>
                  <span className="flex-1 text-sm text-ink">{row.label}</span>
                  <span className="font-mono text-sm font-bold">{row.value}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── AI Field Programme Summary ─────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="AI Field Programme — This Season"
            action={<Link href="/insemination" className="text-xs font-semibold text-brand-700 hover:underline">Insemination Events →</Link>}/>
          <div className="grid grid-cols-2 gap-px border-b border-line bg-line">
            {[
              { label: "Total Services",     value: number(totalInseminations),      tone: "blue"   as const },
              { label: "Pregnant",           value: number(aiPregnantFC),            tone: "green"  as const },
              { label: "Pending PD",         value: number(pendingPD),               tone: "amber"  as const },
              { label: "Open / Failed",      value: number(openAI),                  tone: "red"    as const },
              { label: "Straws Issued",      value: number(totalStrawsIssued),       tone: "blue"   as const },
              { label: "Straws Used",        value: number(totalStrawsUsed),         tone: "green"  as const },
              { label: "Farmer Calves Born", value: number(farmerCalfBirthsLive),    tone: "purple" as const },
              { label: "Conception Rate",    value: `${aiConceptionRate}%`,          tone: aiConceptionRate >= 60 ? "green" as const : "amber" as const },
            ].map(k => (
              <div key={k.label} className="bg-surface px-4 py-3">
                <p className="text-base font-bold tabular-nums">{k.value}</p>
                <p className="text-[11px] text-muted">{k.label}</p>
              </div>
            ))}
          </div>
          {lowNitrogenDPs > 0 && (
            <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2.5">
              <Icon.thermometer width={14} height={14} className="text-amber-600"/>
              <p className="text-xs font-medium text-amber-800">
                <strong>{lowNitrogenDPs}</strong> distribution point{lowNitrogenDPs !== 1 ? "s" : ""} below 30% nitrogen — schedule refill
              </p>
              <Link href="/dp-management" className="ml-auto text-xs font-semibold text-amber-700 hover:underline">View →</Link>
            </div>
          )}
          {pendingSettlements > 0 && (
            <div className="flex items-center gap-2 border-t border-blue-200 bg-blue-50 px-4 py-2.5">
              <Icon.percent width={14} height={14} className="text-blue-600"/>
              <p className="text-xs font-medium text-blue-800">
                <strong>{pendingSettlements}</strong> agent commission settlement{pendingSettlements !== 1 ? "s" : ""} awaiting approval
              </p>
              <Link href="/agent-performance" className="ml-auto text-xs font-semibold text-blue-700 hover:underline">View →</Link>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent AI Inseminations"
            action={<Link href="/insemination" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}/>
          <Table>
            <thead><tr><Th>Date</Th><Th>Cow Tag</Th><Th>Agent</Th><Th>Result</Th></tr></thead>
            <tbody>
              {recentInseminations.length === 0 && <EmptyRow colSpan={4} label="No insemination events yet."/>}
              {recentInseminations.map(ie => {
                const fc = farmerCattle.find(x => x.id === ie.farmerCattleId);
                const ag = saleAgents.find(x => x.id === ie.agentId);
                const resultTone = ie.result === "Pregnant" ? "green" as const
                  : ie.result === "Open" ? "red" as const
                  : ie.result === "Pending PD" ? "amber" as const
                  : ie.result === "Repeat Service" ? "purple" as const : "gray" as const;
                return (
                  <tr key={ie.id}>
                    <Td className="text-sm">{formatDate(ie.inseminationDate)}</Td>
                    <Td className="font-medium text-sm">{fc ? fc.tagNumber + (fc.name ? ` — ${fc.name}` : "") : ie.farmerCattleId}</Td>
                    <Td className="text-sm text-muted">{ag ? `${ag.firstName} ${ag.lastName}` : ie.agentId}</Td>
                    <Td><Badge tone={resultTone}>{ie.result}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>

      {/* ── PD Pending alerts ──────────────────────────────────────────────── */}
      {pendingPD > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader title={`Pregnancy Diagnosis Pending (${pendingPD} cows overdue / due)`}
              action={<Link href="/pregnancy-diagnosis" className="text-xs font-semibold text-brand-700 hover:underline">Record PD →</Link>}/>
            <Table>
              <thead><tr><Th>Cow</Th><Th>Insemination Date</Th><Th>PD Due</Th><Th>Agent</Th><Th>Farm</Th></tr></thead>
              <tbody>
                {inseminationEvents
                  .filter(e => e.result === "Pending PD")
                  .sort((a, b) => (a.pdScheduledDate ?? "").localeCompare(b.pdScheduledDate ?? ""))
                  .slice(0, 6)
                  .map(ie => {
                    const fc = farmerCattle.find(x => x.id === ie.farmerCattleId);
                    const ag = saleAgents.find(x => x.id === ie.agentId);
                    const fm = farms.find(x => x.id === ie.farmId);
                    const d = ie.pdScheduledDate ? daysUntil(ie.pdScheduledDate) : null;
                    return (
                      <tr key={ie.id}>
                        <Td className="font-medium text-sm">{fc ? `${fc.tagNumber}${fc.name ? ` — ${fc.name}` : ""}` : ie.farmerCattleId}</Td>
                        <Td className="text-sm">{formatDate(ie.inseminationDate)}</Td>
                        <Td>
                          {ie.pdScheduledDate
                            ? d !== null && d < 0
                              ? <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Overdue {Math.abs(d)}d</span>
                              : <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">in {d}d</span>
                            : <span className="text-xs text-muted">—</span>
                          }
                        </Td>
                        <Td className="text-sm text-muted">{ag ? `${ag.firstName} ${ag.lastName}` : "—"}</Td>
                        <Td className="text-sm text-muted">{fm?.name ?? "—"}</Td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}
