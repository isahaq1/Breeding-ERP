"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Table,
  Th,
  Td,
  StatusBadge,
  PrimaryButton,
  Badge,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal,
  FormGrid,
  FormButtons,
  TextField,
  NumberField,
  SelectField,
  TextAreaField,
  RowActions,
} from "@/components/forms";
import { useData } from "@/lib/store";
import type { Farm } from "@/lib/types";
import { number } from "@/lib/format";

const emptyForm = {
  name: "",
  primaryFarmerId: "",
  latitude: "",
  longitude: "",
  address: "",
  areaHa: "",
  totalAreaHa: "",
  herdSize: "",
  facilityType: "Mixed" as const,
  status: "Active" as const,
  certifications: "",
  contactPerson: "",
  contactPhone: "",
  notes: "",
};

export default function FarmsPage() {
  const { farms, farmers, addFarm, update, remove } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = (k: keyof typeof emptyForm) => (v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(f: Farm) {
    setEditingId(f.id);
    setForm({
      name: f.name,
      primaryFarmerId: f.primaryFarmerId,
      latitude: String(f.location.latitude),
      longitude: String(f.location.longitude),
      address: f.location.address ?? "",
      areaHa: String(f.location.areaHa ?? ""),
      totalAreaHa: String(f.totalAreaHa),
      herdSize: String(f.herdSize),
      facilityType: f.facilityType,
      status: f.status,
      certifications: f.certifications ?? "",
      contactPerson: f.contactPerson ?? "",
      contactPhone: f.contactPhone ?? "",
      notes: f.notes ?? "",
    });
    setOpen(true);
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farms.filter((f) => {
      if (
        q &&
        !`${f.id} ${f.name} ${f.location.address}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [farms, query]);

  function getFarmerName(farmerId: string): string {
    const farmer = farmers.find((f) => f.id === farmerId);
    return farmer ? `${farmer.firstName} ${farmer.lastName}` : farmerId;
  }

  function getStatusTone(status: Farm["status"]): "green" | "yellow" | "red" {
    if (status === "Active") return "green";
    if (status === "Under Development") return "yellow";
    return "red";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      primaryFarmerId: form.primaryFarmerId.trim(),
      location: {
        latitude: Number(form.latitude) || 0,
        longitude: Number(form.longitude) || 0,
        address: form.address.trim() || undefined,
        areaHa: form.areaHa ? Number(form.areaHa) : undefined,
      },
      totalAreaHa: Number(form.totalAreaHa) || 0,
      herdSize: Number(form.herdSize) || 0,
      facilityType: form.facilityType as Farm["facilityType"],
      status: form.status as Farm["status"],
      certifications: form.certifications.trim() || undefined,
      contactPerson: form.contactPerson.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      registrationDate: editingId
        ? undefined
        : new Date().toISOString().split("T")[0],
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      update("farms", editingId, payload);
    } else {
      addFarm({
        ...payload,
        registrationDate:
          payload.registrationDate || new Date().toISOString().split("T")[0],
      });
    }
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Farm Management"
        description={`${number(farms.length)} farms registered — manage farm details, location and capacity.`}
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Add Farm
          </PrimaryButton>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
          <Icon.search width={16} height={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search farms by name or location…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Farm Name</Th>
              <Th>Manager</Th>
              <Th>Location</Th>
              <Th>Herd Size</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={7} className="text-center py-8">
                  <p className="text-sm text-muted">No farms found</p>
                </Td>
              </tr>
            ) : (
              rows.map((farm) => (
                <tr key={farm.id}>
                  <Td className="font-medium">{farm.name}</Td>
                  <Td className="text-sm">
                    {getFarmerName(farm.primaryFarmerId)}
                  </Td>
                  <Td className="text-sm">{farm.location.address || "—"}</Td>
                  <Td className="text-sm font-mono">{farm.herdSize} animals</Td>
                  <Td className="text-sm">
                    <Badge tone="blue">{farm.facilityType}</Badge>
                  </Td>
                  <Td>
                    <StatusBadge
                      status={farm.status}
                      tone={getStatusTone(farm.status)}
                    />
                  </Td>
                  <Td className="text-right">
                    <RowActions
                      onEdit={() => openEdit(farm)}
                      onDelete={() => remove("farms", farm.id)}
                      label={farm.name}
                    />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Farm" : "Register New Farm"}
        description="Enter farm information including geolocation and facility details."
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <TextField
              label="Farm Name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              required
            />
            <SelectField
              label="Primary Manager"
              value={form.primaryFarmerId}
              onChange={(e) => set("primaryFarmerId")(e.target.value)}
              options={farmers.map((f) => ({
                value: f.id,
                label: `${f.firstName} ${f.lastName}`,
              }))}
              placeholder="Select a farmer"
              required
            />
            <TextField
              label="Address/Location"
              value={form.address}
              onChange={(e) => set("address")(e.target.value)}
              placeholder="e.g., Km 15, Ibarapa Road, Oyo State, Nigeria"
            />
            <TextField label="" value="" onChange={() => {}} />
            <div className="col-span-2 border-t border-line pt-2">
              <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wide">
                Geolocation
              </p>
            </div>
            <NumberField
              label="Latitude"
              value={form.latitude}
              onChange={(e) => set("latitude")(e.target.value)}
              step="0.0001"
              placeholder="e.g., 6.5244"
              required
            />
            <NumberField
              label="Longitude"
              value={form.longitude}
              onChange={(e) => set("longitude")(e.target.value)}
              step="0.0001"
              placeholder="e.g., 3.3792"
              required
            />
            <div className="col-span-2 border-t border-line pt-2">
              <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wide">
                Capacity & Type
              </p>
            </div>
            <NumberField
              label="Total Area (hectares)"
              value={form.totalAreaHa}
              onChange={(e) => set("totalAreaHa")(e.target.value)}
              step="0.1"
              required
            />
            <NumberField
              label="Estimated Herd Size"
              value={form.herdSize}
              onChange={(e) => set("herdSize")(e.target.value)}
              required
            />
            <SelectField
              label="Facility Type"
              value={form.facilityType}
              onChange={(e) => set("facilityType")(e.target.value)}
              options={["Dairy", "Beef", "Mixed", "Breeding"]}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => set("status")(e.target.value)}
              options={["Active", "Inactive", "Under Development"]}
            />
            <div className="col-span-2 border-t border-line pt-2">
              <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wide">
                Contact Info
              </p>
            </div>
            <TextField
              label="Contact Person"
              value={form.contactPerson}
              onChange={(e) => set("contactPerson")(e.target.value)}
            />
            <TextField
              label="Contact Phone"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone")(e.target.value)}
            />
            <TextField
              label="Certifications"
              value={form.certifications}
              onChange={(e) => set("certifications")(e.target.value)}
              placeholder="e.g., ISO 22000, Organic"
            />
            <div className="col-span-2">
              <TextAreaField
                label="Notes"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                rows={2}
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
