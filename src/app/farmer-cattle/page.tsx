"use client";

import React, { useMemo, useState } from "react";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Badge,
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
  NumberField,
  DateField,
  SelectField,
  TextAreaField,
  RowActions,
} from "@/components/forms";
import { useData } from "@/lib/store";
import type { FarmerCattle, InseminationEvent, FarmerCalfBirth } from "@/lib/types";
import { formatDate, ageFrom } from "@/lib/format";

// ---- Tone helpers -----------------------------------------------------------

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "purple";

function lactationTone(s: FarmerCattle["lactationStatus"]): Tone {
  if (s === "Pregnant") return "blue";
  if (s === "Lactating") return "green";
  if (s === "Dry") return "amber";
  if (s === "Open") return "gray";
  return "gray";
}

function sexTone(s: "Female" | "Male"): Tone {
  return s === "Female" ? "purple" : "blue";
}

// ---- Constants --------------------------------------------------------------

const BREEDS = [
  "Holstein", "Jersey", "Angus", "Hereford", "Simmental", "Brahman",
  "Charolais", "Limousin", "Brown Swiss", "Ayrshire", "Guernsey",
  "Gir", "Sahiwal", "Friesian", "Shorthorn", "Zebu", "Mixed", "Other",
];

const TODAY_ISO = new Date().toISOString().slice(0, 10);

// ---- Form state -------------------------------------------------------------

interface Form {
  farmerId: string;
  farmId: string;
  tagNumber: string;
  name: string;
  breed: string;
  sex: "Female" | "Male";
  dateOfBirth: string;
  color: string;
  weightKg: string;
  lactationStatus: string;
  rfidTag: string;
  registeredByAgentId: string;
  registeredDate: string;
  isActive: string; // "true" | "false"
  notes: string;
}

const emptyForm: Form = {
  farmerId: "",
  farmId: "",
  tagNumber: "",
  name: "",
  breed: "",
  sex: "Female",
  dateOfBirth: "",
  color: "",
  weightKg: "",
  lactationStatus: "",
  rfidTag: "",
  registeredByAgentId: "",
  registeredDate: TODAY_ISO,
  isActive: "true",
  notes: "",
};

// ---- Page component ---------------------------------------------------------

export default function FarmerCattlePage() {
  const {
    farmerCattle,
    addFarmerCattle,
    update,
    remove,
    farmers,
    farms,
    saleAgents,
    inseminationEvents,
    farmerCalfBirths,
  } = useData();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterFarmer, setFilterFarmer] = useState("");
  const [filterFarm, setFilterFarm] = useState("");
  const [filterSex, setFilterSex] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Form setter
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-filter farms by selected farmer
  const availableFarms = useMemo(() => {
    if (!form.farmerId) return farms;
    const farmer = farmers.find((f) => f.id === form.farmerId);
    if (!farmer) return farms;
    return farms.filter((fm) => fm.id === farmer.farmId || fm.primaryFarmerId === form.farmerId);
  }, [form.farmerId, farms, farmers]);

  // Stats
  const totalCount = farmerCattle.length;
  const activeCount = farmerCattle.filter((fc) => fc.isActive).length;
  const femaleCount = farmerCattle.filter((fc) => fc.sex === "Female").length;
  const pregnantCount = farmerCattle.filter((fc) => fc.lactationStatus === "Pregnant").length;

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return farmerCattle.filter((fc) => {
      const matchSearch =
        !q ||
        fc.tagNumber.toLowerCase().includes(q) ||
        (fc.name ?? "").toLowerCase().includes(q) ||
        fc.breed.toLowerCase().includes(q);
      const matchFarmer = !filterFarmer || fc.farmerId === filterFarmer;
      const matchFarm = !filterFarm || fc.farmId === filterFarm;
      const matchSex = filterSex === "All" || fc.sex === filterSex;
      const matchStatus =
        filterStatus === "All" ||
        (filterStatus === "Active" && fc.isActive) ||
        (filterStatus === "Inactive" && !fc.isActive);
      return matchSearch && matchFarmer && matchFarm && matchSex && matchStatus;
    });
  }, [farmerCattle, search, filterFarmer, filterFarm, filterSex, filterStatus]);

  // Helpers
  function farmerName(id: string) {
    const f = farmers.find((x) => x.id === id);
    return f ? `${f.firstName} ${f.lastName}` : id;
  }

  function farmName(id: string) {
    const f = farms.find((x) => x.id === id);
    return f ? f.name : id;
  }

  function agentName(id?: string) {
    if (!id) return "—";
    const a = saleAgents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : id;
  }

  function aiRecordCount(fcId: string) {
    return inseminationEvents.filter((ie) => ie.farmerCattleId === fcId).length;
  }

  function recentInseminations(fcId: string): InseminationEvent[] {
    return inseminationEvents
      .filter((ie) => ie.farmerCattleId === fcId)
      .sort((a, b) => b.inseminationDate.localeCompare(a.inseminationDate))
      .slice(0, 3);
  }

  function calfBirths(fcId: string): FarmerCalfBirth[] {
    return farmerCalfBirths.filter((b) => b.farmerCattleId === fcId);
  }

  // Modal handlers
  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(fc: FarmerCattle) {
    setEditingId(fc.id);
    setForm({
      farmerId: fc.farmerId,
      farmId: fc.farmId,
      tagNumber: fc.tagNumber,
      name: fc.name ?? "",
      breed: fc.breed,
      sex: fc.sex,
      dateOfBirth: fc.dateOfBirth ?? "",
      color: fc.color ?? "",
      weightKg: fc.weightKg !== undefined ? String(fc.weightKg) : "",
      lactationStatus: fc.lactationStatus ?? "",
      rfidTag: fc.rfidTag ?? "",
      registeredByAgentId: fc.registeredByAgentId ?? "",
      registeredDate: fc.registeredDate,
      isActive: fc.isActive ? "true" : "false",
      notes: fc.notes ?? "",
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    const payload: Omit<FarmerCattle, "id"> = {
      farmerId: form.farmerId,
      farmId: form.farmId,
      tagNumber: form.tagNumber.trim(),
      name: form.name.trim() || undefined,
      breed: form.breed.trim(),
      sex: form.sex,
      dateOfBirth: form.dateOfBirth || undefined,
      color: form.color.trim() || undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      lactationStatus:
        form.sex === "Female" && form.lactationStatus
          ? (form.lactationStatus as FarmerCattle["lactationStatus"])
          : undefined,
      registeredDate: form.registeredDate,
      registeredByAgentId: form.registeredByAgentId || undefined,
      rfidTag: form.rfidTag.trim() || undefined,
      qrCode: undefined,
      isActive: form.isActive === "true",
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      update("farmerCattle", editingId, payload);
    } else {
      addFarmerCattle(payload);
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleDelete(fc: FarmerCattle) {
    if (window.confirm(`Delete cattle record ${fc.tagNumber}${fc.name ? ` (${fc.name})` : ""}? This cannot be undone.`)) {
      remove("farmerCattle", fc.id);
      if (expandedId === fc.id) setExpandedId(null);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const COL_COUNT = 12;

  return (
    <>
      <PageHeader
        title="Farmer Cattle Registry"
        description="Register and track cattle belonging to third-party farmers enrolled in the AI semen programme."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Register Cattle
          </PrimaryButton>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Registered"
          value={String(totalCount)}
          iconName="cow"
          tone="blue"
        />
        <StatCard
          label="Active"
          value={String(activeCount)}
          iconName="analytics"
          tone="green"
        />
        <StatCard
          label="Female"
          value={String(femaleCount)}
          iconName="cow"
          tone="purple"
        />
        <StatCard
          label="Pregnant / AI'd"
          value={String(pregnantCount)}
          iconName="syringe"
          tone="amber"
        />
      </div>

      {/* Filter bar */}
      <Card className="mt-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tag, name, breed…"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Farmer filter */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Farmer</label>
            <select
              value={filterFarmer}
              onChange={(e) => setFilterFarmer(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All Farmers</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.firstName} {f.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Farm filter */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Farm</label>
            <select
              value={filterFarm}
              onChange={(e) => setFilterFarm(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All Farms</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sex filter */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Sex</label>
            <select
              value={filterSex}
              onChange={(e) => setFilterSex(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="All">All</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main table */}
      <Card className="mt-4">
        <CardHeader
          title={`Registered Cattle (${filtered.length})`}
          action={
            filtered.length !== totalCount ? (
              <span className="text-xs text-muted">
                {filtered.length} of {totalCount} shown
              </span>
            ) : null
          }
        />
        <Table>
          <thead>
            <tr>
              <Th>Tag #</Th>
              <Th>Name</Th>
              <Th>Breed</Th>
              <Th>Sex</Th>
              <Th>Farm</Th>
              <Th>Farmer</Th>
              <Th>Age</Th>
              <Th>Lactation Status</Th>
              <Th>Reg. Date</Th>
              <Th>Registered By</Th>
              <Th>AI Records</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <EmptyRow colSpan={COL_COUNT} label="No cattle records match the current filters." />
            )}
            {filtered.map((fc) => {
              const isExpanded = expandedId === fc.id;
              const aiCount = aiRecordCount(fc.id);
              return (
                <React.Fragment key={fc.id}>
                  {/* Main row */}
                  <tr
                    className={`cursor-pointer transition hover:bg-canvas/60 ${isExpanded ? "bg-canvas/40" : ""}`}
                    onClick={() => toggleExpand(fc.id)}
                  >
                    <Td>
                      <span className="font-semibold text-brand-700">{fc.tagNumber}</span>
                      <span className="ml-1.5 text-xs text-muted">{fc.id}</span>
                    </Td>
                    <Td className="font-medium">{fc.name ?? <span className="text-muted/40">—</span>}</Td>
                    <Td className="text-muted">{fc.breed}</Td>
                    <Td>
                      <Badge tone={sexTone(fc.sex)}>{fc.sex}</Badge>
                    </Td>
                    <Td className="text-muted">{farmName(fc.farmId)}</Td>
                    <Td className="text-muted">{farmerName(fc.farmerId)}</Td>
                    <Td className="text-muted">
                      {fc.dateOfBirth ? ageFrom(fc.dateOfBirth) : <span className="text-muted/40">—</span>}
                    </Td>
                    <Td>
                      {fc.sex === "Female" && fc.lactationStatus ? (
                        <Badge tone={lactationTone(fc.lactationStatus)}>{fc.lactationStatus}</Badge>
                      ) : (
                        <span className="text-muted/40">—</span>
                      )}
                    </Td>
                    <Td className="text-muted">{formatDate(fc.registeredDate)}</Td>
                    <Td className="text-muted">{agentName(fc.registeredByAgentId)}</Td>
                    <Td>
                      {aiCount > 0 ? (
                        <Badge tone="blue">{aiCount} event{aiCount !== 1 ? "s" : ""}</Badge>
                      ) : (
                        <span className="text-muted/40">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <RowActions
                          onEdit={() => openEdit(fc)}
                          onDelete={() => handleDelete(fc)}
                          label={fc.tagNumber}
                        />
                      </div>
                    </Td>
                  </tr>

                  {/* Expanded detail sub-row */}
                  {isExpanded && (
                    <tr key={`${fc.id}-detail`}>
                      <td colSpan={COL_COUNT} className="border-b border-line bg-canvas/30 px-6 py-5">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                          {/* Full details */}
                          <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <Icon.cow width={14} height={14} />
                              Animal Details
                            </p>
                            <dl className="space-y-1.5 text-sm">
                              <div className="flex gap-2">
                                <dt className="w-28 shrink-0 text-muted">Status</dt>
                                <dd>
                                  <Badge tone={fc.isActive ? "green" : "gray"}>
                                    {fc.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-28 shrink-0 text-muted">Color</dt>
                                <dd className="text-ink">{fc.color ?? "—"}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-28 shrink-0 text-muted">Weight</dt>
                                <dd className="text-ink">{fc.weightKg !== undefined ? `${fc.weightKg} kg` : "—"}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-28 shrink-0 text-muted">RFID Tag</dt>
                                <dd className="font-mono text-xs text-ink">{fc.rfidTag ?? "—"}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-28 shrink-0 text-muted">QR Code</dt>
                                <dd className="font-mono text-xs text-ink">{fc.qrCode ?? "—"}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-28 shrink-0 text-muted">Date of Birth</dt>
                                <dd className="text-ink">{fc.dateOfBirth ? formatDate(fc.dateOfBirth) : "—"}</dd>
                              </div>
                              {fc.notes && (
                                <div className="flex gap-2">
                                  <dt className="w-28 shrink-0 text-muted">Notes</dt>
                                  <dd className="text-ink whitespace-normal">{fc.notes}</dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          {/* Recent insemination events */}
                          <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <Icon.syringe width={14} height={14} />
                              Recent AI Events (last 3)
                            </p>
                            {recentInseminations(fc.id).length === 0 ? (
                              <p className="text-sm text-muted/60">No insemination events recorded.</p>
                            ) : (
                              <div className="space-y-2">
                                {recentInseminations(fc.id).map((ie) => (
                                  <div
                                    key={ie.id}
                                    className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-muted">{ie.id}</span>
                                      <Badge
                                        tone={
                                          ie.result === "Pregnant"
                                            ? "blue"
                                            : ie.result === "Pending PD"
                                            ? "amber"
                                            : ie.result === "Open" || ie.result === "Repeat Service"
                                            ? "gray"
                                            : "red"
                                        }
                                      >
                                        {ie.result}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-muted">
                                      {formatDate(ie.inseminationDate)} &middot; {ie.serviceMethod} &middot; Agent: {agentName(ie.agentId)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Calf births */}
                          <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <Icon.baby width={14} height={14} />
                              Calf Births ({calfBirths(fc.id).length})
                            </p>
                            {calfBirths(fc.id).length === 0 ? (
                              <p className="text-sm text-muted/60">No calf births recorded.</p>
                            ) : (
                              <div className="space-y-2">
                                {calfBirths(fc.id).map((b) => (
                                  <div
                                    key={b.id}
                                    className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-muted">{b.id}</span>
                                      <Badge
                                        tone={
                                          b.outcome === "Live Birth"
                                            ? "green"
                                            : b.outcome === "Stillbirth"
                                            ? "red"
                                            : b.outcome === "Aborted"
                                            ? "red"
                                            : "amber"
                                        }
                                      >
                                        {b.outcome}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-muted">
                                      {formatDate(b.birthDate)} &middot;{" "}
                                      {b.calfName ?? b.calfTagNumber ?? "Unnamed"} &middot; {b.calfSex}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Cattle — ${form.tagNumber}` : "Register Farmer Cattle"}
        description={
          editingId
            ? "Update the cattle record. Changes are saved immediately."
            : "Register a third-party farmer's cattle for the AI semen programme."
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {/* Section: Ownership */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Ownership
            </p>
            <FormGrid>
              <SelectField
                label="Farmer"
                value={form.farmerId}
                onChange={(v) => {
                  set("farmerId")(v);
                  // Reset farm when farmer changes
                  set("farmId")("");
                }}
                options={farmers.map((f) => ({
                  value: f.id,
                  label: `${f.firstName} ${f.lastName}`,
                }))}
                required
                placeholder="— Select farmer —"
              />
              <SelectField
                label="Farm"
                value={form.farmId}
                onChange={set("farmId")}
                options={availableFarms.map((f) => ({ value: f.id, label: f.name }))}
                required
                placeholder="— Select farm —"
              />
            </FormGrid>
          </div>

          {/* Section: Identification */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Identification
            </p>
            <FormGrid>
              <TextField
                label="Tag Number"
                value={form.tagNumber}
                onChange={set("tagNumber")}
                required
                placeholder="e.g. EAR-2024-001"
              />
              <TextField
                label="Name (optional)"
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Daisy"
              />
              <TextField
                label="RFID Tag (optional)"
                value={form.rfidTag}
                onChange={set("rfidTag")}
                placeholder="e.g. 716000100101001"
              />
            </FormGrid>
          </div>

          {/* Section: Animal Details */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Animal Details
            </p>
            <FormGrid>
              <SelectField
                label="Breed"
                value={form.breed}
                onChange={set("breed")}
                options={BREEDS}
                required
                placeholder="— Select breed —"
              />
              <SelectField
                label="Sex"
                value={form.sex}
                onChange={set("sex")}
                options={[
                  { value: "Female", label: "Female" },
                  { value: "Male", label: "Male" },
                ]}
                required
              />
              <DateField
                label="Date of Birth (optional)"
                value={form.dateOfBirth}
                onChange={set("dateOfBirth")}
              />
              <TextField
                label="Color (optional)"
                value={form.color}
                onChange={set("color")}
                placeholder="e.g. Black & White"
              />
              <NumberField
                label="Weight (kg) (optional)"
                value={form.weightKg}
                onChange={set("weightKg")}
                min={0}
                step={0.1}
                placeholder="e.g. 420"
              />
              {form.sex === "Female" && (
                <SelectField
                  label="Lactation Status"
                  value={form.lactationStatus}
                  onChange={set("lactationStatus")}
                  options={["Dry", "Lactating", "Pregnant", "Open"]}
                  placeholder="— Select status —"
                />
              )}
            </FormGrid>
          </div>

          {/* Section: Registration */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Registration
            </p>
            <FormGrid>
              <DateField
                label="Registered Date"
                value={form.registeredDate}
                onChange={set("registeredDate")}
                required
              />
              <SelectField
                label="Registered By Agent (optional)"
                value={form.registeredByAgentId}
                onChange={set("registeredByAgentId")}
                options={saleAgents.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                }))}
                placeholder="— None —"
              />
              <SelectField
                label="Active"
                value={form.isActive}
                onChange={set("isActive")}
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
                required
              />
            </FormGrid>
          </div>

          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={set("notes")}
            placeholder="Optional notes about this animal…"
          />

          <FormButtons
            onCancel={() => setModalOpen(false)}
            submitLabel={editingId ? "Save Changes" : "Register Cattle"}
          />
        </form>
      </Modal>
    </>
  );
}
