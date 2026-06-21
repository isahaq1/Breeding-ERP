"use client";

import { useState } from "react";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, StatusBadge, PrimaryButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, TextField, DateField, SelectField, RowActions } from "@/components/forms";
import { useData } from "@/lib/store";
import type { Vaccination } from "@/lib/types";
import { formatDate, daysUntil } from "@/lib/format";

const STATUS_OPTIONS = ["Completed", "Due", "Overdue", "Scheduled"];

const emptyForm = {
  cattleId: "",
  vaccine: "",
  date: "2026-06-07",
  nextDue: "",
  administeredBy: "",
  status: "Scheduled",
};

export default function VaccinationsPage() {
  const { vaccinations, cattle, cattleLabel, addVaccination, update, remove } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const overdue = vaccinations.filter((v) => v.status === "Overdue");
  const due = vaccinations.filter((v) => v.status === "Due");
  const scheduled = vaccinations.filter((v) => v.status === "Scheduled").length;
  const completed = vaccinations.filter((v) => v.status === "Completed").length;

  const sorted = [...vaccinations].sort((a, b) => daysUntil(a.nextDue) - daysUntil(b.nextDue));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(v: Vaccination) {
    setEditingId(v.id);
    setForm({
      cattleId: v.cattleId,
      vaccine: v.vaccine,
      date: v.date,
      nextDue: v.nextDue,
      administeredBy: v.administeredBy,
      status: v.status,
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      cattleId: form.cattleId,
      vaccine: form.vaccine.trim(),
      date: form.date,
      nextDue: form.nextDue,
      administeredBy: form.administeredBy.trim(),
      status: form.status as Vaccination["status"],
    };
    if (editingId) update("vaccinations", editingId, payload);
    else addVaccination(payload);
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Vaccinations"
        description="Immunization schedule, due dates and compliance tracking."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Schedule Vaccine
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overdue" value={String(overdue.length)} sublabel="act now" iconName="bell" tone="red" />
        <StatCard label="Due Soon" value={String(due.length)} sublabel="within window" iconName="syringe" tone="amber" />
        <StatCard label="Scheduled" value={String(scheduled)} iconName="report" tone="blue" />
        <StatCard label="Completed" value={String(completed)} delta={5} iconName="heart" tone="green" />
      </div>

      {overdue.length + due.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3 p-5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Icon.bell width={18} height={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {overdue.length} overdue · {due.length} due soon
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {[...overdue, ...due]
                  .map((v) => `${cattleLabel(v.cattleId)} — ${v.vaccine}`)
                  .join("  •  ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Vaccination Schedule" />
        <Table>
          <thead>
            <tr>
              <Th>Animal</Th>
              <Th>Vaccine</Th>
              <Th>Last Given</Th>
              <Th>Next Due</Th>
              <Th>Countdown</Th>
              <Th>Administered By</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => {
              const d = daysUntil(v.nextDue);
              return (
                <tr key={v.id} className="transition hover:bg-canvas/60">
                  <Td className="font-medium">{cattleLabel(v.cattleId)}</Td>
                  <Td>{v.vaccine}</Td>
                  <Td className="text-muted">{formatDate(v.date)}</Td>
                  <Td>{formatDate(v.nextDue)}</Td>
                  <Td>
                    <span className={d < 0 ? "font-semibold text-red-600" : d <= 14 ? "font-semibold text-amber-600" : "text-muted"}>
                      {d < 0 ? `${Math.abs(d)}d overdue` : `in ${d}d`}
                    </span>
                  </Td>
                  <Td className="text-muted">{v.administeredBy}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                  <Td>
                    <div className="flex justify-end">
                      <RowActions onEdit={() => openEdit(v)} onDelete={() => remove("vaccinations", v.id)} label={`${v.vaccine} — ${cattleLabel(v.cattleId)}`} />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Vaccination" : "Schedule Vaccine"}
        description={editingId ? `Update ${editingId}.` : "Add a vaccination record or schedule."}
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
            <TextField label="Vaccine" value={form.vaccine} onChange={set("vaccine")} required placeholder="e.g. FMD (Foot & Mouth)" />
            <DateField label="Date Given" value={form.date} onChange={set("date")} required />
            <DateField label="Next Due" value={form.nextDue} onChange={set("nextDue")} required />
            <TextField label="Administered By" value={form.administeredBy} onChange={set("administeredBy")} required placeholder="e.g. Dr. Mensah" />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={STATUS_OPTIONS} required />
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Schedule Vaccine"} />
        </form>
      </Modal>
    </>
  );
}
