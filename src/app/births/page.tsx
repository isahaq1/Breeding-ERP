"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, StatusBadge, Badge, PrimaryButton } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, DateField, SelectField, NumberField, TextAreaField, RowActions, TextField } from "@/components/forms";
import { useData } from "@/lib/store";
import type { BirthRecord } from "@/lib/types";
import { monthlyBirths, canBeDam, canBeSire, classTone } from "@/lib/data";
import { formatDate } from "@/lib/format";

const CALF_CLASS_OPTIONS = ["Heifer", "Bull"];
const EASE_OPTIONS = ["Easy", "Assisted", "Difficult", "C-Section"];
const OUTCOME_OPTIONS = ["Live", "Stillborn"];

const BREEDS = [
  "Holstein", "Jersey", "Angus", "Hereford", "Simmental",
  "Brahman", "Charolais", "Limousin", "Friesian", "Mixed",
];

const emptyForm = {
  calfName: "",
  calfBreed: "",
  rfidTag: "",
  damId: "",
  sireId: "",
  birthDate: "2026-06-24",
  class: "Heifer" as "Heifer" | "Bull",
  birthWeightKg: "",
  calvingEase: "Easy",
  outcome: "Live",
  notes: "",
};

export default function BirthHistoryPage() {
  const { birthRecords, cattle, cattleLabel, addBirth, addBirthAndCalf, update, remove } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [calfRegistered, setCalfRegistered] = useState<{ name: string; id: string } | null>(null);
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
    const existingCalf = b.calfId !== "—" ? cattle.find(c => c.id === b.calfId) : null;
    setForm({
      calfName: existingCalf?.name ?? "",
      calfBreed: existingCalf?.breed ?? "",
      rfidTag: existingCalf?.rfidTag ?? "",
      damId: b.damId,
      sireId: b.sireId,
      birthDate: b.birthDate,
      class: b.class as "Heifer" | "Bull",
      birthWeightKg: String(b.birthWeightKg),
      calvingEase: b.calvingEase,
      outcome: b.outcome,
      notes: b.notes ?? "",
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      // Edit: update birth record only — don't recreate cattle
      update("birthRecords", editingId, {
        damId: form.damId,
        sireId: form.sireId,
        birthDate: form.birthDate,
        class: form.class as BirthRecord["class"],
        birthWeightKg: Number(form.birthWeightKg) || 0,
        calvingEase: form.calvingEase as BirthRecord["calvingEase"],
        outcome: form.outcome as BirthRecord["outcome"],
        notes: form.notes.trim() || undefined,
      });
    } else if (form.outcome === "Live" && form.calfName.trim()) {
      // Live birth with name → atomically create cattle + birth record
      const dam = cattle.find((c) => c.id === form.damId);
      const registeredId = addBirthAndCalf(
        {
          damId: form.damId,
          sireId: form.sireId,
          birthDate: form.birthDate,
          class: form.class as BirthRecord["class"],
          birthWeightKg: Number(form.birthWeightKg) || 0,
          calvingEase: form.calvingEase as BirthRecord["calvingEase"],
          outcome: "Live",
          notes: form.notes.trim() || undefined,
        },
        {
          name: form.calfName.trim(),
          breed: form.calfBreed.trim() || dam?.breed || "Mixed",
          class: form.class,
          dob: form.birthDate,
          status: "Calf",
          health: "Healthy",
          weightKg: Number(form.birthWeightKg) || 0,
          damId: form.damId,
          sireId: form.sireId || undefined,
          pasture: "Calf Barn",
          farmId: dam?.farmId,
          rfidTag: form.rfidTag.trim() || undefined,
          acquisition: "Born on farm",
        },
      );
      setCalfRegistered({ name: form.calfName.trim(), id: registeredId });
    } else {
      // Stillborn or unnamed live birth
      addBirth({
        calfId: "—",
        damId: form.damId,
        sireId: form.sireId,
        birthDate: form.birthDate,
        class: form.class as BirthRecord["class"],
        birthWeightKg: Number(form.birthWeightKg) || 0,
        calvingEase: form.calvingEase as BirthRecord["calvingEase"],
        outcome: form.outcome as BirthRecord["outcome"],
        notes: form.notes.trim() || undefined,
      });
    }

    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Birth History"
        description="Complete calving log. Live births are automatically registered in the Cattle Registry."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Record Birth
          </PrimaryButton>
        }
      />

      {/* Calf registered banner */}
      {calfRegistered && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Icon.baby width={18} height={18} className="text-green-600" />
            <p className="text-sm font-medium text-green-800">
              Calf <strong>&quot;{calfRegistered.name}&quot;</strong>
              {calfRegistered.id ? (
                <> registered as cattle <Link href={`/cattle/${calfRegistered.id}`} className="underline hover:text-green-900">{calfRegistered.id}</Link>.</>
              ) : (
                <> has been registered in the Cattle Registry.</>
              )}{" "}
              <Link href="/cattle" className="underline hover:text-green-900">View all →</Link>
            </p>
          </div>
          <button onClick={() => setCalfRegistered(null)} className="ml-4 text-green-600 hover:text-green-800">
            <Icon.close width={16} height={16} />
          </button>
        </div>
      )}

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
                    <span className="text-muted/40">—</span>
                  ) : (
                    <Link href={`/cattle/${b.calfId}`} className="text-brand-700 hover:underline">
                      {cattleLabel(b.calfId)}
                    </Link>
                  )}
                </Td>
                <Td className="text-muted">{cattleLabel(b.damId)}</Td>
                <Td className="text-muted">{cattleLabel(b.sireId)}</Td>
                <Td><Badge tone={classTone(b.class)}>{b.class}</Badge></Td>
                <Td className="text-muted">{b.birthWeightKg} kg</Td>
                <Td><StatusBadge status={b.calvingEase} /></Td>
                <Td>
                  <StatusBadge status={b.outcome} />
                </Td>
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
        title={editingId ? "Edit Birth Record" : "Record Calving"}
        description={
          editingId
            ? `Update ${editingId}.`
            : form.outcome === "Live"
            ? "Live births will be auto-registered in the Cattle Registry."
            : "Record a stillborn calving event."
        }
        size="lg"
      >
        <form onSubmit={submit} className="space-y-5 p-5">
          {/* Parents */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Parents</p>
            <FormGrid>
              <SelectField
                label="Dam (Mother)"
                value={form.damId}
                onChange={set("damId")}
                options={dams.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
                required
                placeholder="— Select dam —"
              />
              <SelectField
                label="Sire (Father)"
                value={form.sireId}
                onChange={set("sireId")}
                options={sires.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
                required
                placeholder="— Select sire —"
              />
            </FormGrid>
          </div>

          {/* Calving event */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Calving Event</p>
            <FormGrid>
              <DateField label="Birth Date" value={form.birthDate} onChange={set("birthDate")} required />
              <SelectField label="Outcome" value={form.outcome} onChange={set("outcome")} options={OUTCOME_OPTIONS} required />
              <SelectField label="Calf Class" value={form.class} onChange={set("class")} options={CALF_CLASS_OPTIONS} required />
              <NumberField label="Birth Weight (kg)" value={form.birthWeightKg} onChange={set("birthWeightKg")} required min={0} placeholder="e.g. 38" />
              <SelectField label="Calving Ease" value={form.calvingEase} onChange={set("calvingEase")} options={EASE_OPTIONS} required />
            </FormGrid>
          </div>

          {/* Calf registration — only for live births */}
          {form.outcome === "Live" && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
                <Icon.baby width={14} height={14} /> Calf Registration (Cattle Registry)
              </p>
              <FormGrid>
                <TextField
                  label="Calf Name"
                  value={form.calfName}
                  onChange={set("calfName")}
                  required
                  placeholder="e.g. Blossom"
                />
                <SelectField
                  label="Breed"
                  value={form.calfBreed}
                  onChange={set("calfBreed")}
                  options={BREEDS}
                  placeholder="— Inherit from dam —"
                />
                <TextField
                  label="RFID Tag (optional)"
                  value={form.rfidTag}
                  onChange={set("rfidTag")}
                  placeholder="e.g. 716001100103002"
                />
              </FormGrid>
              <p className="mt-2 text-[11px] text-brand-600">
                The calf will be registered as a new cattle record with status <strong>Calf</strong>, assigned to the Calf Barn.
              </p>
            </div>
          )}

          <TextAreaField label="Notes" value={form.notes} onChange={set("notes")} placeholder="Optional notes…" />
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Record Birth"} />
        </form>
      </Modal>
    </>
  );
}
