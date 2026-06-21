"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, StatusBadge, Badge, PrimaryButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, TextField, DateField, SelectField, RowActions } from "@/components/forms";
import { useData } from "@/lib/store";
import { canBeDam, canBeSire } from "@/lib/data";
import type { BreedingRecord } from "@/lib/types";
import { formatDate, daysUntil } from "@/lib/format";

const METHOD_OPTIONS = ["Natural", "Artificial Insemination", "Embryo Transfer"];
const RESULT_OPTIONS = ["Confirmed Pregnant", "Open", "Pending Check", "Aborted"];

const emptyForm = {
  damId: "",
  sireId: "",
  method: "Artificial Insemination",
  serviceDate: "2026-06-07",
  expectedCalving: "",
  result: "Pending Check",
  technician: "",
};

export default function BreedingPage() {
  const { breedingRecords, cattle, cattleLabel, addBreeding, update, remove } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const dams = useMemo(() => cattle.filter((c) => canBeDam(c.class)), [cattle]);
  const sires = useMemo(() => cattle.filter((c) => canBeSire(c.class)), [cattle]);

  const confirmed = breedingRecords.filter((b) => b.result === "Confirmed Pregnant").length;
  const pending = breedingRecords.filter((b) => b.result === "Pending Check").length;
  const open_ = breedingRecords.filter((b) => b.result === "Open").length;

  const sorted = [...breedingRecords].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(b: BreedingRecord) {
    setEditingId(b.id);
    setForm({
      damId: b.damId,
      sireId: b.sireId,
      method: b.method,
      serviceDate: b.serviceDate,
      expectedCalving: b.expectedCalving,
      result: b.result,
      technician: b.technician,
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      damId: form.damId,
      sireId: form.sireId,
      method: form.method as BreedingRecord["method"],
      serviceDate: form.serviceDate,
      expectedCalving: form.expectedCalving,
      result: form.result as BreedingRecord["result"],
      technician: form.technician.trim(),
    };
    if (editingId) update("breedingRecords", editingId, payload);
    else addBreeding(payload);
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Breeding Records"
        description="Service events, insemination, and pregnancy tracking."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Log Service
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Services" value={String(breedingRecords.length)} iconName="heart" tone="blue" />
        <StatCard label="Confirmed Pregnant" value={String(confirmed)} delta={12} iconName="baby" tone="green" />
        <StatCard label="Pending Check" value={String(pending)} sublabel="awaiting scan" iconName="search" tone="amber" />
        <StatCard label="Open / Failed" value={String(open_)} sublabel="re-breed" iconName="swap" tone="purple" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Service Log" action={<span className="text-xs text-muted">{breedingRecords.length} records</span>} />
        <Table>
          <thead>
            <tr>
              <Th>Ref</Th>
              <Th>Dam</Th>
              <Th>Sire</Th>
              <Th>Method</Th>
              <Th>Service Date</Th>
              <Th>Expected Calving</Th>
              <Th>Countdown</Th>
              <Th>Result</Th>
              <Th>Technician</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const d = daysUntil(b.expectedCalving);
              const showCountdown = b.result === "Confirmed Pregnant";
              return (
                <tr key={b.id} className="transition hover:bg-canvas/60">
                  <Td className="font-semibold text-muted">{b.id}</Td>
                  <Td className="font-medium">{cattleLabel(b.damId)}</Td>
                  <Td className="text-muted">{cattleLabel(b.sireId)}</Td>
                  <Td><Badge tone="gray">{b.method}</Badge></Td>
                  <Td>{formatDate(b.serviceDate)}</Td>
                  <Td>{formatDate(b.expectedCalving)}</Td>
                  <Td>
                    {showCountdown ? (
                      <span className={d <= 14 ? "font-semibold text-amber-600" : "text-muted"}>
                        {d < 0 ? "Due now" : `in ${d}d`}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td><StatusBadge status={b.result} /></Td>
                  <Td className="text-muted">{b.technician}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <RowActions onEdit={() => openEdit(b)} onDelete={() => remove("breedingRecords", b.id)} label={b.id} />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <p className="mt-3 text-xs text-muted">
        Need lineage detail? Open any animal from the{" "}
        <Link href="/cattle" className="font-medium text-brand-700 hover:underline">Cattle Registry</Link>.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Service" : "Log Service"}
        description={editingId ? `Update ${editingId}.` : "Record a breeding / insemination event."}
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
            <SelectField label="Method" value={form.method} onChange={set("method")} options={METHOD_OPTIONS} required />
            <SelectField label="Result" value={form.result} onChange={set("result")} options={RESULT_OPTIONS} required />
            <DateField label="Service Date" value={form.serviceDate} onChange={set("serviceDate")} required />
            <DateField label="Expected Calving" value={form.expectedCalving} onChange={set("expectedCalving")} required />
            <TextField label="Technician" value={form.technician} onChange={set("technician")} required placeholder="e.g. Dr. Mensah" />
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Log Service"} />
        </form>
      </Modal>
    </>
  );
}
