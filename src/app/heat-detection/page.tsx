"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  StatCard,
  Table,
  Th,
  Td,
  EmptyRow,
  Badge,
  PrimaryButton,
} from "@/components/ui";
import {
  Modal,
  FormGrid,
  FormButtons,
  SelectField,
  DateField,
  NumberField,
  TextAreaField,
} from "@/components/forms";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import type { HeatAlertStatus, HeatDetectionSource } from "@/lib/types";

function confidenceTone(n: number) {
  if (n >= 85) return "red";
  if (n >= 65) return "amber";
  return "blue";
}

function statusTone(s: HeatAlertStatus) {
  if (s === "Active") return "red";
  if (s === "Confirmed") return "amber";
  if (s === "Bred") return "green";
  if (s === "False Alarm" || s === "Dismissed") return "gray";
  return "gray";
}

const emptyForm = {
  cattleId: "",
  detectedAt: "",
  confidence: "",
  source: "IoT Collar" as HeatDetectionSource,
  activitySpike: "",
  temperature: "",
  notes: "",
};

export default function HeatDetectionPage() {
  const { cattle, heatDetectionAlerts, addHeatDetectionAlert, update, remove } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const [statusFilter, setStatusFilter] = useState<HeatAlertStatus | "">("");

  const cows = useMemo(() => cattle.filter(c => ["Cow", "Heifer"].includes(c.class)), [cattle]);

  const rows = useMemo(() => {
    const sorted = [...heatDetectionAlerts].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
    return statusFilter ? sorted.filter(r => r.status === statusFilter) : sorted;
  }, [heatDetectionAlerts, statusFilter]);

  const stats = useMemo(() => ({
    active: heatDetectionAlerts.filter(r => r.status === "Active").length,
    confirmed: heatDetectionAlerts.filter(r => r.status === "Confirmed").length,
    bred: heatDetectionAlerts.filter(r => r.status === "Bred").length,
    false: heatDetectionAlerts.filter(r => r.status === "False Alarm" || r.status === "Dismissed").length,
  }), [heatDetectionAlerts]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addHeatDetectionAlert({
      cattleId: form.cattleId,
      detectedAt: form.detectedAt + ":00",
      confidence: Number(form.confidence),
      source: form.source,
      activitySpike: form.activitySpike ? Number(form.activitySpike) : undefined,
      temperature: form.temperature ? Number(form.temperature) : undefined,
      status: "Active",
      notes: form.notes || undefined,
    });
    setOpen(false);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Heat Detection Alerts" description="Estrus detection from IoT collars, pedometers, and visual observation" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active Alerts" value={String(stats.active)} sublabel="needs attention" iconName="flame" tone={stats.active > 0 ? "red" : "green"} />
        <StatCard label="Confirmed" value={String(stats.confirmed)} sublabel="awaiting breeding" iconName="zap" tone="amber" />
        <StatCard label="Bred This Period" value={String(stats.bred)} sublabel="heat → insemination" iconName="heart" tone="green" />
        <StatCard label="False / Dismissed" value={String(stats.false)} iconName="activity" tone="gray" />
      </div>

      {/* Filter + action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {(["", "Active", "Confirmed", "Bred", "False Alarm", "Dismissed"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${statusFilter === s ? "bg-brand-600 text-white" : "text-muted hover:bg-canvas"}`}>
              {s === "" ? "All" : s}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={() => { setForm(emptyForm); setOpen(true); }}>
          <Icon.plus width={16} height={16} /> Log Alert
        </PrimaryButton>
      </div>

      {/* Heat alert explainer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
        <p className="text-sm font-medium text-amber-800">How heat detection works</p>
        <p className="mt-0.5 text-xs text-amber-700">
          IoT collar sensors detect activity spikes ≥ 150% above the 24h baseline, combined with a slight temperature
          rise (38.5–39.5 °C), to predict estrus with 85%+ confidence. Confirmed alerts should be inseminated within
          8–16 hours for optimal conception rates.
        </p>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Animal</Th>
              <Th>Detected At</Th>
              <Th>Confidence</Th>
              <Th>Source</Th>
              <Th>Activity Spike</Th>
              <Th>Temp °C</Th>
              <Th>Status</Th>
              <Th>Notes</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={9} label="No heat detection alerts recorded." />}
            {rows.map(r => {
              const animal = cattle.find(c => c.id === r.cattleId);
              return (
                <tr key={r.id} className="hover:bg-canvas/60 transition">
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{animal?.name ?? r.cattleId}</span>
                      <span className="font-mono text-[10px] text-muted">{r.cattleId}</span>
                    </div>
                  </Td>
                  <Td className="text-muted text-sm">{r.detectedAt.replace("T", " ").slice(0, 16)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas">
                        <div className={`h-full rounded-full ${r.confidence >= 85 ? "bg-red-500" : r.confidence >= 65 ? "bg-amber-400" : "bg-sky-400"}`}
                          style={{ width: `${r.confidence}%` }} />
                      </div>
                      <Badge tone={confidenceTone(r.confidence)}>{r.confidence}%</Badge>
                    </div>
                  </Td>
                  <Td className="text-sm">{r.source}</Td>
                  <Td className="font-mono text-sm">{r.activitySpike != null ? `+${r.activitySpike}%` : "—"}</Td>
                  <Td className="font-mono text-sm">
                    {r.temperature != null
                      ? <Badge tone={r.temperature > 39.5 ? "red" : "green"}>{r.temperature.toFixed(1)}</Badge>
                      : "—"}
                  </Td>
                  <Td><Badge tone={statusTone(r.status)}>{r.status}</Badge></Td>
                  <Td className="max-w-[160px] truncate text-xs text-muted">{r.notes ?? "—"}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "Active" && (
                        <button onClick={() => update("heatDetectionAlerts", r.id, { status: "Confirmed" })}
                          className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50">Confirm</button>
                      )}
                      {r.status === "Confirmed" && (
                        <button onClick={() => update("heatDetectionAlerts", r.id, { status: "Bred" })}
                          className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">Mark Bred</button>
                      )}
                      {(r.status === "Active" || r.status === "Confirmed") && (
                        <button onClick={() => update("heatDetectionAlerts", r.id, { status: "Dismissed" })}
                          className="rounded px-2 py-1 text-xs font-medium text-muted hover:bg-canvas">Dismiss</button>
                      )}
                      <button onClick={() => remove("heatDetectionAlerts", r.id)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-50">
                        <Icon.trash width={14} height={14} />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Heat Detection Alert"
        description="Record a manually observed or sensor-triggered heat alert.">
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Animal" value={form.cattleId} onChange={set("cattleId")}
              options={cows.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))} placeholder="Select cow/heifer" required />
            <DateField label="Detected At (date)" value={form.detectedAt.slice(0, 10)} onChange={v => set("detectedAt")(v + "T00:00")} required />
            <NumberField label="Confidence %" value={form.confidence} onChange={set("confidence")} min={0} step={1} required />
            <SelectField label="Detection Source" value={form.source} onChange={set("source") as (v: string) => void}
              options={["IoT Collar", "Pedometer", "Visual Observation", "Manual Entry"]} />
            <NumberField label="Activity Spike %" value={form.activitySpike} onChange={set("activitySpike")} step={1} />
            <NumberField label="Temperature °C" value={form.temperature} onChange={set("temperature")} step={0.1} />
            <div className="col-span-2">
              <TextAreaField label="Notes" value={form.notes} onChange={set("notes")} rows={2} />
            </div>
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel="Log Alert" />
        </form>
      </Modal>
    </div>
  );
}
