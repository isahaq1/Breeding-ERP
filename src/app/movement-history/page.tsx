"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  StatCard,
  Badge,
  PrimaryButton,
} from "@/components/ui";
import {
  Modal,
  FormGrid,
  FormButtons,
  SelectField,
  DateField,
  TextField,
  TextAreaField,
} from "@/components/forms";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import type { MovementEventType } from "@/lib/types";

const EVENT_COLOURS: Record<MovementEventType, string> = {
  "Farm Transfer":      "bg-purple-500",
  "Pasture Move":       "bg-brand-500",
  "Sale Transfer":      "bg-slate-500",
  "Quarantine Entry":   "bg-red-500",
  "Quarantine Release": "bg-green-500",
  "Vet Visit":          "bg-sky-500",
  "AI Visit":           "bg-amber-500",
  "GPS Ping":           "bg-slate-300",
};

const EVENT_TONES: Record<MovementEventType, "green"|"amber"|"red"|"blue"|"gray"|"purple"> = {
  "Farm Transfer":      "purple",
  "Pasture Move":       "green",
  "Sale Transfer":      "gray",
  "Quarantine Entry":   "red",
  "Quarantine Release": "green",
  "Vet Visit":          "blue",
  "AI Visit":           "amber",
  "GPS Ping":           "gray",
};

const EVENT_TYPES: MovementEventType[] = [
  "Farm Transfer","Pasture Move","Sale Transfer","Quarantine Entry",
  "Quarantine Release","Vet Visit","AI Visit","GPS Ping",
];

const emptyForm = {
  cattleId: "",
  timestamp: "",
  eventType: "Pasture Move" as MovementEventType,
  fromLocation: "",
  toLocation: "",
  recordedBy: "",
  notes: "",
};

export default function MovementHistoryPage() {
  const { cattle, movementRecords, addMovementRecord, remove } = useData();
  const [cattleFilter, setCattleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementEventType | "">("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const rows = useMemo(() => {
    let list = [...movementRecords].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (cattleFilter) list = list.filter(r => r.cattleId === cattleFilter);
    if (typeFilter) list = list.filter(r => r.eventType === typeFilter);
    return list;
  }, [movementRecords, cattleFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: movementRecords.length,
    transfers: movementRecords.filter(r => r.eventType === "Farm Transfer").length,
    quarantine: movementRecords.filter(r => r.eventType === "Quarantine Entry").length,
    today: movementRecords.filter(r => r.timestamp.startsWith("2026-06-22") || r.timestamp.startsWith("2026-06-23")).length,
  }), [movementRecords]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addMovementRecord({
      cattleId: form.cattleId,
      timestamp: form.timestamp + ":00",
      eventType: form.eventType,
      fromLocation: form.fromLocation,
      toLocation: form.toLocation,
      recordedBy: form.recordedBy,
      notes: form.notes || undefined,
    });
    setOpen(false);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Animal Movement History" description="Complete location audit trail — pasture moves, farm transfers, vet visits, and GPS pings" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Events" value={String(stats.total)} iconName="history" tone="blue" />
        <StatCard label="Farm Transfers" value={String(stats.transfers)} iconName="farm" tone="purple" />
        <StatCard label="Quarantine Entries" value={String(stats.quarantine)} iconName="shield" tone="red" />
        <StatCard label="Recent (48h)" value={String(stats.today)} iconName="activity" tone="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={cattleFilter} onChange={e => setCattleFilter(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
          <option value="">All Animals</option>
          {cattle.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as MovementEventType | "")}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
          <option value="">All Event Types</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs text-muted">{rows.length} event{rows.length !== 1 ? "s" : ""}</span>
        <PrimaryButton onClick={() => { setForm(emptyForm); setOpen(true); }}>
          <Icon.plus width={16} height={16} /> Log Movement
        </PrimaryButton>
      </div>

      {/* Timeline */}
      <Card className="overflow-hidden">
        {rows.length === 0 && (
          <div className="py-16 text-center text-muted">No movement records match the selected filter.</div>
        )}
        <div className="divide-y divide-line">
          {rows.map((r, i) => {
            const animal = cattle.find(c => c.id === r.cattleId);
            const dot = EVENT_COLOURS[r.eventType] ?? "bg-slate-300";
            const tone = EVENT_TONES[r.eventType] ?? "gray";
            return (
              <div key={r.id} className="group flex gap-4 px-5 py-4 hover:bg-canvas/50 transition">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${dot}`} />
                  {i < rows.length - 1 && <div className="mt-1 w-px flex-1 bg-line" />}
                </div>

                {/* Content */}
                <div className="flex-1 pb-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone}>{r.eventType}</Badge>
                    <span className="font-medium text-sm text-ink">
                      {animal?.name ?? r.cattleId}
                      <span className="ml-1 font-mono text-[10px] text-muted">{r.cattleId}</span>
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted shrink-0">
                      {r.timestamp.replace("T", " ").slice(0, 16)}
                    </span>
                  </div>

                  {/* From → To */}
                  <div className="mt-1.5 flex items-center gap-2 text-sm">
                    <span className="rounded bg-canvas px-2 py-0.5 text-xs text-muted">{r.fromLocation}</span>
                    <Icon.arrowDown width={12} height={12} className="rotate-[-90deg] text-muted" />
                    <span className="rounded bg-canvas px-2 py-0.5 text-xs font-medium text-ink">{r.toLocation}</span>
                  </div>

                  {/* Meta */}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>Recorded by: <span className="text-ink">{r.recordedBy}</span></span>
                    {r.lat && <span className="font-mono">{r.lat.toFixed(4)}, {r.lng?.toFixed(4)}</span>}
                    {r.notes && <span className="italic">{r.notes}</span>}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => remove("movementRecords", r.id)}
                  className="hidden group-hover:flex h-7 w-7 shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50">
                  <Icon.trash width={13} height={13} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Movement Event"
        description="Record a location or status change for an animal.">
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Animal" value={form.cattleId} onChange={set("cattleId")}
              options={cattle.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))} placeholder="Select animal" required />
            <DateField label="Date" value={form.timestamp.slice(0, 10)} onChange={v => set("timestamp")(v + "T00:00")} required />
            <SelectField label="Event Type" value={form.eventType} onChange={set("eventType") as (v: string) => void}
              options={EVENT_TYPES} />
            <TextField label="From Location" value={form.fromLocation} onChange={set("fromLocation")} required placeholder="e.g. North Meadow" />
            <TextField label="To Location" value={form.toLocation} onChange={set("toLocation")} required placeholder="e.g. South Range" />
            <TextField label="Recorded By" value={form.recordedBy} onChange={set("recordedBy")} required />
            <div className="col-span-2">
              <TextAreaField label="Notes" value={form.notes} onChange={set("notes")} rows={2} />
            </div>
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel="Log Movement" />
        </form>
      </Modal>
    </div>
  );
}
