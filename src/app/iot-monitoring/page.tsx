"use client";

import { useMemo, useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  StatCard,
  Badge,
  CardHeader,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import type { CollarReading } from "@/lib/types";

// ── Tone helpers ───────────────────────────────────────────────────────────────

function tempTone(t: number, hi: number, lo: number) {
  if (t > hi) return "red" as const;
  if (t < lo) return "blue" as const;
  return "green" as const;
}
function actTone(a: number, hi: number) {
  if (a >= hi) return "red" as const;
  if (a >= hi * 0.75) return "amber" as const;
  return "green" as const;
}
function batTone(b: number, lo: number) {
  if (b <= lo) return "red" as const;
  if (b <= lo * 2) return "amber" as const;
  return "green" as const;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MiniBar({ pct, tone }: { pct: number; tone: "green" | "amber" | "red" | "blue" }) {
  const colours = {
    green: "bg-brand-500",
    amber: "bg-amber-400",
    red: "bg-red-500",
    blue: "bg-sky-400",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
      <div className={`h-full rounded-full ${colours[tone]}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function Sparkline({ values, color = "#16a34a" }: { values: number[]; color?: string }) {
  if (values.length < 2) return <span className="text-[10px] text-muted">no trend</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 72, h = 24;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(values.length - 1) / (values.length - 1) * w} cy={h - ((values[values.length - 1] - min) / range) * h} r="2" fill={color} />
    </svg>
  );
}

function SectionHead({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-[#0f172a] p-4">
      <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

// ── Default thresholds ─────────────────────────────────────────────────────────

const DEFAULTS = { tempHigh: 39.5, tempLow: 37.5, actHigh: 75, batLow: 15 };

// ── Static device catalog (pairs device serial → cattle) ──────────────────────

const COLLAR_BRANDS = [
  { brand: "Allflex SenseHub", device: "AX-2024-001", protocol: "MQTT / REST", interval: "5 min", features: "Temp, Activity, Rumination, GPS" },
  { brand: "SCR HeatTime Pro", device: "SCR-HT-002", protocol: "REST API", interval: "15 min", features: "Activity, Rumination, Heat Index" },
  { brand: "CowManager Ear Tag", device: "CM-EAR-003", protocol: "REST API", interval: "3 min", features: "Temp, Activity, Rumination" },
  { brand: "Cowlar v3", device: "CL-V3-004", protocol: "MQTT / WebSocket", interval: "1 min", features: "Temp, Activity, HR, GPS" },
  { brand: "Smartbow (Zoetis)", device: "SB-ZT-005", protocol: "REST API", interval: "2 min", features: "Location, Activity, Rumination" },
];

// ── Tab type ───────────────────────────────────────────────────────────────────

type Tab = "monitor" | "alerts" | "devices" | "guide";

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IotMonitoringPage() {
  const { cattle, collarReadings } = useData();

  const [tab, setTab] = useState<Tab>("monitor");
  const [liveMode, setLiveMode] = useState(false);
  const [liveReadings, setLiveReadings] = useState<CollarReading[]>([]);
  const [countdown, setCountdown] = useState(30);
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline" | "alert">("all");
  const [thresholds, setThresholds] = useState(DEFAULTS);
  const [tempHistory, setTempHistory] = useState<Record<string, number[]>>({});

  // ── Live simulation ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!liveMode) {
      setLiveReadings([]);
      setCountdown(30);
      return;
    }
    // seed from store
    setLiveReadings(collarReadings.map(r => ({ ...r, lastSync: new Date().toISOString() })));
    setTempHistory(Object.fromEntries(collarReadings.map(r => [r.id, [r.temperature]])));

    let secs = 30;
    const ticker = setInterval(() => {
      secs--;
      if (secs < 0) secs = 30;
      setCountdown(secs);
      if (secs === 0) {
        setLiveReadings(prev =>
          prev.map(r => {
            if (!r.isOnline) return r;
            const newTemp = parseFloat(Math.max(36.5, Math.min(41.0, r.temperature + (Math.random() - 0.5) * 0.4)).toFixed(1));
            const newAct = Math.max(0, Math.min(100, Math.round(r.activityIndex + (Math.random() - 0.5) * 18)));
            const newBat = Math.max(0, r.batteryPct - (Math.random() < 0.12 ? 1 : 0));
            setTempHistory(h => ({
              ...h,
              [r.id]: [...(h[r.id] ?? [r.temperature]).slice(-11), newTemp],
            }));
            return {
              ...r,
              temperature: newTemp,
              activityIndex: newAct,
              batteryPct: newBat,
              heartRate: r.heartRate ? Math.round(Math.max(40, Math.min(120, r.heartRate + (Math.random() - 0.5) * 6))) : undefined,
              ruminationMinPh: r.ruminationMinPh ? Math.round(Math.max(0, Math.min(60, r.ruminationMinPh + (Math.random() - 0.5) * 5))) : undefined,
              lastSync: new Date().toISOString(),
            };
          })
        );
      }
    }, 1000);

    return () => clearInterval(ticker);
    // only re-run when liveMode changes, not on every reading update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode]);

  const displayReadings = liveMode && liveReadings.length > 0 ? liveReadings : collarReadings;

  // ── Enriched data ────────────────────────────────────────────────────────────

  const enriched = useMemo(() => {
    return displayReadings.map(cr => ({
      ...cr,
      animal: cattle.find(c => c.id === cr.cattleId),
      hasTempAlert: cr.temperature > thresholds.tempHigh || cr.temperature < thresholds.tempLow,
      hasActivityAlert: cr.activityIndex >= thresholds.actHigh,
      hasBatAlert: cr.batteryPct <= thresholds.batLow,
    }));
  }, [displayReadings, cattle, thresholds]);

  const stats = useMemo(() => ({
    total: enriched.length,
    online: enriched.filter(r => r.isOnline).length,
    alerts: enriched.filter(r => r.hasTempAlert || r.hasActivityAlert || r.hasBatAlert).length,
    lowBat: enriched.filter(r => r.hasBatAlert).length,
  }), [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter(r => {
      if (statusFilter === "online" && !r.isOnline) return false;
      if (statusFilter === "offline" && r.isOnline) return false;
      if (statusFilter === "alert" && !r.hasTempAlert && !r.hasActivityAlert && !r.hasBatAlert) return false;
      return true;
    });
  }, [enriched, statusFilter]);

  // ── Alert log ────────────────────────────────────────────────────────────────

  const alertLog = useMemo(() => {
    return enriched.flatMap(r => {
      const out: { id: string; animal: string; type: string; value: string; threshold: string; time: string; tone: "red" | "amber" | "blue" | "gray" }[] = [];
      if (r.hasTempAlert)
        out.push({
          id: `${r.id}-temp`,
          animal: r.animal?.name ?? r.cattleId,
          type: r.temperature > thresholds.tempHigh ? "Fever" : "Hypothermia",
          value: `${r.temperature.toFixed(1)} °C`,
          threshold: r.temperature > thresholds.tempHigh ? `> ${thresholds.tempHigh} °C` : `< ${thresholds.tempLow} °C`,
          time: r.lastSync,
          tone: r.temperature > thresholds.tempHigh ? "red" : "blue",
        });
      if (r.hasActivityAlert)
        out.push({
          id: `${r.id}-act`,
          animal: r.animal?.name ?? r.cattleId,
          type: "High Activity (Heat Sign)",
          value: `${r.activityIndex}/100`,
          threshold: `≥ ${thresholds.actHigh}`,
          time: r.lastSync,
          tone: "amber",
        });
      if (r.hasBatAlert)
        out.push({
          id: `${r.id}-bat`,
          animal: r.animal?.name ?? r.cattleId,
          type: "Low Battery",
          value: `${r.batteryPct}%`,
          threshold: `≤ ${thresholds.batLow}%`,
          time: r.lastSync,
          tone: "amber",
        });
      if (!r.isOnline)
        out.push({
          id: `${r.id}-offline`,
          animal: r.animal?.name ?? r.cattleId,
          type: "Device Offline",
          value: "Offline",
          threshold: "—",
          time: r.lastSync,
          tone: "gray",
        });
      return out;
    });
  }, [enriched, thresholds]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="IoT Smart Collar Monitoring"
        description="Real-time biosensor telemetry from fitted smart collars — temperature, activity, GPS, rumination"
      />

      {/* Live mode banner */}
      {liveMode && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-emerald-800">Live simulation active — next poll in <strong>{countdown}s</strong></span>
          <button onClick={() => setLiveMode(false)} className="ml-auto text-xs text-emerald-700 underline hover:no-underline">
            Stop
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Collared Animals" value={String(stats.total)} iconName="wifi" tone="blue" />
        <StatCard label="Online Now" value={String(stats.online)} sublabel={`${stats.total - stats.online} offline`} iconName="wifi" tone="green" />
        <StatCard label="Active Alerts" value={String(stats.alerts)} sublabel="temp / activity / battery" iconName="zap" tone={stats.alerts > 0 ? "red" : "green"} />
        <StatCard label="Low Battery" value={String(stats.lowBat)} sublabel="below threshold" iconName="battery" tone={stats.lowBat > 0 ? "amber" : "green"} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {([
            ["monitor", "Live Monitor"],
            ["alerts", `Alert Log${alertLog.length > 0 ? ` (${alertLog.length})` : ""}`],
            ["devices", "Devices & Thresholds"],
            ["guide", "Integration Guide"],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${tab === key ? "bg-brand-600 text-white" : "text-muted hover:bg-canvas"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "monitor" && (
          <div className="flex items-center gap-2">
            {!liveMode && (
              <button onClick={() => setLiveMode(true)}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Start Live Polling
              </button>
            )}
            <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
              {(["all", "online", "offline", "alert"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${statusFilter === s ? "bg-brand-600 text-white" : "text-muted hover:bg-canvas"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TAB: LIVE MONITOR ───────────────────────────────────────────────── */}
      {tab === "monitor" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(r => {
              const tt = tempTone(r.temperature, thresholds.tempHigh, thresholds.tempLow);
              const at = actTone(r.activityIndex, thresholds.actHigh);
              const bt = batTone(r.batteryPct, thresholds.batLow);
              const hasAlert = r.hasTempAlert || r.hasActivityAlert || r.hasBatAlert;
              const hist = tempHistory[r.id] ?? [r.temperature];
              return (
                <Card key={r.id} className={`p-0 ${hasAlert ? "ring-1 ring-red-300" : ""}`}>
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{r.animal?.name ?? r.cattleId}</span>
                      <span className="font-mono text-[11px] text-muted">{r.cattleId}</span>
                      {r.animal?.class && <Badge tone="gray">{r.animal.class}</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasAlert && <Badge tone="red">Alert</Badge>}
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${r.isOnline ? "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]" : "bg-slate-300"}`}
                        title={r.isOnline ? "Online" : "Offline"}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    {/* Temperature with sparkline */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted">
                          <Icon.thermometer width={12} height={12} /> Temperature
                        </span>
                        <div className="flex items-center gap-2">
                          {liveMode && <Sparkline values={hist} color={tt === "red" ? "#ef4444" : tt === "blue" ? "#38bdf8" : "#16a34a"} />}
                          <Badge tone={tt}>{r.temperature.toFixed(1)} °C</Badge>
                        </div>
                      </div>
                      <MiniBar pct={((r.temperature - 36) / 6) * 100} tone={tt} />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted">
                          <Icon.activity width={12} height={12} /> Activity Index
                        </span>
                        <Badge tone={at}>{r.activityIndex}/100{r.activityIndex >= thresholds.actHigh ? " ⚡" : ""}</Badge>
                      </div>
                      <MiniBar pct={r.activityIndex} tone={at} />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted">
                          <Icon.battery width={12} height={12} /> Battery
                        </span>
                        <Badge tone={bt}>{r.batteryPct}%</Badge>
                      </div>
                      <MiniBar pct={r.batteryPct} tone={bt} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {r.heartRate && (
                        <div className="rounded-lg bg-canvas px-3 py-2 text-center">
                          <p className="text-[10px] text-muted">Heart Rate</p>
                          <p className="text-sm font-semibold text-ink">{r.heartRate} bpm</p>
                        </div>
                      )}
                      {r.ruminationMinPh !== undefined && (
                        <div className="rounded-lg bg-canvas px-3 py-2 text-center">
                          <p className="text-[10px] text-muted">Rumination</p>
                          <p className="text-sm font-semibold text-ink">{r.ruminationMinPh} min/h</p>
                        </div>
                      )}
                      {r.gpsLat && (
                        <div className="col-span-2 flex items-center justify-between rounded-lg bg-canvas px-3 py-2">
                          <div>
                            <p className="text-[10px] text-muted">GPS</p>
                            <p className="font-mono text-xs text-ink">{r.gpsLat.toFixed(4)}, {r.gpsLng?.toFixed(4)}</p>
                          </div>
                          <Icon.location width={14} height={14} className="text-muted" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted">
                    {r.isOnline
                      ? `Last sync: ${liveMode ? "just now" : r.lastSync.replace("T", " ").slice(0, 16)}`
                      : <span className="text-amber-600">Offline — last seen {r.lastSync.replace("T", " ").slice(0, 16)}</span>
                    }
                  </div>
                </Card>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-3 rounded-xl border border-dashed border-line py-16 text-center text-muted">
                No collars match the selected filter.
              </div>
            )}
          </div>

          {/* National registry */}
          <Card>
            <CardHeader title="National Livestock Registry — Sync Status" />
            <div className="divide-y divide-line">
              {[
                { label: "Zimbabwe DLVS — Bull Register", status: "Synced", detail: "3 bulls active", last: "2026-06-22", tone: "green" as const },
                { label: "ICAR Animal ID Database", status: "Pending Sync", detail: "RFID tags pending upload", last: "2026-05-15", tone: "amber" as const },
                { label: "AgriChain Blockchain Node", status: "Connected", detail: "8 records on-chain", last: "2026-06-23", tone: "green" as const },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{row.label}</p>
                    <p className="text-xs text-muted">{row.detail} · Last: {row.last}</p>
                  </div>
                  <Badge tone={row.tone}>{row.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ── TAB: ALERT LOG ──────────────────────────────────────────────────── */}
      {tab === "alerts" && (
        <Card className="p-0">
          <CardHeader title="Alert Log" />
          {alertLog.length === 0 ? (
            <div className="py-16 text-center text-muted">
              <Icon.bell width={32} height={32} className="mx-auto mb-3 opacity-30" />
              <p>No active alerts — all collars within thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
                    <th className="px-4 py-3 font-medium">Alert Type</th>
                    <th className="px-4 py-3 font-medium">Animal</th>
                    <th className="px-4 py-3 font-medium">Reading</th>
                    <th className="px-4 py-3 font-medium">Threshold</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {alertLog.map(a => (
                    <tr key={a.id} className="hover:bg-canvas/50">
                      <td className="px-4 py-3"><Badge tone={a.tone}>{a.type}</Badge></td>
                      <td className="px-4 py-3 font-medium text-ink">{a.animal}</td>
                      <td className="px-4 py-3 font-mono text-ink">{a.value}</td>
                      <td className="px-4 py-3 text-muted">{a.threshold}</td>
                      <td className="px-4 py-3 text-muted">{a.time.replace("T", " ").slice(0, 16)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-amber-600">Unacknowledged</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB: DEVICES & THRESHOLDS ───────────────────────────────────────── */}
      {tab === "devices" && (
        <div className="space-y-6">
          {/* Alert threshold configuration */}
          <Card>
            <SectionHead title="Alert Thresholds" description="Customize when readings trigger an alert" />
            <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { key: "tempHigh" as const, label: "High Temperature", unit: "°C", min: 38, max: 42, step: 0.1 },
                { key: "tempLow" as const, label: "Low Temperature", unit: "°C", min: 35, max: 39, step: 0.1 },
                { key: "actHigh" as const, label: "High Activity", unit: "/100", min: 50, max: 100, step: 1 },
                { key: "batLow" as const, label: "Low Battery", unit: "%", min: 5, max: 40, step: 1 },
              ].map(field => (
                <div key={field.key} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">{field.label}</span>
                    <span className="font-semibold text-ink">{thresholds[field.key]}{field.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={thresholds[field.key]}
                    onChange={e => setThresholds(t => ({ ...t, [field.key]: parseFloat(e.target.value) }))}
                    className="w-full accent-brand-600"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>{field.min}{field.unit}</span>
                    <span>{field.max}{field.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-3">
              <button
                onClick={() => setThresholds(DEFAULTS)}
                className="text-xs text-brand-600 hover:underline"
              >
                Reset to ICAR/FAO defaults
              </button>
            </div>
          </Card>

          {/* Registered collars */}
          <Card className="p-0">
            <SectionHead title="Registered Smart Collars" description="Device ID to animal pairing" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
                    <th className="px-4 py-3 font-medium">Collar ID</th>
                    <th className="px-4 py-3 font-medium">Animal</th>
                    <th className="px-4 py-3 font-medium">Last Temp</th>
                    <th className="px-4 py-3 font-medium">Battery</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {enriched.map(r => (
                    <tr key={r.id} className="hover:bg-canvas/50">
                      <td className="px-4 py-3 font-mono text-xs text-ink">{r.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{r.animal?.name ?? "—"}</p>
                        <p className="text-xs text-muted">{r.cattleId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={tempTone(r.temperature, thresholds.tempHigh, thresholds.tempLow)}>
                          {r.temperature.toFixed(1)} °C
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={batTone(r.batteryPct, thresholds.batLow)}>{r.batteryPct}%</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={r.isOnline ? "green" : "gray"}>{r.isOnline ? "Online" : "Offline"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{r.lastSync.replace("T", " ").slice(0, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Supported hardware */}
          <Card className="p-0">
            <SectionHead title="Supported Collar Hardware" description="Verified integrations and their polling protocols" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
                    <th className="px-4 py-3 font-medium">Brand / Model</th>
                    <th className="px-4 py-3 font-medium">Device ID</th>
                    <th className="px-4 py-3 font-medium">Protocol</th>
                    <th className="px-4 py-3 font-medium">Poll Interval</th>
                    <th className="px-4 py-3 font-medium">Sensors</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {COLLAR_BRANDS.map(b => (
                    <tr key={b.device} className="hover:bg-canvas/50">
                      <td className="px-4 py-3 font-medium text-ink">{b.brand}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{b.device}</td>
                      <td className="px-4 py-3 text-ink">{b.protocol}</td>
                      <td className="px-4 py-3 text-muted">{b.interval}</td>
                      <td className="px-4 py-3 text-xs text-muted">{b.features}</td>
                      <td className="px-4 py-3"><Badge tone="green">Supported</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: INTEGRATION GUIDE ──────────────────────────────────────────── */}
      {tab === "guide" && (
        <div className="space-y-6">
          {/* Architecture overview */}
          <Card>
            <SectionHead
              title="How Smart Collar Live Data Reaches HerdLine"
              description="End-to-end architecture for hardware-to-dashboard integration"
            />
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-line bg-canvas p-5">
                <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
                  {[
                    { icon: "wifi", label: "Smart Collar", sub: "BLE / LoRa / NB-IoT / LTE-M", color: "bg-sky-100 text-sky-700" },
                    { arrow: "→" },
                    { icon: "network", label: "Gateway / Base Station", sub: "Collar to internet bridge", color: "bg-violet-100 text-violet-700" },
                    { arrow: "→" },
                    { icon: "link", label: "Cloud / MQTT Broker", sub: "Manufacturer cloud or self-hosted Mosquitto", color: "bg-amber-100 text-amber-700" },
                    { arrow: "→" },
                    { icon: "report", label: "HerdLine API", sub: "POST /api/collar-readings", color: "bg-brand-100 text-brand-700" },
                    { arrow: "→" },
                    { icon: "dashboard", label: "This Dashboard", sub: "Real-time collar cards", color: "bg-emerald-100 text-emerald-700" },
                  ].map((step, i) => {
                    if ("arrow" in step)
                      return <span key={i} className="hidden text-xl text-muted sm:block">{step.arrow}</span>;
                    const IconCmp = Icon[step.icon as keyof typeof Icon];
                    return (
                      <div key={i} className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg px-3 py-3 ${step.color}`}>
                        <IconCmp width={20} height={20} />
                        <p className="text-xs font-semibold">{step.label}</p>
                        <p className="text-[10px] opacity-70">{step.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    title: "Option 1 — REST Webhook (recommended)",
                    desc: "Collar manufacturer cloud (Allflex, SCR, CowManager) calls your API endpoint when new readings arrive. Zero polling required. Latency: 30 s – 5 min depending on collar firmware.",
                    tone: "green",
                  },
                  {
                    title: "Option 2 — MQTT Subscribe",
                    desc: "Self-host a Mosquitto or HiveMQ broker. Collar/gateway publishes to topic cattle/{farmId}/{collarId}/telemetry. Your Next.js backend subscribes and ingests readings in real time. Latency: < 5 s.",
                    tone: "blue",
                  },
                  {
                    title: "Option 3 — Scheduled Polling",
                    desc: "Your backend calls the collar manufacturer's REST API every 5–15 min and syncs new readings. Easiest to set up, but has higher latency. Works with any collar brand that exposes an API.",
                    tone: "amber",
                  },
                ].map(opt => (
                  <div key={opt.title} className="rounded-lg border border-line bg-surface p-4">
                    <p className="mb-1 text-sm font-semibold text-ink">{opt.title}</p>
                    <p className="text-xs text-muted leading-relaxed">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Webhook API spec */}
          <Card>
            <SectionHead
              title="HerdLine Collar Webhook — API Specification"
              description="This is the endpoint your collar's cloud or gateway POSTs data to"
            />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                <Badge tone="green">POST</Badge>
                <code className="text-sm font-mono text-ink">/api/collar-readings</code>
                <span className="ml-auto text-xs text-muted">Bearer token auth</span>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Request body (JSON)</p>
                <CodeBlock code={`{
  "device_id":   "COLLAR-AX-001",        // hardware serial number
  "cattle_id":   "C-3001",               // must match HerdLine cattle ID
  "timestamp":   "2026-06-25T08:30:00Z", // ISO 8601 UTC
  "temperature": 38.7,                   // °C
  "activity_index": 45,                  // 0-100
  "battery_pct": 82,                     // 0-100%
  "heart_rate":  68,                     // optional, bpm
  "rumination_min_ph": 42,               // optional, min/hour
  "gps": {
    "lat": -17.8252,
    "lng": 31.0335
  }
}`} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Response (200 OK)</p>
                <CodeBlock code={`{
  "ok": true,
  "reading_id": "CR-042",
  "alerts_triggered": ["High Activity"]
}`} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Next.js API Route handler — src/app/api/collar-readings/route.ts</p>
                <CodeBlock code={`import { NextRequest, NextResponse } from "next/server";

const VALID_TOKEN = process.env.COLLAR_API_KEY ?? "change-me";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== \`Bearer \${VALID_TOKEN}\`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // 1. Validate required fields
  const { device_id, cattle_id, timestamp, temperature, activity_index, battery_pct } = body;
  if (!device_id || !cattle_id || !timestamp || temperature == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 2. Map to CollarReading and persist to your database
  //    (In this demo the store is client-side; in production you'd write to
  //     PostgreSQL / Supabase / MongoDB here.)
  const reading = {
    id: \`CR-\${Date.now()}\`,
    cattleId: cattle_id,
    temperature,
    activityIndex: activity_index,
    batteryPct: battery_pct,
    heartRate: body.heart_rate,
    ruminationMinPh: body.rumination_min_ph,
    gpsLat: body.gps?.lat,
    gpsLng: body.gps?.lng,
    lastSync: timestamp,
    isOnline: true,
  };

  // 3. Check thresholds and queue alerts
  const alerts: string[] = [];
  if (temperature > 39.5) alerts.push("Fever");
  if (temperature < 37.5) alerts.push("Hypothermia");
  if (activity_index >= 75) alerts.push("High Activity");
  if (battery_pct <= 15)   alerts.push("Low Battery");

  // 4. Optionally push alert to Slack / SMS / email here

  return NextResponse.json({ ok: true, reading_id: reading.id, alerts_triggered: alerts });
}`} />
              </div>
            </div>
          </Card>

          {/* MQTT topic structure */}
          <Card>
            <SectionHead
              title="MQTT Integration (Real-time, &lt; 5s latency)"
              description="For self-hosted MQTT brokers or collars that support direct MQTT publish"
            />
            <div className="space-y-4 p-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Topic structure</p>
                <CodeBlock code={`cattle/{farm_id}/{cattle_id}/telemetry   ← collar publishes here
cattle/{farm_id}/{cattle_id}/alerts      ← HerdLine backend publishes alerts
cattle/{farm_id}/+/telemetry            ← subscribe to all animals on a farm`} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Node.js MQTT subscriber (runs alongside Next.js server)</p>
                <CodeBlock code={`import mqtt from "mqtt";

const client = mqtt.connect("mqtt://broker.your-farm.com:1883", {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
});

client.on("connect", () => {
  client.subscribe("cattle/FARM-001/+/telemetry", { qos: 1 });
  console.log("Subscribed to collar telemetry");
});

client.on("message", async (topic, payload) => {
  const data = JSON.parse(payload.toString());
  // topic: "cattle/FARM-001/C-3001/telemetry"
  const [, farmId, cattleId] = topic.split("/");

  await fetch("https://your-erp.com/api/collar-readings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${process.env.COLLAR_API_KEY}\`,
    },
    body: JSON.stringify({ ...data, cattle_id: cattleId }),
  });
});`} />
              </div>
            </div>
          </Card>

          {/* Manufacturer-specific integration */}
          <Card>
            <SectionHead
              title="Manufacturer-Specific Integration Steps"
              description="Configure each brand's cloud to forward data to HerdLine"
            />
            <div className="divide-y divide-line">
              {[
                {
                  brand: "Allflex SenseHub",
                  steps: [
                    "Log in to SenseHub cloud portal → Settings → Integrations → Webhooks",
                    `Add webhook URL: https://your-erp.com/api/collar-readings`,
                    "Set Auth header: Authorization: Bearer {your COLLAR_API_KEY}",
                    "Enable events: New Reading, Device Offline, Low Battery",
                  ],
                },
                {
                  brand: "SCR HeatTime Pro",
                  steps: [
                    "Open SCR Dashboard → Settings → Data Export → REST Push",
                    "Enter HerdLine endpoint and API key",
                    "Map SCR field names: activity_score → activity_index, body_temp → temperature",
                    "Set push interval to Every 15 minutes",
                  ],
                },
                {
                  brand: "Cowlar / CowManager (generic REST)",
                  steps: [
                    "In manufacturer portal: API Keys → Generate → copy key",
                    "Add CRON job on your server: every 5 min call manufacturer GET /api/v1/readings?since={lastSync}",
                    "Transform response fields to HerdLine format",
                    "POST each reading to /api/collar-readings",
                  ],
                },
                {
                  brand: "DIY / Custom LoRa Collar",
                  steps: [
                    "Firmware: include HTTP POST to /api/collar-readings in telemetry routine",
                    "Use SIM800/SIM7600 GSM module for cellular, or connect via LoRaWAN gateway",
                    "For LoRaWAN: The Things Network application → Integrations → HTTP Webhook → HerdLine endpoint",
                    "Payload decoder: convert raw bytes to the JSON schema above",
                  ],
                },
              ].map(item => (
                <div key={item.brand} className="px-5 py-4">
                  <p className="mb-2 text-sm font-semibold text-ink">{item.brand}</p>
                  <ol className="space-y-1">
                    {item.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Card>

          {/* Security & best practices */}
          <Card>
            <CardHeader title="Security & Production Checklist" />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                { label: "Rotate API keys every 90 days", done: false },
                { label: "Store COLLAR_API_KEY in .env.local (never commit)", done: false },
                { label: "Validate cattle_id exists before persisting reading", done: false },
                { label: "Rate-limit /api/collar-readings to 1 req/device/min", done: false },
                { label: "Use HTTPS only — reject HTTP requests", done: false },
                { label: "Set MQTT TLS (port 8883) with client certificates", done: false },
                { label: "Log all readings with device_id for audit trail", done: false },
                { label: "Implement alert deduplication (don't re-alert within 30 min)", done: false },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5 rounded-lg border border-line p-3">
                  <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 ${item.done ? "border-brand-600 bg-brand-600" : "border-muted"}`} />
                  <p className="text-xs text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
