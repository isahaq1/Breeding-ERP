"use client";

import { useState } from "react";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, StatusBadge, Badge, PrimaryButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, TextField, DateField, SelectField, NumberField, TextAreaField, RowActions } from "@/components/forms";
import { useData } from "@/lib/store";
import type { HealthRecord } from "@/lib/types";
import { formatDate, currency } from "@/lib/format";

const TYPE_OPTIONS = ["Illness", "Injury", "Treatment", "Checkup", "Deworming", "Surgery"];
const STATUS_OPTIONS = ["Resolved", "Ongoing", "Monitoring"];

const emptyForm = {
  cattleId: "",
  type: "Checkup",
  diagnosis: "",
  treatment: "",
  date: "2026-06-07",
  vet: "",
  status: "Ongoing",
  costUsd: "",
};

export default function HealthRecordsPage() {
  const { healthRecords, cattle, cattleLabel, addHealth, update, remove } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const ongoing = healthRecords.filter((h) => h.status === "Ongoing").length;
  const monitoring = healthRecords.filter((h) => h.status === "Monitoring").length;
  const underTreatment = cattle.filter((c) => c.health === "Under Treatment" || c.health === "Critical").length;
  const totalCost = healthRecords.reduce((s, h) => s + h.costUsd, 0);

  const sorted = [...healthRecords].sort((a, b) => b.date.localeCompare(a.date));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(h: HealthRecord) {
    setEditingId(h.id);
    setForm({
      cattleId: h.cattleId,
      type: h.type,
      diagnosis: h.diagnosis,
      treatment: h.treatment,
      date: h.date,
      vet: h.vet,
      status: h.status,
      costUsd: String(h.costUsd),
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      cattleId: form.cattleId,
      type: form.type as HealthRecord["type"],
      diagnosis: form.diagnosis.trim(),
      treatment: form.treatment.trim(),
      date: form.date,
      vet: form.vet.trim(),
      status: form.status as HealthRecord["status"],
      costUsd: Number(form.costUsd) || 0,
    };
    if (editingId) update("healthRecords", editingId, payload);
    else addHealth(payload);
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Health Records"
        description="Veterinary events, treatments and clinical history."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            New Health Event
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Under Treatment" value={String(underTreatment)} sublabel="animals" iconName="stethoscope" tone="red" />
        <StatCard label="Ongoing Cases" value={String(ongoing)} iconName="heart" tone="amber" />
        <StatCard label="Monitoring" value={String(monitoring)} iconName="search" tone="blue" />
        <StatCard label="Vet Spend (YTD)" value={currency(totalCost)} delta={-4} sublabel="vs last period" iconName="report" tone="green" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Clinical Log" action={<span className="text-xs text-muted">{healthRecords.length} events</span>} />
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Animal</Th>
              <Th>Type</Th>
              <Th>Diagnosis</Th>
              <Th>Treatment</Th>
              <Th>Vet</Th>
              <Th>Cost</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => (
              <tr key={h.id} className="transition hover:bg-canvas/60">
                <Td>{formatDate(h.date)}</Td>
                <Td className="font-medium">{cattleLabel(h.cattleId)}</Td>
                <Td><Badge tone="gray">{h.type}</Badge></Td>
                <Td>{h.diagnosis}</Td>
                <Td className="max-w-[18rem] whitespace-normal text-xs text-muted">{h.treatment}</Td>
                <Td className="text-muted">{h.vet}</Td>
                <Td className="text-muted">{currency(h.costUsd)}</Td>
                <Td><StatusBadge status={h.status} /></Td>
                <Td>
                  <div className="flex justify-end">
                    <RowActions onEdit={() => openEdit(h)} onDelete={() => remove("healthRecords", h.id)} label={`${h.diagnosis} (${h.id})`} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Health Event" : "New Health Event"}
        description={editingId ? `Update ${editingId}.` : "Log a veterinary event or treatment."}
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <SelectField
              label="Animal"
              value={form.cattleId}
              onChange={set("cattleId")}
              options={cattle.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required
              placeholder="— Select animal —"
            />
            <SelectField label="Type" value={form.type} onChange={set("type")} options={TYPE_OPTIONS} required />
            <DateField label="Date" value={form.date} onChange={set("date")} required />
            <TextField label="Vet" value={form.vet} onChange={set("vet")} required placeholder="e.g. Dr. Mensah" />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={STATUS_OPTIONS} required />
            <NumberField label="Cost (USD)" value={form.costUsd} onChange={set("costUsd")} min={0} placeholder="e.g. 120" />
          </FormGrid>
          <TextField label="Diagnosis" value={form.diagnosis} onChange={set("diagnosis")} required placeholder="e.g. Mastitis (subclinical)" />
          <TextAreaField label="Treatment" value={form.treatment} onChange={set("treatment")} placeholder="e.g. Intramammary antibiotics, 5-day course" />
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Save Event"} />
        </form>
      </Modal>
    </>
  );
}
