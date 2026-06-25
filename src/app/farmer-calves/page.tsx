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
import {
  Modal,
  FormGrid,
  FormButtons,
  TextField,
  SelectField,
  DateField,
  NumberField,
  TextAreaField,
  RowActions,
} from "@/components/forms";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type { FarmerCalfBirth, FarmerCalfOutcome, CalvingEase } from "@/lib/types";

// ---- Tone helpers ------------------------------------------------------------

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "purple";

function outcomeTone(outcome: FarmerCalfOutcome): Tone {
  if (outcome === "Live Birth") return "green";
  if (outcome === "Stillbirth") return "red";
  if (outcome === "Died Shortly After") return "amber";
  return "gray"; // Aborted
}

function sexTone(sex: string): Tone {
  if (sex === "Male") return "blue";
  return "purple"; // Female (closest to pink available)
}

// ---- Form type --------------------------------------------------------------

type Form = {
  birthDate: string;
  farmerCattleId: string;
  inseminationEventId: string;
  farmerId: string;
  farmId: string;
  semenCatalogId: string;
  agentId: string;
  calfTagNumber: string;
  calfSex: string;
  calfBreed: string;
  calfWeightKg: string;
  calfName: string;
  outcome: string;
  calvingEase: string;
  reportedByFarmer: string;
  reportedByAgent: string;
  blockchainTxHash: string;
  notes: string;
};

const emptyForm: Form = {
  birthDate: "2026-06-25",
  farmerCattleId: "",
  inseminationEventId: "",
  farmerId: "",
  farmId: "",
  semenCatalogId: "",
  agentId: "",
  calfTagNumber: "",
  calfSex: "Female",
  calfBreed: "",
  calfWeightKg: "",
  calfName: "",
  outcome: "Live Birth",
  calvingEase: "",
  reportedByFarmer: "Yes",
  reportedByAgent: "No",
  blockchainTxHash: "",
  notes: "",
};

const OUTCOME_OPTIONS: FarmerCalfOutcome[] = [
  "Live Birth",
  "Stillbirth",
  "Died Shortly After",
  "Aborted",
];

const CALVING_EASE_OPTIONS: CalvingEase[] = [
  "Easy",
  "Assisted",
  "Difficult",
  "C-Section",
];

// ---- Page -------------------------------------------------------------------

export default function FarmerCalvesPage() {
  const {
    farmerCalfBirths,
    addFarmerCalfBirth,
    update,
    remove,
    farmerCattle,
    inseminationEvents,
    farmers,
    farms,
    saleAgents,
    semenCatalog,
  } = useData();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterFarm, setFilterFarm] = useState("");
  const [filterFarmer, setFilterFarmer] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterSex, setFilterSex] = useState("");

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Derived: insemination events for the selected cow
  const filteredInseminations = useMemo(
    () =>
      form.farmerCattleId
        ? inseminationEvents.filter((ie) => ie.farmerCattleId === form.farmerCattleId)
        : [],
    [inseminationEvents, form.farmerCattleId],
  );

  // Handler: when farmerCattleId changes, auto-populate farmId and farmerId
  function handleCowChange(cattleId: string) {
    const cow = farmerCattle.find((fc) => fc.id === cattleId);
    setForm((f) => ({
      ...f,
      farmerCattleId: cattleId,
      farmId: cow?.farmId ?? f.farmId,
      farmerId: cow?.farmerId ?? f.farmerId,
      // Clear insemination event when cow changes
      inseminationEventId: "",
      semenCatalogId: "",
      agentId: "",
    }));
  }

  // Handler: when inseminationEventId changes, auto-populate semenCatalogId and agentId
  function handleInseminationChange(ieId: string) {
    const ie = inseminationEvents.find((e) => e.id === ieId);
    setForm((f) => ({
      ...f,
      inseminationEventId: ieId,
      semenCatalogId: ie?.semenCatalogId ?? f.semenCatalogId,
      agentId: ie?.agentId ?? f.agentId,
    }));
  }

  // ---- Stats ----------------------------------------------------------------

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const liveBirths = farmerCalfBirths.filter((b) => b.outcome === "Live Birth").length;
  const stillDied = farmerCalfBirths.filter(
    (b) => b.outcome === "Stillbirth" || b.outcome === "Died Shortly After",
  ).length;
  const thisMonthCount = farmerCalfBirths.filter((b) =>
    b.birthDate.startsWith(thisMonth),
  ).length;

  // ---- Filtering ------------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...farmerCalfBirths]
      .sort((a, b) => b.birthDate.localeCompare(a.birthDate))
      .filter((b) => {
        const cow = farmerCattle.find((fc) => fc.id === b.farmerCattleId);
        const tag = (b.calfTagNumber ?? "").toLowerCase();
        const name = (b.calfName ?? "").toLowerCase();
        const cowTag = (cow?.tagNumber ?? "").toLowerCase();
        if (q && !tag.includes(q) && !name.includes(q) && !cowTag.includes(q)) return false;
        if (filterFarm && b.farmId !== filterFarm) return false;
        if (filterFarmer && b.farmerId !== filterFarmer) return false;
        if (filterOutcome && b.outcome !== filterOutcome) return false;
        if (filterSex && b.calfSex !== filterSex) return false;
        return true;
      });
  }, [farmerCalfBirths, farmerCattle, search, filterFarm, filterFarmer, filterOutcome, filterSex]);

  // ---- Modal helpers --------------------------------------------------------

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(b: FarmerCalfBirth) {
    setEditingId(b.id);
    setForm({
      birthDate: b.birthDate,
      farmerCattleId: b.farmerCattleId,
      inseminationEventId: b.inseminationEventId ?? "",
      farmerId: b.farmerId,
      farmId: b.farmId,
      semenCatalogId: b.semenCatalogId ?? "",
      agentId: b.agentId ?? "",
      calfTagNumber: b.calfTagNumber ?? "",
      calfSex: b.calfSex,
      calfBreed: b.calfBreed ?? "",
      calfWeightKg: b.calfWeightKg != null ? String(b.calfWeightKg) : "",
      calfName: b.calfName ?? "",
      outcome: b.outcome,
      calvingEase: b.calvingEase ?? "",
      reportedByFarmer: b.reportedByFarmer ? "Yes" : "No",
      reportedByAgent: b.reportedByAgent ? "Yes" : "No",
      blockchainTxHash: b.blockchainTxHash ?? "",
      notes: b.notes ?? "",
    });
    setOpen(true);
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (editingId) {
      update("farmerCalfBirths", editingId, {
        birthDate: form.birthDate,
        farmerCattleId: form.farmerCattleId,
        inseminationEventId: form.inseminationEventId || undefined,
        farmerId: form.farmerId,
        farmId: form.farmId,
        semenCatalogId: form.semenCatalogId || undefined,
        agentId: form.agentId || undefined,
        calfTagNumber: form.calfTagNumber || undefined,
        calfSex: form.calfSex as "Male" | "Female",
        calfBreed: form.calfBreed || undefined,
        calfWeightKg: form.calfWeightKg ? Number(form.calfWeightKg) : undefined,
        calfName: form.calfName || undefined,
        outcome: form.outcome as FarmerCalfOutcome,
        calvingEase: form.calvingEase ? (form.calvingEase as CalvingEase) : undefined,
        reportedByFarmer: form.reportedByFarmer === "Yes",
        reportedByAgent: form.reportedByAgent === "Yes",
        blockchainTxHash: form.blockchainTxHash || undefined,
        notes: form.notes || undefined,
      });
    } else {
      addFarmerCalfBirth({
        birthDate: form.birthDate,
        farmerCattleId: form.farmerCattleId,
        inseminationEventId: form.inseminationEventId || undefined,
        farmerId: form.farmerId,
        farmId: form.farmId,
        semenCatalogId: form.semenCatalogId || undefined,
        agentId: form.agentId || undefined,
        calfTagNumber: form.calfTagNumber || undefined,
        calfSex: form.calfSex as "Male" | "Female",
        calfBreed: form.calfBreed || undefined,
        calfWeightKg: form.calfWeightKg ? Number(form.calfWeightKg) : undefined,
        calfName: form.calfName || undefined,
        outcome: form.outcome as FarmerCalfOutcome,
        calvingEase: form.calvingEase ? (form.calvingEase as CalvingEase) : undefined,
        reportedByFarmer: form.reportedByFarmer === "Yes",
        reportedByAgent: form.reportedByAgent === "Yes",
        blockchainTxHash: form.blockchainTxHash || undefined,
        notes: form.notes || undefined,
      });
    }
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // ---- Lookup helpers -------------------------------------------------------

  function cowLabel(cattleId: string) {
    const cow = farmerCattle.find((fc) => fc.id === cattleId);
    if (!cow) return cattleId;
    return cow.name ? `${cow.tagNumber} (${cow.name})` : cow.tagNumber;
  }

  function farmLabel(farmId: string) {
    return farms.find((f) => f.id === farmId)?.name ?? farmId;
  }

  function agentLabel(agentId: string) {
    const a = saleAgents.find((s) => s.id === agentId);
    return a ? `${a.firstName} ${a.lastName}` : agentId;
  }

  function bullLabel(catalogId: string) {
    return semenCatalog.find((c) => c.id === catalogId)?.bullName ?? catalogId;
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <React.Fragment>
      <PageHeader
        title="Farmer Calf Births"
        description="Track calving outcomes for farmer-owned cattle inseminated through the AI programme."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Record Birth
          </PrimaryButton>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Births" value={String(farmerCalfBirths.length)} iconName="baby" tone="green" />
        <StatCard label="Live Births" value={String(liveBirths)} iconName="heart" tone="green" />
        <StatCard label="Stillbirths / Died" value={String(stillDied)} iconName="stethoscope" tone="red" />
        <StatCard label="Calves This Month" value={String(thisMonthCount)} iconName="analytics" tone="purple" />
      </div>

      {/* Filter bar */}
      <Card className="mt-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search calf tag, name, cow tag…"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <select
            value={filterFarm}
            onChange={(e) => setFilterFarm(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select
            value={filterFarmer}
            onChange={(e) => setFilterFarmer(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All Farmers</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>{f.firstName} {f.lastName}</option>
            ))}
          </select>
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All Outcomes</option>
            <option value="Live Birth">Live Birth</option>
            <option value="Stillbirth">Stillbirth</option>
            <option value="Died Shortly After">Died Shortly After</option>
            <option value="Aborted">Aborted</option>
          </select>
          <select
            value={filterSex}
            onChange={(e) => setFilterSex(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All Sexes</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="mt-4">
        <CardHeader title={`Calf Births (${filtered.length})`} />
        <Table>
          <thead>
            <tr>
              <Th>Birth Date</Th>
              <Th>Calf Tag</Th>
              <Th>Calf Name</Th>
              <Th>Sex</Th>
              <Th>Cow (Tag)</Th>
              <Th>Farm</Th>
              <Th>Agent</Th>
              <Th>Bull</Th>
              <Th>Outcome</Th>
              <Th>Calving Ease</Th>
              <Th>Reported By</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={12} label="No calf birth records found." />
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="transition hover:bg-canvas/60">
                  <Td>{formatDate(b.birthDate)}</Td>
                  <Td className="font-medium">{b.calfTagNumber ?? <span className="text-muted">—</span>}</Td>
                  <Td>{b.calfName ?? <span className="text-muted">—</span>}</Td>
                  <Td>
                    <Badge tone={sexTone(b.calfSex)}>{b.calfSex}</Badge>
                  </Td>
                  <Td className="text-muted">{cowLabel(b.farmerCattleId)}</Td>
                  <Td className="text-muted">{farmLabel(b.farmId)}</Td>
                  <Td className="text-muted">
                    {b.agentId ? agentLabel(b.agentId) : <span className="text-muted">—</span>}
                  </Td>
                  <Td className="text-muted">
                    {b.semenCatalogId ? bullLabel(b.semenCatalogId) : <span className="text-muted">—</span>}
                  </Td>
                  <Td>
                    <Badge tone={outcomeTone(b.outcome)}>{b.outcome}</Badge>
                  </Td>
                  <Td>
                    {b.calvingEase ? (
                      <span className="text-sm text-muted">{b.calvingEase}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      {b.reportedByFarmer && <Badge tone="blue">Farmer</Badge>}
                      {b.reportedByAgent && <Badge tone="purple">Agent</Badge>}
                      {!b.reportedByFarmer && !b.reportedByAgent && (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <RowActions
                        onEdit={() => openEdit(b)}
                        onDelete={() => {
                          if (window.confirm(`Delete birth record ${b.id}? This cannot be undone.`)) {
                            remove("farmerCalfBirths", b.id);
                          }
                        }}
                        label={b.id}
                      />
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Calf Birth Record" : "Record Calf Birth"}
        description={
          editingId
            ? `Editing record ${editingId}.`
            : "Record a calving outcome for a farmer-owned AI-inseminated cow."
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6 p-5">
          {/* Section 1 — Birth Details */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Birth Details
            </p>
            <FormGrid>
              <DateField
                label="Birth Date"
                value={form.birthDate}
                onChange={set("birthDate")}
                required
              />
              <SelectField
                label="Farmer Cattle (Cow)"
                value={form.farmerCattleId}
                onChange={handleCowChange}
                options={farmerCattle.map((fc) => ({
                  value: fc.id,
                  label: fc.name ? `${fc.tagNumber} — ${fc.name}` : fc.tagNumber,
                }))}
                required
                placeholder="— Select cow —"
              />
              <SelectField
                label="Insemination Event (optional)"
                value={form.inseminationEventId}
                onChange={handleInseminationChange}
                options={filteredInseminations.map((ie) => ({
                  value: ie.id,
                  label: `${ie.inseminationDate} · ${ie.result}`,
                }))}
                placeholder="— Select insemination event —"
              />
              <SelectField
                label="Outcome"
                value={form.outcome}
                onChange={set("outcome")}
                options={OUTCOME_OPTIONS}
                required
              />
              <SelectField
                label="Calving Ease (optional)"
                value={form.calvingEase}
                onChange={set("calvingEase")}
                options={CALVING_EASE_OPTIONS}
                placeholder="— Select calving ease —"
              />
            </FormGrid>
          </div>

          {/* Section 2 — Calf Details */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Calf Details
            </p>
            <FormGrid>
              <TextField
                label="Calf Tag Number (optional)"
                value={form.calfTagNumber}
                onChange={set("calfTagNumber")}
                placeholder="e.g. CAL-0042"
              />
              <TextField
                label="Calf Name (optional)"
                value={form.calfName}
                onChange={set("calfName")}
                placeholder="e.g. Blossom"
              />
              <SelectField
                label="Calf Sex"
                value={form.calfSex}
                onChange={set("calfSex")}
                options={["Female", "Male"]}
                required
              />
              <TextField
                label="Calf Breed (optional)"
                value={form.calfBreed}
                onChange={set("calfBreed")}
                placeholder="e.g. Friesian Cross"
              />
              <NumberField
                label="Calf Weight (kg, optional)"
                value={form.calfWeightKg}
                onChange={set("calfWeightKg")}
                min={0}
                placeholder="e.g. 32"
              />
            </FormGrid>
          </div>

          {/* Section 3 — Reporting */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Reporting
            </p>
            <FormGrid>
              <SelectField
                label="Agent (optional)"
                value={form.agentId}
                onChange={set("agentId")}
                options={saleAgents.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                }))}
                placeholder="— Select agent —"
              />
              <SelectField
                label="Bull / Semen (optional)"
                value={form.semenCatalogId}
                onChange={set("semenCatalogId")}
                options={semenCatalog.map((c) => ({
                  value: c.id,
                  label: c.bullName,
                }))}
                placeholder="— Select bull —"
              />
              <SelectField
                label="Reported by Farmer"
                value={form.reportedByFarmer}
                onChange={set("reportedByFarmer")}
                options={["Yes", "No"]}
              />
              <SelectField
                label="Reported by Agent"
                value={form.reportedByAgent}
                onChange={set("reportedByAgent")}
                options={["Yes", "No"]}
              />
              <TextField
                label="Blockchain Tx Hash (optional)"
                value={form.blockchainTxHash}
                onChange={set("blockchainTxHash")}
                placeholder="0x…"
              />
            </FormGrid>
            <div className="mt-4">
              <TextAreaField
                label="Notes (optional)"
                value={form.notes}
                onChange={set("notes")}
                placeholder="Any additional observations…"
              />
            </div>
          </div>

          <FormButtons
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? "Save Changes" : "Record Birth"}
          />
        </form>
      </Modal>
    </React.Fragment>
  );
}
