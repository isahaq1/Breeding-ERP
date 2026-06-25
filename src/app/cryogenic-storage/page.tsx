"use client";

import { useMemo, useState } from "react";
import {
  PageHeader, StatCard, Card, CardHeader, Badge, PrimaryButton,
  Table, Th, Td, EmptyRow,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal, FormGrid, FormButtons, TextField, SelectField,
  TextAreaField, NumberField, DateField,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type { NitrogenTank, TankCanister, StrawStorage, TankStatus, StrawStatus } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────
function nitrogenTone(pct: number): "green" | "amber" | "red" {
  if (pct >= 60) return "green";
  if (pct >= 30) return "amber";
  return "red";
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const TANK_STATUSES: TankStatus[] = ["Active", "Maintenance", "Retired"];
const MANUFACTURERS = ["Chart MVE", "Cryotherm", "Taylor-Wharton", "Worthington Industries", "CryoScientific"];
const STRAW_STATUSES: StrawStatus[] = ["In Stock", "Dispatched", "Used", "Destroyed", "Quarantined"];

// ── Nitrogen Level Gauge ────────────────────────────────────────────────────
function NitrogenGauge({ pct }: { pct: number }) {
  const tone = nitrogenTone(pct);
  const color = tone === "green" ? "#22c55e" : tone === "amber" ? "#f59e0b" : "#ef4444";
  const label = tone === "green" ? "Good" : tone === "amber" ? "Low" : "Critical";
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Cylinder gauge */}
      <div className="relative h-16 w-8 overflow-hidden rounded-full border border-line bg-canvas">
        <div
          className="absolute bottom-0 w-full rounded-full transition-all"
          style={{ height: `${pct}%`, background: `${color}33`, borderTop: `2px solid ${color}` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink">
          {pct}%
        </span>
      </div>
      <span className={`text-[10px] font-semibold ${tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : "text-red-700"}`}>
        {label}
      </span>
    </div>
  );
}

// ── Tank utilisation ring ───────────────────────────────────────────────────
function UtilisationRing({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const r = 18, circ = 2 * Math.PI * r;
  const fill = circ - (pct / 100) * circ;
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg width={48} height={48} viewBox="0 0 48 48" className="-rotate-90">
        <circle cx={24} cy={24} r={r} fill="none" stroke="#e5e7eb" strokeWidth={5} />
        <circle cx={24} cy={24} r={r} fill="none" stroke="#3b82f6" strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[11px] font-bold text-ink">{pct}%</span>
    </div>
  );
}

// ── Empty forms ─────────────────────────────────────────────────────────────
const emptyTank = {
  name: "", serialNumber: "", manufacturer: "Chart MVE", model: "",
  capacityLiters: "47", location: "",
  purchaseDate: "", lastRefillDate: "2026-06-24", nextRefillDue: "2026-07-24",
  nitrogenLevelPct: "75", temperatureC: "-196",
  status: "Active" as TankStatus, canisterSlots: "11", notes: "",
};

const emptyCanister = {
  tankId: "", code: "", color: "Red",
  gobletCapacity: "500", bullId: "", description: "", status: "Active" as "Active" | "Empty" | "Sealed",
};

const emptyStorageLog = {
  strawId: "", tankId: "", canisterId: "", gobletPosition: "",
  storedDate: "2026-06-24", storedBy: "", movedFrom: "", reason: "",
};

// ── Main page ──────────────────────────────────────────────────────────────
export default function CryogenicStoragePage() {
  const {
    nitrogenTanks, tankCanisters, strawStorageLog, semenStraws, cattle,
    addNitrogenTank, addTankCanister, addStrawStorageLog, update, remove,
  } = useData();

  const [tab, setTab] = useState<"overview" | "tanks" | "canisters" | "log">("overview");

  const [tankModal, setTankModal] = useState<{ open: boolean; editing: NitrogenTank | null }>({ open: false, editing: null });
  const [canModal, setCanModal] = useState<{ open: boolean; editing: TankCanister | null }>({ open: false, editing: null });
  const [logModal, setLogModal] = useState<{ open: boolean; editing: StrawStorage | null }>({ open: false, editing: null });

  const [tankForm, setTankForm] = useState(emptyTank);
  const [canForm, setCanForm] = useState(emptyCanister);
  const [logForm, setLogForm] = useState(emptyStorageLog);

  const setTk = (k: keyof typeof emptyTank) => (v: string) => setTankForm(f => ({ ...f, [k]: v }));
  const setCn = (k: keyof typeof emptyCanister) => (v: string) => setCanForm(f => ({ ...f, [k]: v }));
  const setLg = (k: keyof typeof emptyStorageLog) => (v: string) => setLogForm(f => ({ ...f, [k]: v }));

  const bulls = useMemo(() => cattle.filter(c => c.class === "Bull"), [cattle]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const activeTanks = nitrogenTanks.filter(t => t.status === "Active").length;
  const totalStraws = semenStraws.filter(s => s.status === "In Stock").length;
  const lowNitrogen = nitrogenTanks.filter(t => t.nitrogenLevelPct < 30 && t.status === "Active");
  const refillsDue = nitrogenTanks.filter(t => {
    const d = daysUntil(t.nextRefillDue);
    return d <= 7 && t.status === "Active";
  }).length;

  // Canisters per tank
  function canistersForTank(tankId: string) {
    return tankCanisters.filter(c => c.tankId === tankId);
  }

  function strawsInCanister(canisterId: string) {
    return semenStraws.filter(s => s.canisterId === canisterId && s.status === "In Stock").length;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function submitTank(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<NitrogenTank, "id"> = {
      name: tankForm.name,
      serialNumber: tankForm.serialNumber,
      manufacturer: tankForm.manufacturer,
      model: tankForm.model,
      capacityLiters: Number(tankForm.capacityLiters),
      location: tankForm.location,
      purchaseDate: tankForm.purchaseDate,
      lastRefillDate: tankForm.lastRefillDate,
      nextRefillDue: tankForm.nextRefillDue,
      nitrogenLevelPct: Number(tankForm.nitrogenLevelPct),
      temperatureC: Number(tankForm.temperatureC),
      status: tankForm.status,
      canisterSlots: Number(tankForm.canisterSlots),
      notes: tankForm.notes || undefined,
    };
    if (tankModal.editing) update("nitrogenTanks", tankModal.editing.id, payload);
    else addNitrogenTank(payload);
    setTankModal({ open: false, editing: null });
    setTankForm(emptyTank);
  }

  function submitCanister(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<TankCanister, "id"> = {
      tankId: canForm.tankId,
      code: canForm.code,
      color: canForm.color,
      gobletCapacity: Number(canForm.gobletCapacity),
      bullId: canForm.bullId || undefined,
      description: canForm.description,
      currentStrawCount: 0,
      status: canForm.status,
    };
    if (canModal.editing) update("tankCanisters", canModal.editing.id, payload);
    else addTankCanister(payload);
    setCanModal({ open: false, editing: null });
    setCanForm(emptyCanister);
  }

  function submitLog(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<StrawStorage, "id"> = {
      strawId: logForm.strawId,
      tankId: logForm.tankId,
      canisterId: logForm.canisterId,
      gobletPosition: logForm.gobletPosition,
      storedDate: logForm.storedDate,
      storedBy: logForm.storedBy,
      movedFrom: logForm.movedFrom || undefined,
      reason: logForm.reason || undefined,
    };
    if (logModal.editing) update("strawStorageLog", logModal.editing.id, payload);
    else addStrawStorageLog(payload);
    setLogModal({ open: false, editing: null });
    setLogForm(emptyStorageLog);
  }

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "tanks", label: "Nitrogen Tanks" },
    { key: "canisters", label: "Canisters" },
    { key: "log", label: "Storage Log" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Cryogenic Storage"
        description="Nitrogen tank management, canister organisation, and straw location tracking with smart monitoring."
        action={
          tab !== "overview" ? (
            <PrimaryButton onClick={() => {
              if (tab === "tanks") { setTankForm(emptyTank); setTankModal({ open: true, editing: null }); }
              else if (tab === "canisters") { setCanForm(emptyCanister); setCanModal({ open: true, editing: null }); }
              else { setLogForm(emptyStorageLog); setLogModal({ open: true, editing: null }); }
            }}>
              <Icon.plus width={16} height={16} />
              Add {tab === "tanks" ? "Tank" : tab === "canisters" ? "Canister" : "Log Entry"}
            </PrimaryButton>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active Tanks" value={String(activeTanks)} sublabel={`${nitrogenTanks.length} total`} iconName="thermometer" tone="blue" />
        <StatCard label="Straws In Stock" value={String(totalStraws)} sublabel={`${semenStraws.length} total`} iconName="vial" tone="green" />
        <StatCard label="Low N₂ Tanks" value={String(lowNitrogen.length)} sublabel="below 30% — critical" iconName="zap" tone={lowNitrogen.length > 0 ? "amber" : "green"} />
        <StatCard label="Refills Due (7d)" value={String(refillsDue)} sublabel="within 7 days" iconName="bell" tone={refillsDue > 0 ? "amber" : "green"} />
      </div>

      {/* Smart alerts */}
      {lowNitrogen.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>🔴 Critical:</strong>{" "}
          {lowNitrogen.map(t => t.name).join(", ")} {lowNitrogen.length === 1 ? "has" : "have"} nitrogen below 30%.
          Straws at risk — refill immediately.
        </div>
      )}
      {nitrogenTanks.filter(t => t.nitrogenLevelPct < 50 && t.nitrogenLevelPct >= 30 && t.status === "Active").length > 0 && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>⚡ Warning:</strong>{" "}
          {nitrogenTanks.filter(t => t.nitrogenLevelPct < 50 && t.nitrogenLevelPct >= 30 && t.status === "Active").map(t => t.name).join(", ")} below 50% — schedule refill soon.
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-xl border border-line bg-canvas p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {nitrogenTanks.map(tank => {
            const cans = canistersForTank(tank.id);
            const strawsInTank = semenStraws.filter(s => s.tankId === tank.id && s.status === "In Stock").length;
            const refillDays = daysUntil(tank.nextRefillDue);
            const tone = nitrogenTone(tank.nitrogenLevelPct);

            return (
              <Card key={tank.id} className={`p-5 space-y-4 ${tone === "red" ? "border-red-300" : tone === "amber" ? "border-amber-300" : ""}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">{tank.name}</p>
                    <p className="text-xs text-muted">{tank.manufacturer} {tank.model}</p>
                    <p className="mt-0.5 text-xs text-muted">{tank.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <NitrogenGauge pct={tank.nitrogenLevelPct} />
                    <Badge tone={tank.status === "Active" ? "green" : tank.status === "Maintenance" ? "amber" : "gray"}>
                      {tank.status}
                    </Badge>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-canvas p-2 text-center">
                    <p className="text-lg font-bold text-ink">{strawsInTank}</p>
                    <p className="text-[11px] text-muted">Straws</p>
                  </div>
                  <div className="rounded-lg bg-canvas p-2 text-center">
                    <p className="text-lg font-bold text-ink">{cans.filter(c => c.status !== "Empty").length}</p>
                    <p className="text-[11px] text-muted">Canisters</p>
                  </div>
                  <div className="rounded-lg bg-canvas p-2 text-center">
                    <p className={`text-lg font-bold ${refillDays <= 7 ? "text-red-700" : refillDays <= 14 ? "text-amber-700" : "text-green-700"}`}>
                      {refillDays}d
                    </p>
                    <p className="text-[11px] text-muted">To Refill</p>
                  </div>
                </div>

                {/* Temperature */}
                <div className="flex items-center justify-between text-xs text-muted border-t border-line pt-3">
                  <div className="flex items-center gap-1.5">
                    <Icon.thermometer width={13} height={13} />
                    <span>{tank.temperatureC}°C</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon.history width={13} height={13} />
                    <span>Refilled {formatDate(tank.lastRefillDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px]">S/N: {tank.serialNumber}</span>
                  </div>
                </div>

                {/* Canister strip */}
                {cans.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
                    {cans.map(c => (
                      <div key={c.id} title={c.description}
                        className="flex items-center gap-1 rounded-full border border-line bg-canvas px-2 py-0.5 text-[11px] text-muted">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color.toLowerCase() }} />
                        {c.code} · {strawsInCanister(c.id)}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setTankForm({
                      name: tank.name, serialNumber: tank.serialNumber, manufacturer: tank.manufacturer,
                      model: tank.model, capacityLiters: String(tank.capacityLiters), location: tank.location,
                      purchaseDate: tank.purchaseDate, lastRefillDate: tank.lastRefillDate,
                      nextRefillDue: tank.nextRefillDue, nitrogenLevelPct: String(tank.nitrogenLevelPct),
                      temperatureC: String(tank.temperatureC), status: tank.status,
                      canisterSlots: String(tank.canisterSlots), notes: tank.notes ?? "",
                    });
                    setTankModal({ open: true, editing: tank });
                  }}
                  className="w-full rounded-lg border border-line py-1.5 text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
                >
                  Edit Tank
                </button>
              </Card>
            );
          })}

          {/* Add tank card */}
          <button
            type="button"
            onClick={() => { setTankForm(emptyTank); setTankModal({ open: true, editing: null }); }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 py-10 text-sm font-medium text-brand-600 hover:border-brand-500 hover:bg-brand-50"
          >
            <Icon.plus width={20} height={20} />
            Add Nitrogen Tank
          </button>
        </div>
      )}

      {/* ── TANKS TABLE TAB ─────────────────────────────────────────────── */}
      {tab === "tanks" && (
        <Card className="mt-4">
          <CardHeader title="Nitrogen Tank Registry" />
          <Table>
            <thead>
              <tr>
                <Th>Tank</Th>
                <Th>Model</Th>
                <Th>Location</Th>
                <Th>Capacity</Th>
                <Th>N₂ Level</Th>
                <Th>Temp</Th>
                <Th>Last Refill</Th>
                <Th>Next Refill</Th>
                <Th>Straws</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {nitrogenTanks.length === 0 && <EmptyRow colSpan={11} label="No tanks registered." />}
              {nitrogenTanks.map(t => {
                const straws = semenStraws.filter(s => s.tankId === t.id && s.status === "In Stock").length;
                const refillDays = daysUntil(t.nextRefillDue);
                return (
                  <tr key={t.id} className={`transition hover:bg-canvas/60 ${t.nitrogenLevelPct < 30 ? "bg-red-50/30" : ""}`}>
                    <Td>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted">{t.id} · S/N: {t.serialNumber}</p>
                    </Td>
                    <Td className="text-xs text-muted">{t.manufacturer} {t.model}</Td>
                    <Td className="text-xs text-muted">{t.location}</Td>
                    <Td className="text-sm">{t.capacityLiters}L</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas">
                          <div className={`h-full rounded-full ${nitrogenTone(t.nitrogenLevelPct) === "green" ? "bg-green-500" : nitrogenTone(t.nitrogenLevelPct) === "amber" ? "bg-amber-400" : "bg-red-500"}`}
                            style={{ width: `${t.nitrogenLevelPct}%` }} />
                        </div>
                        <span className="text-xs font-medium">{t.nitrogenLevelPct}%</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">{t.temperatureC}°C</Td>
                    <Td className="text-xs text-muted">{formatDate(t.lastRefillDate)}</Td>
                    <Td>
                      <span className={`text-xs font-medium ${refillDays <= 7 ? "text-red-700" : refillDays <= 14 ? "text-amber-700" : "text-muted"}`}>
                        {formatDate(t.nextRefillDue)} ({refillDays}d)
                      </span>
                    </Td>
                    <Td className="font-semibold">{straws}</Td>
                    <Td><Badge tone={t.status === "Active" ? "green" : t.status === "Maintenance" ? "amber" : "gray"}>{t.status}</Badge></Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => {
                          setTankForm({
                            name: t.name, serialNumber: t.serialNumber, manufacturer: t.manufacturer,
                            model: t.model, capacityLiters: String(t.capacityLiters), location: t.location,
                            purchaseDate: t.purchaseDate, lastRefillDate: t.lastRefillDate,
                            nextRefillDue: t.nextRefillDue, nitrogenLevelPct: String(t.nitrogenLevelPct),
                            temperatureC: String(t.temperatureC), status: t.status,
                            canisterSlots: String(t.canisterSlots), notes: t.notes ?? "",
                          });
                          setTankModal({ open: true, editing: t });
                        }} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                        <button onClick={() => remove("nitrogenTanks", t.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── CANISTERS TAB ───────────────────────────────────────────────── */}
      {tab === "canisters" && (
        <Card className="mt-4">
          <CardHeader title="Tank Canisters" />
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Tank</Th>
                <Th>Color</Th>
                <Th>Dedicated Bull</Th>
                <Th>Contents</Th>
                <Th>Capacity</Th>
                <Th>In Stock</Th>
                <Th>Utilisation</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {tankCanisters.length === 0 && <EmptyRow colSpan={10} label="No canisters registered." />}
              {tankCanisters.map(c => {
                const tank = nitrogenTanks.find(t => t.id === c.tankId);
                const bull = c.bullId ? bulls.find(b => b.id === c.bullId) : null;
                const inStock = strawsInCanister(c.id);
                const pct = c.gobletCapacity > 0 ? Math.min(100, Math.round((inStock / c.gobletCapacity) * 100)) : 0;
                return (
                  <tr key={c.id} className="transition hover:bg-canvas/60">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border border-line" style={{ background: c.color.toLowerCase() }} />
                        <span className="font-semibold">{c.code}</span>
                      </div>
                    </Td>
                    <Td className="text-sm text-muted">{tank?.name ?? c.tankId}</Td>
                    <Td className="text-sm">{c.color}</Td>
                    <Td className="text-sm">{bull ? `${bull.name} (${bull.id})` : <span className="text-muted">Shared</span>}</Td>
                    <Td className="text-xs text-muted max-w-[180px] whitespace-normal">{c.description}</Td>
                    <Td className="text-sm">{c.gobletCapacity}</Td>
                    <Td className="font-semibold">{inStock}</Td>
                    <Td>
                      <UtilisationRing used={inStock} total={c.gobletCapacity} />
                    </Td>
                    <Td>
                      <Badge tone={c.status === "Active" ? "green" : c.status === "Sealed" ? "amber" : "gray"}>
                        {c.status}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => {
                          setCanForm({
                            tankId: c.tankId, code: c.code, color: c.color,
                            gobletCapacity: String(c.gobletCapacity), bullId: c.bullId ?? "",
                            description: c.description, status: c.status,
                          });
                          setCanModal({ open: true, editing: c });
                        }} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                        <button onClick={() => remove("tankCanisters", c.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── STORAGE LOG TAB ─────────────────────────────────────────────── */}
      {tab === "log" && (
        <Card className="mt-4">
          <CardHeader title="Straw Storage Log" action={<span className="text-xs text-muted">Tracks straw placement & movements</span>} />
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Straw</Th>
                <Th>Tank</Th>
                <Th>Canister</Th>
                <Th>Goblet Position</Th>
                <Th>Stored Date</Th>
                <Th>Stored By</Th>
                <Th>Moved From</Th>
                <Th>Reason</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {strawStorageLog.length === 0 && <EmptyRow colSpan={10} label="No storage log entries yet." />}
              {strawStorageLog.map(l => {
                const tank = nitrogenTanks.find(t => t.id === l.tankId);
                const can = tankCanisters.find(c => c.id === l.canisterId);
                return (
                  <tr key={l.id} className="transition hover:bg-canvas/60">
                    <Td className="font-mono text-xs text-muted">{l.id}</Td>
                    <Td className="font-mono text-xs">{l.strawId}</Td>
                    <Td className="text-sm text-muted">{tank?.name ?? l.tankId}</Td>
                    <Td className="text-sm">{can?.code ?? l.canisterId}</Td>
                    <Td className="font-mono text-xs">{l.gobletPosition}</Td>
                    <Td className="text-sm text-muted">{formatDate(l.storedDate)}</Td>
                    <Td className="text-sm text-muted">{l.storedBy}</Td>
                    <Td className="text-xs text-muted">{l.movedFrom ?? "—"}</Td>
                    <Td className="text-xs text-muted max-w-[180px] whitespace-normal">{l.reason ?? "—"}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => remove("strawStorageLog", l.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}

      {/* Tank Modal */}
      <Modal
        key={tankModal.editing?.id ?? "new-tank"}
        open={tankModal.open}
        onClose={() => setTankModal({ open: false, editing: null })}
        title={tankModal.editing ? `Edit: ${tankModal.editing.name}` : "Add Nitrogen Tank"}
        size="lg"
      >
        <form onSubmit={submitTank} className="space-y-4 p-5">
          <FormGrid>
            <TextField label="Tank Name" value={tankForm.name} onChange={setTk("name")} required placeholder="Tank Alpha" />
            <TextField label="Serial Number" value={tankForm.serialNumber} onChange={setTk("serialNumber")} required placeholder="MVE-2022-ZW-0041" />
            <SelectField label="Manufacturer" value={tankForm.manufacturer} onChange={setTk("manufacturer")} options={MANUFACTURERS} required />
            <TextField label="Model" value={tankForm.model} onChange={setTk("model")} required placeholder="XC 47/11-6" />
            <NumberField label="Capacity (Liters)" value={tankForm.capacityLiters} onChange={setTk("capacityLiters")} required min={1} />
            <NumberField label="Canister Slots" value={tankForm.canisterSlots} onChange={setTk("canisterSlots")} required min={1} />
            <TextField label="Location" value={tankForm.location} onChange={setTk("location")} required placeholder="Storage Room A" />
            <SelectField label="Status" value={tankForm.status} onChange={setTk("status")} options={[...TANK_STATUSES]} required />
          </FormGrid>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Nitrogen Status</p>
            <FormGrid>
              <NumberField label="N₂ Level %" value={tankForm.nitrogenLevelPct} onChange={setTk("nitrogenLevelPct")} required min={0} max={100} />
              <NumberField label="Temperature (°C)" value={tankForm.temperatureC} onChange={setTk("temperatureC")} required placeholder="-196" />
              <DateField label="Last Refill Date" value={tankForm.lastRefillDate} onChange={setTk("lastRefillDate")} required />
              <DateField label="Next Refill Due" value={tankForm.nextRefillDue} onChange={setTk("nextRefillDue")} required />
              <DateField label="Purchase Date" value={tankForm.purchaseDate} onChange={setTk("purchaseDate")} />
            </FormGrid>
          </div>
          <TextAreaField label="Notes" value={tankForm.notes} onChange={setTk("notes")} />
          <FormButtons onCancel={() => setTankModal({ open: false, editing: null })} submitLabel="Save Tank" />
        </form>
      </Modal>

      {/* Canister Modal */}
      <Modal
        key={canModal.editing?.id ?? "new-canister"}
        open={canModal.open}
        onClose={() => setCanModal({ open: false, editing: null })}
        title={canModal.editing ? `Edit: ${canModal.editing.code}` : "Add Canister"}
      >
        <form onSubmit={submitCanister} className="space-y-4 p-5">
          <SelectField label="Tank" value={canForm.tankId} onChange={setCn("tankId")}
            options={nitrogenTanks.map(t => ({ value: t.id, label: t.name }))} required placeholder="— Select tank —" />
          <FormGrid>
            <TextField label="Canister Code" value={canForm.code} onChange={setCn("code")} required placeholder="CAN-A1" />
            <SelectField label="Color" value={canForm.color} onChange={setCn("color")}
              options={["Red", "Blue", "Green", "Yellow", "White", "Orange", "Purple", "Black"]} required />
            <NumberField label="Goblet Capacity" value={canForm.gobletCapacity} onChange={setCn("gobletCapacity")} required min={1} />
            <SelectField label="Status" value={canForm.status} onChange={setCn("status")} options={["Active", "Empty", "Sealed"]} required />
          </FormGrid>
          <SelectField label="Dedicated Bull (optional)" value={canForm.bullId} onChange={setCn("bullId")}
            options={bulls.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))} placeholder="— Shared canister —" />
          <TextField label="Description" value={canForm.description} onChange={setCn("description")} required placeholder="Contents description" />
          <FormButtons onCancel={() => setCanModal({ open: false, editing: null })} submitLabel="Save Canister" />
        </form>
      </Modal>

      {/* Storage Log Modal */}
      <Modal
        key={logModal.editing?.id ?? "new-log"}
        open={logModal.open}
        onClose={() => setLogModal({ open: false, editing: null })}
        title={logModal.editing ? "Edit Log Entry" : "Add Storage Log Entry"}
      >
        <form onSubmit={submitLog} className="space-y-4 p-5">
          <SelectField label="Straw" value={logForm.strawId} onChange={setLg("strawId")}
            options={semenStraws.map(s => ({ value: s.id, label: `${s.serialNumber} (${s.id})` }))}
            required placeholder="— Select straw —" />
          <FormGrid>
            <SelectField label="Tank" value={logForm.tankId} onChange={setLg("tankId")}
              options={nitrogenTanks.map(t => ({ value: t.id, label: t.name }))} required placeholder="— Select tank —" />
            <SelectField label="Canister" value={logForm.canisterId} onChange={setLg("canisterId")}
              options={tankCanisters.filter(c => !logForm.tankId || c.tankId === logForm.tankId).map(c => ({ value: c.id, label: c.code }))}
              required placeholder="— Select canister —" />
            <TextField label="Goblet Position" value={logForm.gobletPosition} onChange={setLg("gobletPosition")} required placeholder="G1-R2" />
            <DateField label="Stored Date" value={logForm.storedDate} onChange={setLg("storedDate")} required />
            <TextField label="Stored By" value={logForm.storedBy} onChange={setLg("storedBy")} required placeholder="Technician name" />
            <TextField label="Moved From (optional)" value={logForm.movedFrom} onChange={setLg("movedFrom")} placeholder="Previous location" />
          </FormGrid>
          <TextAreaField label="Reason / Notes" value={logForm.reason} onChange={setLg("reason")} placeholder="Reason for storage/movement…" />
          <FormButtons onCancel={() => setLogModal({ open: false, editing: null })} submitLabel="Save Log" />
        </form>
      </Modal>
    </>
  );
}
