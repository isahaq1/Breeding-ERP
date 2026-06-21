"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Table, Th, Td, StatusBadge, PrimaryButton, EmptyRow, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal,
  FormGrid,
  FormButtons,
  TextField,
  NumberField,
  DateField,
  SelectField,
  TextAreaField,
  RowActions,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { CATTLE_CLASSES, canBeDam, canBeSire, classTone } from "@/lib/data";
import type { Cattle } from "@/lib/types";
import { ageFrom, number } from "@/lib/format";

const STATUSES = ["All", "Active", "Pregnant", "Lactating", "Dry", "Calf", "Sold"] as const;
const CLASSES = ["All", "Cow", "Bull", "Heifer", "Steer", "Calf"] as const;
const STATUS_OPTIONS = ["Active", "Pregnant", "Lactating", "Dry", "Calf", "Sold", "Deceased"];
const HEALTH_OPTIONS = ["Healthy", "Under Treatment", "Quarantine", "Critical"];
const ACQUISITION_OPTIONS = ["Born on farm", "Purchased"];

const emptyForm = {
  name: "",
  breed: "",
  class: "Cow",
  dob: "2026-06-07",
  status: "Active",
  health: "Healthy",
  weightKg: "",
  damId: "",
  sireId: "",
  pasture: "",
  acquisition: "Purchased",
  notes: "",
};

export default function CattleRegistryPage() {
  const { cattle, pastures, addCattle, update, remove } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [cls, setCls] = useState<(typeof CLASSES)[number]>("All");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Cattle) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      breed: c.breed,
      class: c.class,
      dob: c.dob,
      status: c.status,
      health: c.health,
      weightKg: String(c.weightKg),
      damId: c.damId ?? "",
      sireId: c.sireId ?? "",
      pasture: c.pasture === "—" ? "" : c.pasture,
      acquisition: c.acquisition,
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  const dams = useMemo(() => cattle.filter((c) => canBeDam(c.class)), [cattle]);
  const sires = useMemo(() => cattle.filter((c) => canBeSire(c.class)), [cattle]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cattle.filter((c) => {
      if (status !== "All" && c.status !== status) return false;
      if (cls !== "All" && c.class !== cls) return false;
      if (q && !(`${c.id} ${c.name} ${c.breed}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [cattle, query, status, cls]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      breed: form.breed.trim(),
      class: form.class as Cattle["class"],
      dob: form.dob,
      status: form.status as Cattle["status"],
      health: form.health as Cattle["health"],
      weightKg: Number(form.weightKg) || 0,
      damId: form.damId || undefined,
      sireId: form.sireId || undefined,
      pasture: form.pasture.trim() || "—",
      acquisition: form.acquisition as Cattle["acquisition"],
      notes: form.notes.trim() || undefined,
    };
    if (editingId) update("cattle", editingId, payload);
    else addCattle(payload);
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Cattle Registry"
        description={`${number(cattle.length)} animals on record — search, filter and drill into any individual.`}
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Add Animal
          </PrimaryButton>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
            <Icon.search width={16} height={16} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tag, name or breed…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={cls}
              onChange={(e) => setCls(e.target.value as (typeof CLASSES)[number])}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            >
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Tag</Th>
              <Th>Name</Th>
              <Th>Breed</Th>
              <Th>Class</Th>
              <Th>Age</Th>
              <Th>Weight</Th>
              <Th>Status</Th>
              <Th>Health</Th>
              <Th>Location</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={10} label="No animals match your filters." />}
            {rows.map((c) => (
              <tr key={c.id} className="transition hover:bg-canvas/60">
                <Td>
                  <Link href={`/cattle/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                    {c.id}
                  </Link>
                </Td>
                <Td className="font-medium">{c.name}</Td>
                <Td className="text-muted">{c.breed}</Td>
                <Td>
                  <Badge tone={classTone(c.class)}>{c.class}</Badge>
                </Td>
                <Td className="text-muted">{ageFrom(c.dob)}</Td>
                <Td className="text-muted">{c.weightKg} kg</Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td><StatusBadge status={c.health} /></Td>
                <Td className="text-muted">{c.pasture}</Td>
                <Td>
                  <div className="flex justify-end">
                    <RowActions onEdit={() => openEdit(c)} onDelete={() => remove("cattle", c.id)} label={`${c.name} (${c.id})`} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <p className="mt-3 text-xs text-muted">
        Showing {rows.length} of {cattle.length} animals.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Animal" : "Add Animal"}
        description={editingId ? `Update ${editingId}.` : "Register a new animal in the herd."}
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <TextField label="Name" value={form.name} onChange={set("name")} required placeholder="e.g. Bluebell" />
            <TextField label="Breed" value={form.breed} onChange={set("breed")} required placeholder="e.g. Holstein" />
            <SelectField label="Class" value={form.class} onChange={set("class")} options={CATTLE_CLASSES} required />
            <DateField label="Date of Birth" value={form.dob} onChange={set("dob")} required />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={STATUS_OPTIONS} required />
            <SelectField label="Health" value={form.health} onChange={set("health")} options={HEALTH_OPTIONS} required />
            <NumberField label="Weight (kg)" value={form.weightKg} onChange={set("weightKg")} required min={0} placeholder="e.g. 480" />
            <SelectField
              label="Pasture"
              value={form.pasture}
              onChange={set("pasture")}
              options={pastures.map((p) => p.name)}
              placeholder="— Select —"
            />
            <SelectField
              label="Dam (mother)"
              value={form.damId}
              onChange={set("damId")}
              options={dams.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              placeholder="— None —"
            />
            <SelectField
              label="Sire (father)"
              value={form.sireId}
              onChange={set("sireId")}
              options={sires.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              placeholder="— None —"
            />
            <SelectField label="Acquisition" value={form.acquisition} onChange={set("acquisition")} options={ACQUISITION_OPTIONS} required />
          </FormGrid>
          <TextAreaField label="Notes" value={form.notes} onChange={set("notes")} placeholder="Optional notes…" />
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Add Animal"} />
        </form>
      </Modal>
    </>
  );
}
