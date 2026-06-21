"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, StatusBadge, Badge, PrimaryButton } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, DateField, SelectField, NumberField, TextAreaField, RowActions } from "@/components/forms";
import { useData } from "@/lib/store";
import type { BirthRecord } from "@/lib/types";
import { monthlyBirths, canBeDam, canBeSire, classTone } from "@/lib/data";
import { formatDate } from "@/lib/format";

// A newborn's class is recorded as Heifer (female) or Bull (male).
const CALF_CLASS_OPTIONS = ["Heifer", "Bull"];
const EASE_OPTIONS = ["Easy", "Assisted", "Difficult", "C-Section"];
const OUTCOME_OPTIONS = ["Live", "Stillborn"];

const emptyForm = {
  calfId: "",
  damId: "",
  sireId: "",
  birthDate: "2026-06-07",
  class: "Heifer",
  birthWeightKg: "",
  calvingEase: "Easy",
  outcome: "Live",
  notes: "",
};

export default function BirthHistoryPage() {
  const { birthRecords, cattle, cattleLabel, addBirth, update, remove } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const dams = useMemo(() => cattle.filter((c) => canBeDam(c.class)), [cattle]);
  const sires = useMemo(() => cattle.filter((c) => canBeSire(c.class)), [cattle]);

  const live = birthRecords.filter((b) => b.outcome === "Live").length;
  const still = birthRecords.filter((b) => b.outcome === "Stillborn").length;
  const assisted = birthRecords.filter((b) => b.calvingEase !== "Easy").length;
  const avgWeight = birthRecords.length
    ? (birthRecords.reduce((s, b) => s + b.birthWeightKg, 0) / birthRecords.length).toFixed(1)
    : "0.0";

  const sorted = [...birthRecords].sort((a, b) => b.birthDate.localeCompare(a.birthDate));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(b: BirthRecord) {
    setEditingId(b.id);
    setForm({
      calfId: b.calfId === "—" ? "" : b.calfId,
      damId: b.damId,
      sireId: b.sireId,
      birthDate: b.birthDate,
      class: b.class,
      birthWeightKg: String(b.birthWeightKg),
      calvingEase: b.calvingEase,
      outcome: b.outcome,
      notes: b.notes ?? "",
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      calfId: form.calfId.trim() || "—",
      damId: form.damId,
      sireId: form.sireId,
      birthDate: form.birthDate,
      class: form.class as BirthRecord["class"],
      birthWeightKg: Number(form.birthWeightKg) || 0,
      calvingEase: form.calvingEase as BirthRecord["calvingEase"],
      outcome: form.outcome as BirthRecord["outcome"],
      notes: form.notes.trim() || undefined,
    };
    if (editingId) update("birthRecords", editingId, payload);
    else addBirth(payload);
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Birth History"
        description="Complete calving log with outcomes, weights and calving ease."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Record Birth
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Births" value={String(birthRecords.length)} iconName="baby" tone="green" />
        <StatCard label="Live Births" value={String(live)} delta={4} iconName="heart" tone="green" />
        <StatCard label="Assisted / Difficult" value={String(assisted)} sublabel="needed intervention" iconName="stethoscope" tone="amber" />
        <StatCard label="Avg Birth Weight" value={`${avgWeight} kg`} iconName="analytics" tone="purple" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Calvings per Month" action={still > 0 ? <span className="text-xs text-red-600">{still} stillborn this period</span> : null} />
        <div className="p-5">
          <BarChart data={monthlyBirths.map((m) => ({ label: m.month, value: m.count }))} />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Calving Log" />
        <Table>
          <thead>
            <tr>
              <Th>Ref</Th>
              <Th>Date</Th>
              <Th>Calf</Th>
              <Th>Dam</Th>
              <Th>Sire</Th>
              <Th>Class</Th>
              <Th>Birth Wt</Th>
              <Th>Calving Ease</Th>
              <Th>Outcome</Th>
              <Th>Notes</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} className="transition hover:bg-canvas/60">
                <Td className="font-semibold text-muted">{b.id}</Td>
                <Td>{formatDate(b.birthDate)}</Td>
                <Td className="font-medium">
                  {b.calfId === "—" ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <Link href={`/cattle/${b.calfId}`} className="text-brand-700 hover:underline">
                      {cattleLabel(b.calfId)}
                    </Link>
                  )}
                </Td>
                <Td className="text-muted">{cattleLabel(b.damId)}</Td>
                <Td className="text-muted">{cattleLabel(b.sireId)}</Td>
                <Td>
                  <Badge tone={classTone(b.class)}>{b.class}</Badge>
                </Td>
                <Td className="text-muted">{b.birthWeightKg} kg</Td>
                <Td><StatusBadge status={b.calvingEase} /></Td>
                <Td><StatusBadge status={b.outcome} /></Td>
                <Td className="max-w-[16rem] whitespace-normal text-xs text-muted">{b.notes ?? "—"}</Td>
                <Td>
                  <div className="flex justify-end">
                    <RowActions onEdit={() => openEdit(b)} onDelete={() => remove("birthRecords", b.id)} label={b.id} />
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
        title={editingId ? "Edit Birth Record" : "Record Birth"}
        description={editingId ? `Update ${editingId}.` : "Log a calving event."}
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <SelectField
              label="Dam"
              value={form.damId}
              onChange={set("damId")}
              options={dams.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required
              placeholder="— Select dam —"
            />
            <SelectField
              label="Sire"
              value={form.sireId}
              onChange={set("sireId")}
              options={sires.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required
              placeholder="— Select sire —"
            />
            <SelectField
              label="Calf (if tagged)"
              value={form.calfId}
              onChange={set("calfId")}
              options={cattle.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              placeholder="— Not yet tagged —"
            />
            <DateField label="Birth Date" value={form.birthDate} onChange={set("birthDate")} required />
            <SelectField label="Class" value={form.class} onChange={set("class")} options={CALF_CLASS_OPTIONS} required />
            <NumberField label="Birth Weight (kg)" value={form.birthWeightKg} onChange={set("birthWeightKg")} required min={0} placeholder="e.g. 38" />
            <SelectField label="Calving Ease" value={form.calvingEase} onChange={set("calvingEase")} options={EASE_OPTIONS} required />
            <SelectField label="Outcome" value={form.outcome} onChange={set("outcome")} options={OUTCOME_OPTIONS} required />
          </FormGrid>
          <TextAreaField label="Notes" value={form.notes} onChange={set("notes")} placeholder="Optional notes…" />
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Record Birth"} />
        </form>
      </Modal>
    </>
  );
}
