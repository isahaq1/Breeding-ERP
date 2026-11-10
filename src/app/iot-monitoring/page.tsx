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
import {
  Modal,
  TextField,
  NumberField,
  SelectField,
  TextAreaField,
  FormGrid,
  FormButtons,
  RowActions,
} from "@/components/forms";
import type { CollarDevice, CollarReading } from "@/lib/types";

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
  const col = { green: "bg-brand-500", amber: "bg-amber-400", red: "bg-red-500", blue: "bg-sky-400" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
      <div className={`h-full rounded-full ${col[tone]}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function Sparkline({ values, color = "#16a34a" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 0.1;
  const w = 64, h = 20;
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * (h - 2) + 1}`
  ).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHead({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-line px-5 py-3.5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="text-xs text-muted">{description}</p>}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-[#0f172a] p-4">
      <pre className="whitespace-pre text-xs leading-relaxed text-slate-300">{code}</pre>
    </div>
  );
}

// ── GPS mini-map ───────────────────────────────────────────────────────────────

const MAP_W = 480, MAP_H = 300;
const LAT_MIN = -18.06, LAT_MAX = -17.83;
const LNG_MIN = 31.03,  LNG_MAX = 31.14;

function toSvg(lat: number, lng: number): [number, number] {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W;
  const y = ((lat - LAT_MAX) / (LAT_MIN - LAT_MAX)) * MAP_H;
  return [x, y];
}

function GpsMap({ readings }: { readings: { id: string; label: string; lat: number; lng: number; hasAlert: boolean; isOnline: boolean }[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-[#e8f5e9]">
      <svg width={MAP_W} height={MAP_H} className="block" viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        {/* Farm zones */}
        <rect x={60} y={20} width={200} height={120} rx={8} fill="#c8e6c9" stroke="#81c784" strokeWidth={1} />
        <text x={68} y={38} fontSize={10} fill="#2e7d32" fontWeight={600}>North Farm Zone</text>
        <rect x={290} y={150} width={160} height={120} rx={8} fill="#b3e5fc" stroke="#4fc3f7" strokeWidth={1} />
        <text x={298} y={168} fontSize={10} fill="#0277bd" fontWeight={600}>South Farm Zone</text>
        <rect x={60} y={160} width={180} height={120} rx={8} fill="#f9fbe7" stroke="#c5e1a5" strokeWidth={1} />
        <text x={68} y={178} fontSize={10} fill="#558b2f" fontWeight={600}>East Pasture</text>
        {/* Animal pins */}
        {readings.map(r => {
          const [x, y] = toSvg(r.lat, r.lng);
          const color = r.hasAlert ? "#ef4444" : r.isOnline ? "#16a34a" : "#94a3b8";
          const isH = hovered === r.id;
          return (
            <g key={r.id} onMouseEnter={() => setHovered(r.id)} onMouseLeave={() => setHovered(null)}>
              {isH && <circle cx={x} cy={y} r={14} fill={color} opacity={0.2} />}
              <circle cx={x} cy={y} r={isH ? 7 : 5} fill={color} stroke="white" strokeWidth={1.5} />
              {isH && (
                <g transform={`translate(${x > MAP_W - 80 ? x - 76 : x + 10}, ${y > MAP_H - 30 ? y - 28 : y - 6})`}>
                  <rect width={70} height={22} rx={4} fill="#1e293b" opacity={0.9} />
                  <text x={6} y={15} fontSize={9} fill="white">{r.label}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Default thresholds ─────────────────────────────────────────────────────────

const DEFAULTS = { tempHigh: 39.5, tempLow: 37.5, actHigh: 75, batLow: 15 };

// ── Collar device form ─────────────────────────────────────────────────────────

const BRANDS = ["Allflex SenseHub", "SCR HeatTime Pro", "CowManager", "Cowlar v3", "Smartbow (Zoetis)", "Custom"];
const STATUS_OPTIONS: CollarDevice["status"][] = ["Active", "Inactive", "Lost", "Maintenance"];

type DeviceForm = {
  serialNumber: string; brand: string; model: string;
  cattleId: string; assignedDate: string;
  status: CollarDevice["status"]; notes: string;
};

const emptyDevice: DeviceForm = {
  serialNumber: "", brand: "Allflex SenseHub", model: "",
  cattleId: "", assignedDate: "", status: "Active", notes: "",
};

// ── Reading form ───────────────────────────────────────────────────────────────

type ReadingForm = {
  collarId: string; cattleId: string;
  temperature: string; activityIndex: string; batteryPct: string;
  heartRate: string; ruminationMinPh: string;
  gpsLat: string; gpsLng: string;
};
const emptyReading: ReadingForm = {
  collarId: "", cattleId: "", temperature: "38.5", activityIndex: "40",
  batteryPct: "80", heartRate: "", ruminationMinPh: "", gpsLat: "", gpsLng: "",
};

// ── Tab type ───────────────────────────────────────────────────────────────────

type Tab = "monitor" | "alerts" | "devices" | "reading" | "guide";

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IotMonitoringPage() {
  const {
    cattle, collarDevices, collarReadings, heatDetectionAlerts,
    addCollarDevice, addCollarReading, addHeatDetectionAlert,
    update, remove,
  } = useData();

  const [tab, setTab] = useState<Tab>("monitor");

  // Live simulation
  const [liveMode, setLiveMode] = useState(false);
  const [liveReadings, setLiveReadings] = useState<CollarReading[]>([]);
  const [countdown, setCountdown] = useState(30);
  const [tempHistory, setTempHistory] = useState<Record<string, number[]>>({});

  // Alert acknowledgment (local state; in production this would be persisted)
  const [acked, setAcked] = useState<Set<string>>(new Set());

  // Status filter (monitor tab)
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline" | "alert">("all");

  // Alert thresholds
  const [thresholds, setThresholds] = useState(DEFAULTS);

  // Collar device CRUD
  const [deviceModal, setDeviceModal] = useState<"add" | "edit" | null>(null);
  const [editingDevice, setEditingDevice] = useState<CollarDevice | null>(null);
  const [deviceForm, setDeviceForm] = useState<DeviceForm>(emptyDevice);
  const setD = (k: keyof DeviceForm) => (v: string) => setDeviceForm(f => ({ ...f, [k]: v }));

  // Manual reading form
  const [readingForm, setReadingForm] = useState<ReadingForm>(emptyReading);
  const setR = (k: keyof ReadingForm) => (v: string) => setReadingForm(f => ({ ...f, [k]: v }));
  const [readingSaved, setReadingSaved] = useState(false);

  // ── Live simulation ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!liveMode) { setLiveReadings([]); setCountdown(30); return; }
    setLiveReadings(collarReadings.map(r => ({ ...r, lastSync: new Date().toISOString() })));
    setTempHistory(Object.fromEntries(collarReadings.map(r => [r.id, [r.temperature]])));

    let secs = 30;
    const ticker = setInterval(() => {
      secs = secs <= 0 ? 30 : secs - 1;
      setCountdown(secs);
      if (secs === 30) {
        setLiveReadings(prev => prev.map(r => {
          if (!r.isOnline) return r;
          const newTemp = parseFloat(Math.max(36.5, Math.min(41, r.temperature + (Math.random() - 0.5) * 0.4)).toFixed(1));
          const newAct = Math.max(0, Math.min(100, Math.round(r.activityIndex + (Math.random() - 0.5) * 18)));
          setTempHistory(h => ({ ...h, [r.id]: [...(h[r.id] ?? [r.temperature]).slice(-11), newTemp] }));
          return {
            ...r, temperature: newTemp, activityIndex: newAct,
            batteryPct: Math.max(0, r.batteryPct - (Math.random() < 0.12 ? 1 : 0)),
            heartRate: r.heartRate ? Math.round(Math.max(40, Math.min(120, r.heartRate + (Math.random() - 0.5) * 6))) : undefined,
            ruminationMinPh: r.ruminationMinPh ? Math.round(Math.max(0, Math.min(60, r.ruminationMinPh + (Math.random() - 0.5) * 5))) : undefined,
            lastSync: new Date().toISOString(),
          };
        }));
      }
    }, 1000);
    return () => clearInterval(ticker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode]);

  const displayReadings = liveMode && liveReadings.length > 0 ? liveReadings : collarReadings;

  // ── Enriched data ────────────────────────────────────────────────────────────

  const enriched = useMemo(() => displayReadings.map(cr => ({
    ...cr,
    animal: cattle.find(c => c.id === cr.cattleId),
    device: collarDevices.find(d => d.id === cr.collarId),
    hasTempAlert: cr.temperature > thresholds.tempHigh || cr.temperature < thresholds.tempLow,
    hasActivityAlert: cr.activityIndex >= thresholds.actHigh,
    hasBatAlert: cr.batteryPct <= thresholds.batLow,
  })), [displayReadings, cattle, collarDevices, thresholds]);

  const stats = useMemo(() => ({
    total: enriched.length,
    online: enriched.filter(r => r.isOnline).length,
    alerts: enriched.filter(r => r.hasTempAlert || r.hasActivityAlert || r.hasBatAlert).length,
    lowBat: enriched.filter(r => r.hasBatAlert).length,
  }), [enriched]);

  const filtered = useMemo(() => enriched.filter(r => {
    if (statusFilter === "online" && !r.isOnline) return false;
    if (statusFilter === "offline" && r.isOnline) return false;
    if (statusFilter === "alert" && !r.hasTempAlert && !r.hasActivityAlert && !r.hasBatAlert) return false;
    return true;
  }), [enriched, statusFilter]);

  // GPS points for map
  const gpsPoints = useMemo(() =>
    enriched.filter(r => r.gpsLat && r.gpsLng).map(r => ({
      id: r.id,
      label: r.animal?.name ?? r.cattleId,
      lat: r.gpsLat!,
      lng: r.gpsLng!,
      hasAlert: r.hasTempAlert || r.hasActivityAlert || r.hasBatAlert,
      isOnline: r.isOnline,
    })), [enriched]);

  // ── Alert log ────────────────────────────────────────────────────────────────

  const alertLog = useMemo(() => {
    const out: { id: string; animal: string; type: string; value: string; threshold: string; time: string; tone: "red" | "amber" | "blue" | "gray" }[] = [];
    enriched.forEach(r => {
      if (r.hasTempAlert)
        out.push({ id: `${r.id}-temp`, animal: r.animal?.name ?? r.cattleId, type: r.temperature > thresholds.tempHigh ? "Fever" : "Hypothermia", value: `${r.temperature.toFixed(1)} °C`, threshold: r.temperature > thresholds.tempHigh ? `> ${thresholds.tempHigh} °C` : `< ${thresholds.tempLow} °C`, time: r.lastSync, tone: r.temperature > thresholds.tempHigh ? "red" : "blue" });
      if (r.hasActivityAlert)
        out.push({ id: `${r.id}-act`, animal: r.animal?.name ?? r.cattleId, type: "High Activity — Heat Sign", value: `${r.activityIndex}/100`, threshold: `≥ ${thresholds.actHigh}`, time: r.lastSync, tone: "amber" });
      if (r.hasBatAlert)
        out.push({ id: `${r.id}-bat`, animal: r.animal?.name ?? r.cattleId, type: "Low Battery", value: `${r.batteryPct}%`, threshold: `≤ ${thresholds.batLow}%`, time: r.lastSync, tone: "amber" });
      if (!r.isOnline)
        out.push({ id: `${r.id}-off`, animal: r.animal?.name ?? r.cattleId, type: "Device Offline", value: "Offline", threshold: "—", time: r.lastSync, tone: "gray" });
    });
    return out;
  }, [enriched, thresholds]);

  const unackedAlerts = alertLog.filter(a => !acked.has(a.id));

  // ── Auto-trigger heat detection for unacked high-activity alerts ───────────

  const triggerHeatDetection = (alertId: string) => {
    const alert = alertLog.find(a => a.id === alertId && a.type === "High Activity — Heat Sign");
    if (!alert) return;
    const reading = enriched.find(r => `${r.id}-act` === alertId);
    if (!reading) return;
    const alreadyExists = heatDetectionAlerts.some(h => h.cattleId === reading.cattleId && h.source === "IoT Collar" && h.detectedAt.slice(0, 10) === reading.lastSync.slice(0, 10));
    if (!alreadyExists) {
      addHeatDetectionAlert({
        cattleId: reading.cattleId,
        detectedAt: reading.lastSync,
        confidence: Math.min(99, Math.round(50 + (reading.activityIndex - thresholds.actHigh) * 1.2)),
        source: "IoT Collar",
        activitySpike: reading.activityIndex * 2,
        temperature: reading.temperature,
        status: "Active",
        notes: `Auto-triggered by collar ${reading.collarId ?? reading.id} — activity index ${reading.activityIndex}`,
      });
    }
    setAcked(s => new Set([...s, alertId]));
  };

  // ── Device CRUD handlers ───────────────────────────────────────────────────

  const openAddDevice = () => { setDeviceForm(emptyDevice); setEditingDevice(null); setDeviceModal("add"); };
  const openEditDevice = (d: CollarDevice) => { setEditingDevice(d); setDeviceForm({ serialNumber: d.serialNumber, brand: d.brand, model: d.model ?? "", cattleId: d.cattleId ?? "", assignedDate: d.assignedDate ?? "", status: d.status, notes: d.notes ?? "" }); setDeviceModal("edit"); };

  const saveDevice = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const payload: Omit<CollarDevice, "id"> = {
      serialNumber: deviceForm.serialNumber,
      brand: deviceForm.brand,
      model: deviceForm.model || undefined,
      cattleId: deviceForm.cattleId || undefined,
      assignedDate: deviceForm.assignedDate || undefined,
      status: deviceForm.status,
      notes: deviceForm.notes || undefined,
    };
    if (deviceModal === "edit" && editingDevice) {
      update("collarDevices", editingDevice.id, payload);
    } else {
      addCollarDevice(payload);
    }
    setDeviceModal(null);
  };

  // ── Manual reading handler ─────────────────────────────────────────────────

  const saveReading = (e: React.SyntheticEvent) => {
    e.preventDefault();
    addCollarReading({
      collarId: readingForm.collarId || undefined,
      cattleId: readingForm.cattleId,
      temperature: parseFloat(readingForm.temperature),
      activityIndex: parseInt(readingForm.activityIndex),
      batteryPct: parseInt(readingForm.batteryPct),
      heartRate: readingForm.heartRate ? parseInt(readingForm.heartRate) : undefined,
      ruminationMinPh: readingForm.ruminationMinPh ? parseInt(readingForm.ruminationMinPh) : undefined,
      gpsLat: readingForm.gpsLat ? parseFloat(readingForm.gpsLat) : undefined,
      gpsLng: readingForm.gpsLng ? parseFloat(readingForm.gpsLng) : undefined,
      lastSync: new Date().toISOString(),
      isOnline: true,
    });
    setReadingSaved(true);
    setReadingForm(emptyReading);
    setTimeout(() => setReadingSaved(false), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="IoT Smart Collar Monitoring"
        description="Real-time biosensor telemetry — temperature, activity, rumination, GPS, heat detection"
      />

      {/* Live mode banner */}
      {liveMode && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-emerald-800">
            Live simulation active — next poll in <strong>{countdown}s</strong>
          </span>
          <button onClick={() => setLiveMode(false)} className="ml-auto text-xs text-emerald-700 underline hover:no-underline">
            Stop
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Collared Animals" value={String(stats.total)} iconName="wifi" tone="blue" />
        <StatCard label="Online Now" value={String(stats.online)} sublabel={`${stats.total - stats.online} offline`} iconName="wifi" tone="green" />
        <StatCard label="Active Alerts" value={String(unackedAlerts.length)} sublabel="unacknowledged" iconName="zap" tone={unackedAlerts.length > 0 ? "red" : "green"} />
        <StatCard label="Devices Registered" value={String(collarDevices.length)} sublabel={`${collarDevices.filter(d => d.status === "Active").length} active`} iconName="battery" tone="blue" />
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
          {([
            ["monitor", "Live Monitor"],
            ["alerts", `Alerts${unackedAlerts.length > 0 ? ` (${unackedAlerts.length})` : ""}`],
            ["devices", "Collar Devices"],
            ["reading", "Log Reading"],
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

        {tab === "devices" && (
          <button onClick={openAddDevice}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
            <Icon.plus width={14} height={14} /> Register Collar
          </button>
        )}
      </div>

      {/* ── TAB: LIVE MONITOR ─────────────────────────────────────────────────── */}
      {tab === "monitor" && (
        <div className="space-y-6">
          {/* GPS Mini-Map */}
          {gpsPoints.length > 0 && (
            <Card>
              <CardHeader title="Live GPS Positions" />
              <div className="p-4">
                <GpsMap readings={gpsPoints} />
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Online — normal</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Alert</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />Offline</span>
                  <span className="ml-auto">Hover a pin to see animal name</span>
                </div>
              </div>
            </Card>
          )}

          {/* Collar cards */}
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
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{r.animal?.name ?? r.cattleId}</p>
                      <p className="text-[11px] text-muted">{r.device?.serialNumber ?? r.collarId ?? r.id} · {r.device?.brand ?? "Unknown brand"}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1.5">
                      {hasAlert && <Badge tone="red">Alert</Badge>}
                      <span className={`h-2.5 w-2.5 rounded-full ${r.isOnline ? "bg-emerald-400" : "bg-slate-300"}`} title={r.isOnline ? "Online" : "Offline"} />
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted"><Icon.thermometer width={12} height={12} /> Temperature</span>
                        <div className="flex items-center gap-2">
                          {liveMode && <Sparkline values={hist} color={tt === "red" ? "#ef4444" : tt === "blue" ? "#38bdf8" : "#16a34a"} />}
                          <Badge tone={tt}>{r.temperature.toFixed(1)} °C</Badge>
                        </div>
                      </div>
                      <MiniBar pct={((r.temperature - 36) / 6) * 100} tone={tt} />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted"><Icon.activity width={12} height={12} /> Activity</span>
                        <Badge tone={at}>{r.activityIndex}/100{r.activityIndex >= thresholds.actHigh ? " ⚡" : ""}</Badge>
                      </div>
                      <MiniBar pct={r.activityIndex} tone={at} />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted"><Icon.battery width={12} height={12} /> Battery</span>
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
                    {r.isOnline ? `Synced: ${liveMode ? "just now" : r.lastSync.replace("T", " ").slice(0, 16)}`
                      : <span className="text-amber-600">Offline — last seen {r.lastSync.replace("T", " ").slice(0, 16)}</span>}
                  </div>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-3 rounded-xl border border-dashed border-line py-16 text-center text-muted">No collars match the selected filter.</div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ALERTS ──────────────────────────────────────────────────────── */}
      {tab === "alerts" && (
        <div className="space-y-6">
          {/* Threshold sliders */}
          <Card>
            <SectionHead title="Alert Thresholds" description="Adjust when readings trigger an alert — changes apply immediately" />
            <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {([
                { key: "tempHigh" as const, label: "High Temp", unit: "°C", min: 38, max: 42, step: 0.1 },
                { key: "tempLow"  as const, label: "Low Temp",  unit: "°C", min: 35, max: 39, step: 0.1 },
                { key: "actHigh"  as const, label: "High Activity", unit: "", min: 50, max: 100, step: 1 },
                { key: "batLow"   as const, label: "Low Battery", unit: "%", min: 5, max: 40, step: 1 },
              ]).map(f => (
                <div key={f.key} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">{f.label}</span>
                    <span className="font-semibold text-ink">{thresholds[f.key]}{f.unit}</span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={thresholds[f.key]}
                    onChange={e => setThresholds(t => ({ ...t, [f.key]: parseFloat(e.target.value) }))}
                    className="w-full accent-brand-600" />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>{f.min}{f.unit}</span><span>{f.max}{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-3">
              <button onClick={() => setThresholds(DEFAULTS)} className="text-xs text-brand-600 hover:underline">
                Reset to ICAR/FAO defaults
              </button>
            </div>
          </Card>

          {/* Alert table */}
          <Card className="p-0">
            <SectionHead title={`Alert Log — ${unackedAlerts.length} unacknowledged`} description="High-activity alerts can be converted to heat detection records" />
            {alertLog.length === 0 ? (
              <div className="py-16 text-center text-muted">
                <Icon.bell width={32} height={32} className="mx-auto mb-3 opacity-30" />
                <p>No alerts — all collars within thresholds</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
                      <th className="px-4 py-3 font-medium">Alert</th>
                      <th className="px-4 py-3 font-medium">Animal</th>
                      <th className="px-4 py-3 font-medium">Reading</th>
                      <th className="px-4 py-3 font-medium">Threshold</th>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {alertLog.map(a => {
                      const isAcked = acked.has(a.id);
                      const isHeat = a.type === "High Activity — Heat Sign";
                      return (
                        <tr key={a.id} className={`hover:bg-canvas/50 ${isAcked ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3"><Badge tone={a.tone}>{a.type}</Badge></td>
                          <td className="px-4 py-3 font-medium text-ink">{a.animal}</td>
                          <td className="px-4 py-3 font-mono text-ink">{a.value}</td>
                          <td className="px-4 py-3 text-muted">{a.threshold}</td>
                          <td className="px-4 py-3 text-xs text-muted">{a.time.replace("T", " ").slice(0, 16)}</td>
                          <td className="px-4 py-3">
                            {!isAcked ? (
                              <div className="flex items-center gap-2">
                                {isHeat && (
                                  <button onClick={() => triggerHeatDetection(a.id)}
                                    className="rounded bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-200">
                                    → Heat Alert
                                  </button>
                                )}
                                <button onClick={() => setAcked(s => new Set([...s, a.id]))}
                                  className="text-xs text-brand-600 hover:underline">Ack</button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted">Acknowledged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB: COLLAR DEVICES ──────────────────────────────────────────────── */}
      {tab === "devices" && (
        <Card className="p-0">
          <SectionHead title="Registered Collar Devices" description="Manage collar-to-animal assignments and device status" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Serial / Brand</th>
                  <th className="px-4 py-3 font-medium">Assigned Animal</th>
                  <th className="px-4 py-3 font-medium">Assigned Date</th>
                  <th className="px-4 py-3 font-medium">Last Reading</th>
                  <th className="px-4 py-3 font-medium">Battery</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {collarDevices.map(d => {
                  const reading = collarReadings.find(r => r.collarId === d.id);
                  const animal = cattle.find(c => c.id === d.cattleId);
                  const statusTone = d.status === "Active" ? "green" : d.status === "Maintenance" ? "amber" : d.status === "Lost" ? "red" : "gray";
                  return (
                    <tr key={d.id} className="hover:bg-canvas/50">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-ink">{d.serialNumber}</p>
                        <p className="text-xs text-muted">{d.brand}{d.model ? ` · ${d.model}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        {animal ? (
                          <div>
                            <p className="font-medium text-ink">{animal.name}</p>
                            <p className="text-xs text-muted">{animal.id}</p>
                          </div>
                        ) : <span className="text-xs text-muted">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{d.assignedDate ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {reading ? reading.lastSync.replace("T", " ").slice(0, 16) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {reading ? <Badge tone={batTone(reading.batteryPct, thresholds.batLow)}>{reading.batteryPct}%</Badge> : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3"><Badge tone={statusTone}>{d.status}</Badge></td>
                      <td className="px-4 py-3 max-w-[180px] text-xs text-muted truncate">{d.notes ?? "—"}</td>
                      <td className="px-4 py-3">
                        <RowActions
                          label={d.serialNumber}
                          onEdit={() => openEditDevice(d)}
                          onDelete={() => remove("collarDevices", d.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TAB: LOG READING ─────────────────────────────────────────────────── */}
      {tab === "reading" && (
        <div className="mx-auto max-w-2xl">
          <Card>
            <SectionHead title="Log Manual Collar Reading" description="Add a reading manually — use for offline sync, field entry, or testing" />
            {readingSaved && (
              <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Reading saved successfully and appears in Live Monitor.
              </div>
            )}
            <form onSubmit={saveReading} className="p-5">
              <FormGrid>
                <SelectField
                  label="Collar Device"
                  value={readingForm.collarId}
                  onChange={setR("collarId")}
                  placeholder="Select collar (optional)"
                  options={collarDevices.filter(d => d.status === "Active").map(d => ({ value: d.id, label: `${d.serialNumber} — ${d.brand}` }))}
                />
                <SelectField
                  label="Animal"
                  value={readingForm.cattleId}
                  onChange={setR("cattleId")}
                  required
                  placeholder="Select animal"
                  options={cattle.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))}
                />
                <NumberField label="Temperature (°C)" value={readingForm.temperature} onChange={setR("temperature")} required min={34} step={0.1} />
                <NumberField label="Activity Index (0–100)" value={readingForm.activityIndex} onChange={setR("activityIndex")} required min={0} />
                <NumberField label="Battery (%)" value={readingForm.batteryPct} onChange={setR("batteryPct")} required min={0} />
                <NumberField label="Heart Rate (bpm)" value={readingForm.heartRate} onChange={setR("heartRate")} min={30} />
                <NumberField label="Rumination (min/h)" value={readingForm.ruminationMinPh} onChange={setR("ruminationMinPh")} min={0} />
                <NumberField label="GPS Latitude" value={readingForm.gpsLat} onChange={setR("gpsLat")} step={0.0001} />
                <NumberField label="GPS Longitude" value={readingForm.gpsLng} onChange={setR("gpsLng")} step={0.0001} />
              </FormGrid>
              <FormButtons onCancel={() => setReadingForm(emptyReading)} submitLabel="Save Reading" />
            </form>
          </Card>
        </div>
      )}

      {/* ── TAB: INTEGRATION GUIDE ────────────────────────────────────────────── */}
      {tab === "guide" && (
        <div className="space-y-6">
          <Card>
            <SectionHead title="How Smart Collar Live Data Reaches HerdLine" description="End-to-end hardware-to-dashboard architecture" />
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                  {[
                    { icon: "wifi", label: "Smart Collar", sub: "BLE / LoRa / NB-IoT", color: "bg-sky-100 text-sky-700" },
                    { arrow: "→" },
                    { icon: "network", label: "Gateway", sub: "Base station / SIM", color: "bg-violet-100 text-violet-700" },
                    { arrow: "→" },
                    { icon: "link", label: "MQTT / Cloud", sub: "Manufacturer or self-hosted", color: "bg-amber-100 text-amber-700" },
                    { arrow: "→" },
                    { icon: "report", label: "HerdLine API", sub: "POST /api/collar-readings", color: "bg-brand-100 text-brand-700" },
                    { arrow: "→" },
                    { icon: "dashboard", label: "This Page", sub: "Live collar cards", color: "bg-emerald-100 text-emerald-700" },
                  ].map((s, i) => {
                    if ("arrow" in s) return <span key={i} className="text-xl text-muted">{s.arrow}</span>;
                    const Ic = Icon[s.icon as keyof typeof Icon];
                    return (
                      <div key={i} className={`flex min-w-[90px] flex-col items-center gap-1 rounded-lg px-3 py-2.5 ${s.color}`}>
                        <Ic width={18} height={18} />
                        <p className="text-xs font-semibold">{s.label}</p>
                        <p className="text-[10px] opacity-70">{s.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: "Option 1 — REST Webhook", desc: "Manufacturer cloud POSTs to your endpoint when a reading arrives. Zero polling, 30 s–5 min latency.", tone: "green" },
                  { title: "Option 2 — MQTT Subscribe", desc: "Self-host Mosquitto/HiveMQ. Collar publishes to cattle/{farmId}/{id}/telemetry. < 5 s latency.", tone: "blue" },
                  { title: "Option 3 — Scheduled Poll", desc: "Your backend calls the manufacturer REST API every 5–15 min. Easiest setup, higher latency.", tone: "amber" },
                ].map(opt => (
                  <div key={opt.title} className="rounded-lg border border-line bg-surface p-4">
                    <p className="mb-1 text-sm font-semibold text-ink">{opt.title}</p>
                    <p className="text-xs leading-relaxed text-muted">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SectionHead title="API Webhook Specification" description="POST /api/collar-readings — your collar's cloud calls this endpoint" />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                <Badge tone="green">POST</Badge>
                <code className="font-mono text-sm text-ink">/api/collar-readings</code>
                <span className="ml-auto text-xs text-muted">Bearer token auth</span>
              </div>
              <CodeBlock code={`{
  "device_id":      "COLLAR-AX-001",        // hardware serial (mapped to CollarDevice.serialNumber)
  "cattle_id":      "C-3001",               // HerdLine cattle ID
  "timestamp":      "2026-06-25T08:30:00Z",
  "temperature":    38.7,                   // °C
  "activity_index": 45,                     // 0-100
  "battery_pct":    82,
  "heart_rate":     68,                     // optional
  "rumination_min_ph": 42,                  // optional
  "gps": { "lat": -17.8252, "lng": 31.0335 }
}`} />
              <CodeBlock code={`// src/app/api/collar-readings/route.ts
import { NextRequest, NextResponse } from "next/server";

const TOKEN = process.env.COLLAR_API_KEY ?? "change-me";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== \`Bearer \${TOKEN}\`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { device_id, cattle_id, temperature, activity_index, battery_pct } = body;
  if (!device_id || !cattle_id || temperature == null)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // persist to DB, check thresholds, send alerts …
  const alerts: string[] = [];
  if (temperature > 39.5) alerts.push("Fever");
  if (activity_index >= 75) alerts.push("High Activity");
  if (battery_pct <= 15)   alerts.push("Low Battery");

  return NextResponse.json({ ok: true, alerts_triggered: alerts });
}`} />
            </div>
          </Card>

          <Card>
            <SectionHead title="MQTT Topic Structure" description="For collars with direct MQTT publish capability" />
            <div className="space-y-4 p-5">
              <CodeBlock code={`cattle/{farm_id}/{cattle_id}/telemetry   ← collar publishes
cattle/{farm_id}/{cattle_id}/alerts      ← HerdLine publishes back
cattle/{farm_id}/+/telemetry            ← subscribe all animals on farm`} />
              <CodeBlock code={`import mqtt from "mqtt";
const client = mqtt.connect("mqtt://broker.your-farm.com:1883", {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
});
client.subscribe("cattle/FARM-001/+/telemetry", { qos: 1 });
client.on("message", async (topic, payload) => {
  const [, , cattleId] = topic.split("/");
  const data = JSON.parse(payload.toString());
  await fetch("https://your-erp.com/api/collar-readings", {
    method: "POST",
    headers: { Authorization: \`Bearer \${process.env.COLLAR_API_KEY}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, cattle_id: cattleId }),
  });
});`} />
            </div>
          </Card>
        </div>
      )}

      {/* ── COLLAR DEVICE MODAL ──────────────────────────────────────────────── */}
      <Modal
        open={!!deviceModal}
        title={deviceModal === "add" ? "Register Collar Device" : "Edit Collar Device"}
        onClose={() => setDeviceModal(null)}
        size="md"
      >
        <form onSubmit={saveDevice} className="p-5">
          <FormGrid>
            <TextField label="Serial Number" value={deviceForm.serialNumber} onChange={setD("serialNumber")} required placeholder="e.g. AX-2024-013" />
            <SelectField
              label="Brand"
              value={deviceForm.brand}
              onChange={setD("brand")}
              required
              options={BRANDS}
            />
            <TextField label="Model" value={deviceForm.model} onChange={setD("model")} placeholder="e.g. SenseHub 3.0" />
            <SelectField
              label="Status"
              value={deviceForm.status}
              onChange={setD("status")}
              required
              options={STATUS_OPTIONS}
            />
            <SelectField
              label="Assign to Animal"
              value={deviceForm.cattleId}
              onChange={setD("cattleId")}
              placeholder="Unassigned (pool)"
              options={cattle.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))}
            />
            <TextField label="Assignment Date" value={deviceForm.assignedDate} onChange={setD("assignedDate")} placeholder="YYYY-MM-DD" />
          </FormGrid>
          <div className="mt-4">
            <TextAreaField label="Notes" value={deviceForm.notes} onChange={setD("notes")} placeholder="Battery status, repair notes, etc." />
          </div>
          <FormButtons onCancel={() => setDeviceModal(null)} submitLabel={deviceModal === "add" ? "Register" : "Save Changes"} />
        </form>
      </Modal>
    </div>
  );
}
