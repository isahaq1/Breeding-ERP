"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Table,
  Th,
  Td,
  EmptyRow,
  Badge,
  PrimaryButton,
} from "@/components/ui";
import {
  Modal,
  FormGrid,
  FormButtons,
  DateField,
  SelectField,
  NumberField,
  TextAreaField,
  RowActions,
  TextField,
} from "@/components/forms";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import type {
  InseminationEvent,
  InseminationResult,
  ServiceMethod,
  PaymentStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/format";

// ---- Constants ---------------------------------------------------------------

const SERVICE_METHODS: ServiceMethod[] = [
  "Cervical",
  "Trans-Cervical",
  "Recto-vaginal",
];

const HEAT_CONFIRMED_BY_OPTIONS = ["IoT", "Visual", "Manual"] as const;

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  "Paid",
  "Pending",
  "Partial",
  "Overdue",
];

const RESULT_OPTIONS: InseminationResult[] = [
  "Pending PD",
  "Pregnant",
  "Open",
  "Repeat Service",
  "Aborted",
];

type ResultFilter = "All" | "Pending PD" | "Pregnant" | "Open";
const FILTER_TABS: ResultFilter[] = ["All", "Pending PD", "Pregnant", "Open"];

// ---- Result badge tone mapping -----------------------------------------------

function resultTone(
  result: InseminationResult,
): "amber" | "green" | "red" | "purple" | "gray" {
  switch (result) {
    case "Pending PD":
      return "amber";
    case "Pregnant":
      return "green";
    case "Open":
      return "red";
    case "Repeat Service":
      return "purple";
    case "Aborted":
      return "gray";
  }
}

// ---- Payment badge tone -------------------------------------------------------

function paymentTone(
  status: PaymentStatus,
): "green" | "amber" | "red" | "purple" | "gray" {
  switch (status) {
    case "Paid":
      return "green";
    case "Pending":
      return "amber";
    case "Partial":
      return "purple";
    case "Overdue":
      return "red";
    default:
      return "gray";
  }
}

// ---- Form shape --------------------------------------------------------------

interface Form {
  inseminationDate: string;
  inseminationTime: string;
  farmerCattleId: string;
  farmId: string;
  farmerId: string;
  agentId: string;
  semenCatalogId: string;
  dpId: string;
  serviceMethod: ServiceMethod;
  heatConfirmedBy: "IoT" | "Visual" | "Manual";
  serviceFeeUsd: string;
  paymentStatus: PaymentStatus;
  result: InseminationResult;
  pdScheduledDate: string;
  notes: string;
}

const emptyForm: Form = {
  inseminationDate: new Date().toISOString().slice(0, 10),
  inseminationTime: "",
  farmerCattleId: "",
  farmId: "",
  farmerId: "",
  agentId: "",
  semenCatalogId: "",
  dpId: "",
  serviceMethod: "Cervical",
  heatConfirmedBy: "Visual",
  serviceFeeUsd: "15",
  paymentStatus: "Pending",
  result: "Pending PD",
  pdScheduledDate: "",
  notes: "",
};

// ---- Page component ----------------------------------------------------------

export default function InseminationPage() {
  const {
    inseminationEvents,
    addInseminationEvent,
    update,
    remove,
    farmerCattle,
    farmers,
    farms,
    saleAgents,
    semenCatalog,
    distributionPoints,
  } = useData();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [filter, setFilter] = useState<ResultFilter>("All");

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // When farmerCattleId changes, auto-populate farmId and farmerId
  function handleFarmerCattleChange(id: string) {
    const fc = farmerCattle.find((c) => c.id === id);
    setForm((f) => ({
      ...f,
      farmerCattleId: id,
      farmId: fc?.farmId ?? f.farmId,
      farmerId: fc?.farmerId ?? f.farmerId,
    }));
  }

  // ---- Stats ----------------------------------------------------------------

  const totalServices = inseminationEvents.length;
  const pendingPD = inseminationEvents.filter(
    (e) => e.result === "Pending PD",
  ).length;
  const pregnantConfirmed = inseminationEvents.filter(
    (e) => e.result === "Pregnant",
  ).length;
  const openFailed = inseminationEvents.filter(
    (e) => e.result === "Open" || e.result === "Repeat Service",
  ).length;

  // ---- Filtered list --------------------------------------------------------

  const filtered = useMemo(() => {
    const base =
      filter === "All"
        ? inseminationEvents
        : inseminationEvents.filter((e) => e.result === filter);
    return [...base].sort((a, b) =>
      b.inseminationDate.localeCompare(a.inseminationDate),
    );
  }, [inseminationEvents, filter]);

  // ---- Lookup helpers -------------------------------------------------------

  function cattleLabel(fcId: string) {
    const fc = farmerCattle.find((c) => c.id === fcId);
    if (!fc) return fcId;
    return fc.name ? `${fc.tagNumber} — ${fc.name}` : fc.tagNumber;
  }

  function farmLabel(farmId: string) {
    return farms.find((f) => f.id === farmId)?.name ?? farmId;
  }

  function agentLabel(agentId: string) {
    const a = saleAgents.find((ag) => ag.id === agentId);
    return a ? `${a.firstName} ${a.lastName}` : agentId;
  }

  function bullLabel(catalogId: string) {
    return semenCatalog.find((s) => s.id === catalogId)?.bullName ?? catalogId;
  }

  // ---- Modal open/close helpers --------------------------------------------

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(evt: InseminationEvent) {
    setEditingId(evt.id);
    setForm({
      inseminationDate: evt.inseminationDate,
      inseminationTime: evt.inseminationTime ?? "",
      farmerCattleId: evt.farmerCattleId,
      farmId: evt.farmId,
      farmerId: evt.farmerId,
      agentId: evt.agentId,
      semenCatalogId: evt.semenCatalogId,
      dpId: evt.dpId ?? "",
      serviceMethod: evt.serviceMethod,
      heatConfirmedBy: evt.heatConfirmedBy,
      serviceFeeUsd: String(evt.serviceFeeUsd),
      paymentStatus: evt.paymentStatus,
      result: evt.result,
      pdScheduledDate: evt.pdScheduledDate ?? "",
      notes: evt.notes ?? "",
    });
    setOpen(true);
  }

  // ---- Submit ---------------------------------------------------------------

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();

    const payload: Omit<InseminationEvent, "id"> = {
      inseminationDate: form.inseminationDate,
      inseminationTime: form.inseminationTime || undefined,
      farmerCattleId: form.farmerCattleId,
      farmId: form.farmId,
      farmerId: form.farmerId,
      agentId: form.agentId,
      semenCatalogId: form.semenCatalogId,
      dpId: form.dpId || undefined,
      serviceMethod: form.serviceMethod,
      heatConfirmedBy: form.heatConfirmedBy,
      serviceFeeUsd: Number(form.serviceFeeUsd) || 0,
      paymentStatus: form.paymentStatus,
      result: form.result,
      pdScheduledDate: form.pdScheduledDate || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      update("inseminationEvents", editingId, payload);
    } else {
      addInseminationEvent(payload);
    }

    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <>
      <PageHeader
        title="AI Insemination Events"
        description="Track artificial insemination services, heat confirmation, and pregnancy outcomes for farmer cattle."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Record Service
          </PrimaryButton>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Services"
          value={String(totalServices)}
          iconName="syringe"
          tone="blue"
        />
        <StatCard
          label="Pending PD"
          value={String(pendingPD)}
          sublabel="awaiting diagnosis"
          iconName="stethoscope"
          tone="amber"
        />
        <StatCard
          label="Pregnant Confirmed"
          value={String(pregnantConfirmed)}
          iconName="heart"
          tone="green"
        />
        <StatCard
          label="Open / Failed"
          value={String(openFailed)}
          sublabel="open or repeat service"
          iconName="analytics"
          tone="red"
        />
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === tab
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-surface border border-line text-muted hover:bg-canvas"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-4">
        <CardHeader
          title={`Insemination Events${filter !== "All" ? ` — ${filter}` : ""}`}
          action={
            <span className="text-xs text-muted">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          }
        />
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Time</Th>
              <Th>Cow</Th>
              <Th>Farm</Th>
              <Th>Agent</Th>
              <Th>Bull</Th>
              <Th>Method</Th>
              <Th>Heat Source</Th>
              <Th>Fee</Th>
              <Th>Payment</Th>
              <Th>Result</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <EmptyRow colSpan={12} label="No insemination events found." />
            )}
            {filtered.map((evt) => (
              <tr key={evt.id} className="transition hover:bg-canvas/60">
                <Td className="font-medium">{formatDate(evt.inseminationDate)}</Td>
                <Td className="text-muted">{evt.inseminationTime ?? "—"}</Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="font-medium">{cattleLabel(evt.farmerCattleId)}</span>
                    <span className="text-xs text-muted">{evt.farmerCattleId}</span>
                  </div>
                </Td>
                <Td className="text-muted">{farmLabel(evt.farmId)}</Td>
                <Td className="text-muted">{agentLabel(evt.agentId)}</Td>
                <Td className="text-muted">{bullLabel(evt.semenCatalogId)}</Td>
                <Td>
                  <Badge tone="blue">{evt.serviceMethod}</Badge>
                </Td>
                <Td>
                  <Badge
                    tone={
                      evt.heatConfirmedBy === "IoT"
                        ? "green"
                        : evt.heatConfirmedBy === "Visual"
                        ? "blue"
                        : "gray"
                    }
                  >
                    {evt.heatConfirmedBy}
                  </Badge>
                </Td>
                <Td className="text-muted">${evt.serviceFeeUsd}</Td>
                <Td>
                  <Badge tone={paymentTone(evt.paymentStatus)}>
                    {evt.paymentStatus}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={resultTone(evt.result)}>{evt.result}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <RowActions
                      onEdit={() => openEdit(evt)}
                      onDelete={() => remove("inseminationEvents", evt.id)}
                      label={evt.id}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editingId ? `Edit Insemination Event — ${editingId}` : "Record AI Service"
        }
        description={
          editingId
            ? "Update the insemination event details below."
            : "Record a new artificial insemination service for a registered farmer cow."
        }
        size="lg"
      >
        <form onSubmit={submit} className="space-y-5 p-5">
          {/* Date & Time */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Service Date &amp; Time
            </p>
            <FormGrid>
              <DateField
                label="Insemination Date"
                value={form.inseminationDate}
                onChange={set("inseminationDate")}
                required
              />
              <TextField
                label="Time (optional)"
                value={form.inseminationTime}
                onChange={set("inseminationTime")}
                placeholder="e.g. 08:30"
                type="text"
              />
            </FormGrid>
          </div>

          {/* Animal & Participants */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Animal &amp; Participants
            </p>
            <FormGrid>
              <SelectField
                label="Farmer Cattle"
                value={form.farmerCattleId}
                onChange={handleFarmerCattleChange}
                options={farmerCattle.map((fc) => ({
                  value: fc.id,
                  label: `${fc.tagNumber}${fc.name ? ` — ${fc.name}` : ""} — ${fc.breed} (${fc.farmerId})`,
                }))}
                required
                placeholder="— Select cow —"
              />
              <SelectField
                label="Agent (AI Technician)"
                value={form.agentId}
                onChange={set("agentId")}
                options={saleAgents.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                }))}
                required
                placeholder="— Select agent —"
              />
              <SelectField
                label="Bull / Semen Lot"
                value={form.semenCatalogId}
                onChange={set("semenCatalogId")}
                options={semenCatalog.map((s) => ({
                  value: s.id,
                  label: `${s.bullName} (${s.bullRegNo}) — ${s.breed}`,
                }))}
                required
                placeholder="— Select bull —"
              />
              <SelectField
                label="Distribution Point (optional)"
                value={form.dpId}
                onChange={set("dpId")}
                options={distributionPoints.map((dp) => ({
                  value: dp.id,
                  label: `${dp.name} — ${dp.district}`,
                }))}
                placeholder="— None —"
              />
            </FormGrid>

            {/* Auto-populated read-only fields */}
            {(form.farmId || form.farmerId) && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-canvas/50 px-3 py-2">
                  <p className="text-xs font-medium text-muted">Farm (auto)</p>
                  <p className="mt-0.5 text-sm text-ink">
                    {farmLabel(form.farmId) || form.farmId || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-canvas/50 px-3 py-2">
                  <p className="text-xs font-medium text-muted">Farmer (auto)</p>
                  <p className="mt-0.5 text-sm text-ink">
                    {(() => {
                      const farmer = farmers.find((f) => f.id === form.farmerId);
                      return farmer
                        ? `${farmer.firstName} ${farmer.lastName}`
                        : form.farmerId || "—";
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Service Details */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Service Details
            </p>
            <FormGrid>
              <SelectField
                label="Service Method"
                value={form.serviceMethod}
                onChange={set("serviceMethod")}
                options={SERVICE_METHODS}
                required
              />
              <SelectField
                label="Heat Confirmed By"
                value={form.heatConfirmedBy}
                onChange={set("heatConfirmedBy")}
                options={HEAT_CONFIRMED_BY_OPTIONS as unknown as string[]}
                required
              />
            </FormGrid>
          </div>

          {/* Payment & Outcome */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Payment &amp; Outcome
            </p>
            <FormGrid>
              <NumberField
                label="Service Fee (USD)"
                value={form.serviceFeeUsd}
                onChange={set("serviceFeeUsd")}
                required
                min={0}
                step={0.01}
                placeholder="15"
              />
              <SelectField
                label="Payment Status"
                value={form.paymentStatus}
                onChange={set("paymentStatus")}
                options={PAYMENT_STATUS_OPTIONS}
                required
              />
              <SelectField
                label="Result"
                value={form.result}
                onChange={set("result")}
                options={RESULT_OPTIONS}
                required
              />
              <DateField
                label="PD Scheduled Date (optional)"
                value={form.pdScheduledDate}
                onChange={set("pdScheduledDate")}
              />
            </FormGrid>
          </div>

          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={set("notes")}
            placeholder="Optional notes about the service…"
          />

          <FormButtons
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? "Save Changes" : "Record Service"}
          />
        </form>
      </Modal>
    </>
  );
}
