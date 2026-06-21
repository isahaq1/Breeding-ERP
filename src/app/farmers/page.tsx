"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Table,
  Th,
  Td,
  EmptyRow,
  PrimaryButton,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal,
  FormGrid,
  FormButtons,
  TextField,
  SelectField,
  TextAreaField,
  RowActions,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { TODAY } from "@/lib/format";
import type { Farmer } from "@/lib/types";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  farmId: "",
  idNumber: "",
  notes: "",
};

export default function FarmersPage() {
  const { farmers, farms, addFarmer, update, remove } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = (k: keyof typeof emptyForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(f: Farmer) {
    setEditingId(f.id);
    setForm({
      firstName: f.firstName,
      lastName: f.lastName,
      email: f.email ?? "",
      phone: f.phone,
      farmId: f.farmId,
      idNumber: f.idNumber ?? "",
      notes: f.notes ?? "",
    });
    setOpen(true);
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farmers.filter((f) => {
      if (
        q &&
        !`${f.firstName} ${f.lastName} ${f.phone}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [farmers, query]);

  function getFarmName(farmId: string): string {
    return farms.find((f) => f.id === farmId)?.name || farmId;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim(),
      farmId: form.farmId.trim(),
      idNumber: form.idNumber.trim() || undefined,
      registrationDate: editingId
        ? undefined
        : TODAY.toISOString().split("T")[0],
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      update("farmers", editingId, payload);
    } else {
      addFarmer({
        ...payload,
        registrationDate:
          payload.registrationDate || TODAY.toISOString().split("T")[0],
      });
    }
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Farmer Registration"
        description={`${farmers.length} farmers registered — manage farmer information and farm assignments.`}
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Register Farmer
          </PrimaryButton>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
          <Icon.search width={16} height={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search farmers by name or phone…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Farm</Th>
              <Th>ID Number</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={6} label="No farmers found." />}
            {rows.map((farmer) => (
                <tr key={farmer.id}>
                  <Td className="font-medium">
                    {farmer.firstName} {farmer.lastName}
                  </Td>
                  <Td className="font-mono text-sm">{farmer.phone}</Td>
                  <Td className="text-sm">{farmer.email || "—"}</Td>
                  <Td className="text-sm">{getFarmName(farmer.farmId)}</Td>
                  <Td className="text-sm font-mono">
                    {farmer.idNumber || "—"}
                  </Td>
                  <Td className="text-right">
                    <RowActions
                      onEdit={() => openEdit(farmer)}
                      onDelete={() => remove("farmers", farmer.id)}
                      label={`${farmer.firstName} ${farmer.lastName}`}
                    />
                  </Td>
                </tr>
              ))
            }
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Farmer" : "Register New Farmer"}
        description="Enter farmer information including contact details and farm assignment."
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={set("firstName")}
              required
            />
            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={set("lastName")}
              required
            />
            <TextField
              label="Phone Number"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+234-80X-XXX-XXXX"
              type="tel"
              required
            />
            <TextField
              label="Email Address"
              value={form.email}
              onChange={set("email")}
              type="email"
            />
            <TextField
              label="National ID / BVN"
              value={form.idNumber}
              onChange={set("idNumber")}
            />
            <div className="col-span-2">
              <SelectField
                label="Farm Assignment"
                value={form.farmId}
                onChange={set("farmId")}
                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                placeholder="Select a farm"
                required
              />
            </div>
            <div className="col-span-2">
              <TextAreaField
                label="Notes"
                value={form.notes}
                onChange={set("notes")}
                rows={3}
              />
            </div>
          </FormGrid>
          <FormButtons
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? "Update" : "Register"}
          />
        </form>
      </Modal>
    </>
  );
}
