"use client";

import { useState } from "react";
import { PageHeader, StatCard, Card, CardHeader, StatusBadge, Badge, PrimaryButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, TextField, NumberField, SelectField } from "@/components/forms";
import { useData } from "@/lib/store";
import type { Pasture } from "@/lib/types";
import { number } from "@/lib/format";

const QUALITY_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];
const STATUS_OPTIONS = ["Grazing", "Resting", "Maintenance"];

const emptyForm = {
  name: "",
  areaHa: "",
  capacity: "",
  occupancy: "",
  grassQuality: "Good",
  status: "Grazing",
};

export default function PasturePage() {
  const { pastures, addPasture } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const totalArea = pastures.reduce((s, p) => s + p.areaHa, 0);
  const totalCapacity = pastures.reduce((s, p) => s + p.capacity, 0);
  const totalOccupancy = pastures.reduce((s, p) => s + p.occupancy, 0);
  const utilization = totalCapacity ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addPasture({
      name: form.name.trim(),
      areaHa: Number(form.areaHa) || 0,
      capacity: Number(form.capacity) || 0,
      occupancy: Number(form.occupancy) || 0,
      grassQuality: form.grassQuality as Pasture["grassQuality"],
      status: form.status as Pasture["status"],
    });
    setForm(emptyForm);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Pasture & Lots"
        description="Grazing rotation, stocking density and field condition."
        action={
          <PrimaryButton onClick={() => setOpen(true)}>
            <Icon.plus width={16} height={16} />
            Add Pasture
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Land" value={`${totalArea.toFixed(1)} ha`} iconName="field" tone="green" />
        <StatCard label="Capacity" value={`${number(totalCapacity)} head`} iconName="cow" tone="blue" />
        <StatCard label="Currently Grazing" value={`${number(totalOccupancy)} head`} iconName="cow" tone="purple" />
        <StatCard label="Utilization" value={`${utilization}%`} sublabel="of capacity" iconName="analytics" tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {pastures.map((p) => {
          const pct = Math.round((p.occupancy / p.capacity) * 100) || 0;
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-100 text-brand-700">
                    <Icon.field width={20} height={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{p.areaHa} ha · {p.id}</p>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Stocking</span>
                  <span className="font-medium text-ink">
                    {p.occupancy} / {p.capacity} head
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
                  <div
                    className={`h-full rounded-full ${pct > 85 ? "bg-amber-500" : "bg-brand-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs text-muted">Grass quality</span>
                <Badge
                  tone={
                    p.grassQuality === "Excellent" || p.grassQuality === "Good"
                      ? "green"
                      : p.grassQuality === "Fair"
                        ? "amber"
                        : "red"
                  }
                >
                  {p.grassQuality}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader title="Stocking Density by Field" />
        <div className="space-y-3 p-5">
          {pastures.map((p) => {
            const pct = Math.round((p.occupancy / p.capacity) * 100) || 0;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-ink">{p.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-12 text-right text-xs font-medium text-muted">{pct}%</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Pasture" description="Add a new field or lot.">
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <TextField label="Name" value={form.name} onChange={set("name")} required placeholder="e.g. North Meadow" />
            <NumberField label="Area (ha)" value={form.areaHa} onChange={set("areaHa")} required min={0} step={0.1} placeholder="e.g. 12.5" />
            <NumberField label="Capacity (head)" value={form.capacity} onChange={set("capacity")} required min={0} placeholder="e.g. 30" />
            <NumberField label="Occupancy (head)" value={form.occupancy} onChange={set("occupancy")} required min={0} placeholder="e.g. 24" />
            <SelectField label="Grass Quality" value={form.grassQuality} onChange={set("grassQuality")} options={QUALITY_OPTIONS} required />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={STATUS_OPTIONS} required />
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel="Add Pasture" />
        </form>
      </Modal>
    </>
  );
}
