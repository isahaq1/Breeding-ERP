"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader, Card, StatCard, Table, Th, Td,
  StatusBadge, PrimaryButton, EmptyRow, Badge, CardHeader,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal, FormGrid, FormButtons, TextField, DateField,
  SelectField, TextAreaField, NumberField,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type {
  BullRegistration, BullRegistrationStatus, BSEGrade, QuarantineStatus,
  HealthRecord, HealthEventType, Vaccination,
} from "@/lib/types";

// ── helpers ─────────────────────────────────────────────────────────────────

function regStatusTone(s: BullRegistrationStatus): "green" | "amber" | "red" | "blue" {
  if (s === "Active") return "green";
  if (s === "Pending") return "blue";
  if (s === "Expired") return "amber";
  return "red";
}

function bseTone(g?: BSEGrade): "green" | "amber" | "red" | "gray" {
  if (!g) return "gray";
  if (g === "Satisfactory") return "green";
  if (g === "Deferred") return "amber";
  if (g === "Unsatisfactory") return "red";
  return "gray";
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const REG_STATUSES: BullRegistrationStatus[] = ["Active", "Pending", "Expired", "Rejected"];
const BSE_GRADES: BSEGrade[] = ["Satisfactory", "Unsatisfactory", "Deferred", "Not Tested"];
const QUARANTINE_STATUSES: QuarantineStatus[] = ["Not Required", "In Quarantine", "Cleared", "Failed"];
const HEALTH_TYPES: HealthEventType[] = ["Illness", "Injury", "Treatment", "Checkup", "Deworming", "Surgery"];
const HEALTH_STATUSES = ["Resolved", "Ongoing", "Monitoring"] as const;
const VAX_STATUSES = ["Completed", "Due", "Overdue", "Scheduled"] as const;

const emptyForm = {
  bullId: "",
  regNo: "",
  authority: "",
  country: "Zimbabwe",
  issueDate: "",
  expiryDate: "",
  certificateNo: "",
  status: "Active" as BullRegistrationStatus,
  bseGrade: "" as BSEGrade | "",
  bseDate: "",
  bseTechnician: "",
  brucellosisClear: "true",
  tbClear: "true",
  viralDiseasesClear: "true",
  clearanceDate: "",
  isImported: "false",
  importPermitNo: "",
  countryOfOrigin: "",
  quarantineStatus: "Not Required" as QuarantineStatus,
  quarantineClearanceDate: "",
  notes: "",
};

const emptyHealth = {
  cattleId: "",
  type: "Checkup" as HealthEventType,
  diagnosis: "",
  treatment: "",
  date: "2026-06-24",
  vet: "",
  status: "Resolved" as HealthRecord["status"],
  costUsd: "",
};

const emptyVax = {
  cattleId: "",
  vaccine: "",
  date: "2026-06-24",
  nextDue: "",
  administeredBy: "",
  status: "Completed" as Vaccination["status"],
};

// ── page ─────────────────────────────────────────────────────────────────────

export default function BullRegistryPage() {
  const {
    cattle, semenCatalog, semenBirths,
    bullRegistrations, addBullRegistration,
    healthRecords, addHealth,
    vaccinations, addVaccination,
    update, remove,
  } = useData();

  const [mainTab, setMainTab] = useState<"registry" | "health" | "vaccinations">("registry");
  const [view, setView]       = useState<"all" | "own" | "imported" | "pending">("all");
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [detailBullId, setDetailBullId] = useState<string | null>(null);

  const [healthOpen, setHealthOpen]   = useState(false);
  const [editingHealthId, setEditingHealthId] = useState<string | null>(null);
  const [healthForm, setHealthForm]   = useState(emptyHealth);

  const [vaxOpen, setVaxOpen]     = useState(false);
  const [editingVaxId, setEditingVaxId] = useState<string | null>(null);
  const [vaxForm, setVaxForm]     = useState(emptyVax);

  const set  = (k: keyof typeof emptyForm)   => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const setH = (k: keyof typeof emptyHealth) => (v: string) => setHealthForm(f => ({ ...f, [k]: v }));
  const setV = (k: keyof typeof emptyVax)    => (v: string) => setVaxForm(f => ({ ...f, [k]: v }));

  // All bulls from cattle registry
  const allBulls = useMemo(
    () => cattle.filter(c => c.class === "Bull"),
    [cattle],
  );
  const bullIds = useMemo(() => new Set(allBulls.map(b => b.id)), [allBulls]);

  // Filter health / vaccination records to bulls only
  const bullHealthRecords = useMemo(
    () => healthRecords.filter(h => bullIds.has(h.cattleId)),
    [healthRecords, bullIds],
  );
  const bullVaccinations = useMemo(
    () => vaccinations.filter(v => bullIds.has(v.cattleId)),
    [vaccinations, bullIds],
  );

  function bullName(id: string) {
    const b = allBulls.find(x => x.id === id);
    return b ? `${b.name} (${b.id})` : id;
  }

  // Derived stats per bull
  function strawsInStock(bullId: string) {
    return semenCatalog
      .filter(s => s.ownBullId === bullId || s.bullName === cattle.find(c => c.id === bullId)?.name)
      .reduce((n, s) => n + s.initialStraws, 0);
  }

  function progenyCount(bullId: string) {
    const bull = cattle.find(c => c.id === bullId);
    if (!bull) return 0;
    const catalogIds = semenCatalog
      .filter(s => s.ownBullId === bullId || s.bullName === bull.name)
      .map(s => s.id);
    return semenBirths.filter(b => catalogIds.includes(b.semenCatalogId) && b.status === "Live Birth").length;
  }

  // Build view rows: bulls enriched with their registration record (if any)
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allBulls
      .filter(b => {
        if (q && !`${b.id} ${b.name} ${b.breed}`.toLowerCase().includes(q)) return false;
        const reg = bullRegistrations.find(r => r.bullId === b.id);
        if (view === "own")      return !reg?.isImported;
        if (view === "imported") return reg?.isImported === true;
        if (view === "pending")  return !reg || reg.status === "Pending" || reg.status === "Expired";
        return true;
      })
      .map(b => ({
        bull: b,
        reg: bullRegistrations.find(r => r.bullId === b.id) ?? null,
        straws: strawsInStock(b.id),
        progeny: progenyCount(b.id),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBulls, bullRegistrations, semenCatalog, semenBirths, query, view]);

  // Summary stats
  const registered   = bullRegistrations.filter(r => r.status === "Active").length;
  const bseCert      = bullRegistrations.filter(r => r.bseGrade === "Satisfactory").length;
  const ongoingHealth = bullHealthRecords.filter(h => h.status === "Ongoing").length;
  const vaccinationsDue = bullVaccinations.filter(v => v.status === "Due" || v.status === "Overdue").length;

  function openAdd(bullId = "") {
    setEditingId(null);
    setForm({ ...emptyForm, bullId });
    setOpen(true);
  }

  function openEdit(reg: BullRegistration) {
    setEditingId(reg.id);
    setForm({
      bullId:                 reg.bullId,
      regNo:                  reg.regNo,
      authority:              reg.authority,
      country:                reg.country,
      issueDate:              reg.issueDate,
      expiryDate:             reg.expiryDate,
      certificateNo:          reg.certificateNo ?? "",
      status:                 reg.status,
      bseGrade:               reg.bseGrade ?? "",
      bseDate:                reg.bseDate ?? "",
      bseTechnician:          reg.bseTechnician ?? "",
      brucellosisClear:       String(reg.brucellosisClear),
      tbClear:                String(reg.tbClear),
      viralDiseasesClear:     String(reg.viralDiseasesClear),
      clearanceDate:          reg.clearanceDate ?? "",
      isImported:             String(reg.isImported),
      importPermitNo:         reg.importPermitNo ?? "",
      countryOfOrigin:        reg.countryOfOrigin ?? "",
      quarantineStatus:       reg.quarantineStatus ?? "Not Required",
      quarantineClearanceDate:reg.quarantineClearanceDate ?? "",
      notes:                  reg.notes ?? "",
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      bullId:            form.bullId,
      regNo:             form.regNo.trim(),
      authority:         form.authority.trim(),
      country:           form.country.trim(),
      issueDate:         form.issueDate,
      expiryDate:        form.expiryDate,
      certificateNo:     form.certificateNo.trim() || undefined,
      status:            form.status,
      bseGrade:          (form.bseGrade || undefined) as BSEGrade | undefined,
      bseDate:           form.bseDate || undefined,
      bseTechnician:     form.bseTechnician.trim() || undefined,
      brucellosisClear:  form.brucellosisClear === "true",
      tbClear:           form.tbClear === "true",
      viralDiseasesClear:form.viralDiseasesClear === "true",
      clearanceDate:     form.clearanceDate || undefined,
      isImported:        form.isImported === "true",
      importPermitNo:    form.importPermitNo.trim() || undefined,
      countryOfOrigin:   form.countryOfOrigin.trim() || undefined,
      quarantineStatus:  (form.isImported === "true" ? form.quarantineStatus : undefined) as QuarantineStatus | undefined,
      quarantineClearanceDate: form.quarantineClearanceDate || undefined,
      notes:             form.notes.trim() || undefined,
    };
    if (editingId) {
      update("bullRegistrations", editingId, payload);
    } else {
      addBullRegistration(payload);
    }
    setOpen(false);
  }

  function submitHealth(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<HealthRecord, "id"> = {
      cattleId:  healthForm.cattleId,
      type:      healthForm.type,
      diagnosis: healthForm.diagnosis.trim(),
      treatment: healthForm.treatment.trim(),
      date:      healthForm.date,
      vet:       healthForm.vet.trim(),
      status:    healthForm.status,
      costUsd:   Number(healthForm.costUsd) || 0,
    };
    if (editingHealthId) update("healthRecords", editingHealthId, payload);
    else addHealth(payload);
    setHealthOpen(false);
    setEditingHealthId(null);
    setHealthForm(emptyHealth);
  }

  function submitVax(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<Vaccination, "id"> = {
      cattleId:      vaxForm.cattleId,
      vaccine:       vaxForm.vaccine.trim(),
      date:          vaxForm.date,
      nextDue:       vaxForm.nextDue,
      administeredBy:vaxForm.administeredBy.trim(),
      status:        vaxForm.status,
    };
    if (editingVaxId) update("vaccinations", editingVaxId, payload);
    else addVaccination(payload);
    setVaxOpen(false);
    setEditingVaxId(null);
    setVaxForm(emptyVax);
  }

  const detailBull = detailBullId ? allBulls.find(b => b.id === detailBullId) : null;
  const detailReg  = detailBullId ? bullRegistrations.find(r => r.bullId === detailBullId) : null;

  return (
    <>
      <PageHeader
        title="Bull Registry"
        description={`${allBulls.length} bulls registered · manage government registration, BSE status and import clearances.`}
        action={
          mainTab === "registry" ? (
            <PrimaryButton onClick={() => openAdd()}>
              <Icon.plus width={16} height={16} />
              Add Registration
            </PrimaryButton>
          ) : mainTab === "health" ? (
            <PrimaryButton onClick={() => { setHealthForm(emptyHealth); setEditingHealthId(null); setHealthOpen(true); }}>
              <Icon.plus width={16} height={16} />
              Add Health Record
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => { setVaxForm(emptyVax); setEditingVaxId(null); setVaxOpen(true); }}>
              <Icon.plus width={16} height={16} />
              Add Vaccination
            </PrimaryButton>
          )
        }
      />

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Bulls" value={String(allBulls.length)} iconName="cow" tone="blue" />
        <StatCard label="Govt. Registered" value={String(registered)} iconName="shield" tone="green" />
        <StatCard label="BSE Certified" value={String(bseCert)} iconName="vial" tone="purple" />
        <StatCard label="Ongoing Illness" value={String(ongoingHealth)} iconName="stethoscope" tone={ongoingHealth > 0 ? "amber" : "green"} />
        <StatCard label="Vax Due / Overdue" value={String(vaccinationsDue)} iconName="syringe" tone={vaccinationsDue > 0 ? "red" : "green"} />
      </div>

      {/* ── Main tabs ─────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-1 rounded-xl border border-line bg-canvas p-1 w-fit">
        {(["registry", "health", "vaccinations"] as const).map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${mainTab === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            {t === "registry" ? "Registry" : t === "health" ? `Health Records${ongoingHealth > 0 ? ` (${ongoingHealth})` : ""}` : `Vaccinations${vaccinationsDue > 0 ? ` (${vaccinationsDue})` : ""}`}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════ REGISTRY TAB ════════════════════════ */}
      {mainTab === "registry" && (
        <>
          {/* ── View tabs + search ─────────────────────────────────────── */}
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex overflow-hidden rounded-lg border border-line text-sm">
                {(["all","own","imported","pending"] as const).map(v => (
                  <button key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 font-medium transition capitalize ${
                      view === v ? "bg-brand-600 text-white" : "bg-surface text-muted hover:bg-canvas"
                    }`}>
                    {v === "pending" ? "Needs Attention" : v === "all" ? "All Bulls" : v === "own" ? "Own Farm" : "Imported"}
                  </button>
                ))}
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
                <Icon.search width={15} height={15} className="text-muted" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, ID or breed…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </div>
            </div>
          </Card>

          {/* ── Main table ────────────────────────────────────────────── */}
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Bull</Th>
                  <Th>Breed</Th>
                  <Th>Source</Th>
                  <Th>Reg. Number</Th>
                  <Th>Authority</Th>
                  <Th>BSE</Th>
                  <Th>Straws</Th>
                  <Th>Progeny</Th>
                  <Th>Expiry</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={11} label="No bulls match your filters." />}
                {rows.map(({ bull, reg, straws, progeny }) => {
                  const d   = reg ? daysUntil(reg.expiryDate) : null;
                  const exp = d !== null && d <= 90 && (reg?.status === "Active");
                  return (
                    <tr key={bull.id} className="transition hover:bg-canvas/60">
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetailBullId(id => id === bull.id ? null : bull.id)}
                            className="font-semibold text-brand-700 hover:underline text-left"
                          >
                            {bull.name}
                          </button>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-muted">{bull.id}</span>
                        </div>
                      </Td>
                      <Td className="text-muted">{bull.breed}</Td>
                      <Td>
                        {reg?.isImported
                          ? <Badge tone="blue">Imported</Badge>
                          : <Badge tone="green">Own Farm</Badge>}
                      </Td>
                      <Td>
                        {reg
                          ? <span className="font-mono text-xs text-ink">{reg.regNo}</span>
                          : <span className="text-muted/50">—</span>}
                      </Td>
                      <Td className="text-sm text-muted">{reg?.authority ?? "—"}</Td>
                      <Td>
                        {reg?.bseGrade
                          ? <Badge tone={bseTone(reg.bseGrade)}>{reg.bseGrade}</Badge>
                          : <span className="text-muted/50">—</span>}
                      </Td>
                      <Td className="font-mono text-sm">{straws > 0 ? straws : "—"}</Td>
                      <Td className="font-mono text-sm">{progeny > 0 ? progeny : "—"}</Td>
                      <Td>
                        {reg ? (
                          <span className={`text-xs font-medium ${exp ? "text-amber-600" : "text-muted"}`}>
                            {formatDate(reg.expiryDate)}
                            {exp && <span className="ml-1 text-amber-500">({d}d)</span>}
                          </span>
                        ) : "—"}
                      </Td>
                      <Td>
                        {reg
                          ? <Badge tone={regStatusTone(reg.status)}>{reg.status}</Badge>
                          : <Badge tone="amber">Pending</Badge>}
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/cattle/${bull.id}`}
                            className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink"
                            title="View cattle profile">
                            <Icon.cow width={14} height={14} />
                          </Link>
                          {reg ? (
                            <>
                              <button onClick={() => openEdit(reg)}
                                className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink"
                                title="Edit registration">
                                <Icon.edit width={14} height={14} />
                              </button>
                              <button onClick={() => remove("bullRegistrations", reg.id)}
                                className="rounded p-1.5 text-red-400 hover:bg-red-50"
                                title="Remove registration">
                                <Icon.trash width={14} height={14} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => openAdd(bull.id)}
                              className="flex items-center gap-1 rounded-lg border border-dashed border-brand-400 px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50">
                              <Icon.plus width={11} height={11} /> Register
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>

          {/* ── Detail panel ──────────────────────────────────────────── */}
          {detailBull && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">

              {/* Registration card */}
              <Card>
                <CardHeader title={`${detailBull.name} — Government Registration`}
                  action={detailReg && (
                    <button onClick={() => detailReg && openEdit(detailReg)}
                      className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:bg-canvas">
                      <Icon.edit width={12} height={12} /> Edit
                    </button>
                  )} />
                {detailReg ? (
                  <div className="divide-y divide-line text-sm">
                    {[
                      ["Reg. Number",  detailReg.regNo],
                      ["Authority",    detailReg.authority],
                      ["Country",      detailReg.country],
                      ["Certificate",  detailReg.certificateNo ?? "—"],
                      ["Issue Date",   formatDate(detailReg.issueDate)],
                      ["Expiry Date",  formatDate(detailReg.expiryDate)],
                      ["Status",       detailReg.status],
                      ["BSE Grade",    detailReg.bseGrade ?? "—"],
                      ["BSE Date",     detailReg.bseDate ? formatDate(detailReg.bseDate) : "—"],
                      ["BSE Technician", detailReg.bseTechnician ?? "—"],
                      ["Brucellosis",  detailReg.brucellosisClear ? "✓ Cleared" : "✗ Not cleared"],
                      ["Tuberculosis", detailReg.tbClear ? "✓ Cleared" : "✗ Not cleared"],
                      ["Viral Diseases", detailReg.viralDiseasesClear ? "✓ Cleared" : "✗ Not cleared"],
                      ["Clearance Date", detailReg.clearanceDate ? formatDate(detailReg.clearanceDate) : "—"],
                      ...(detailReg.isImported ? [
                        ["Import Permit", detailReg.importPermitNo ?? "—"],
                        ["Origin Country", detailReg.countryOfOrigin ?? "—"],
                        ["Quarantine",   detailReg.quarantineStatus ?? "—"],
                      ] : []),
                    ].map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between px-5 py-2.5">
                        <span className="text-muted">{label}</span>
                        <span className={`font-medium ${String(val).startsWith("✓") ? "text-green-600" : String(val).startsWith("✗") ? "text-red-500" : "text-ink"}`}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Icon.shield width={36} height={36} className="text-muted/40" />
                    <p className="text-sm text-muted">No government registration on file.</p>
                    <button onClick={() => openAdd(detailBull.id)}
                      className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100">
                      Register Now
                    </button>
                  </div>
                )}
              </Card>

              {/* Semen & Progeny stats */}
              <Card>
                <CardHeader title="Semen & Progeny Summary" />
                <div className="space-y-4 p-5">
                  {(() => {
                    const lots = semenCatalog.filter(
                      s => s.ownBullId === detailBull.id || s.bullName === detailBull.name,
                    );
                    return lots.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Semen Lots</p>
                        <div className="space-y-1.5">
                          {lots.map(lot => (
                            <div key={lot.id} className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-sm">
                              <div>
                                <span className="font-mono text-xs text-muted">{lot.id}</span>
                                <span className="ml-2 text-muted">· {lot.strawType} · {lot.progressiveMotilityPct}% mot.</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge tone={lot.status === "Available" ? "green" : lot.status === "Low Stock" ? "amber" : "red"}>{lot.status}</Badge>
                                <span className="font-semibold">{lot.initialStraws} straws</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">No semen lots on record.</p>
                    );
                  })()}

                  {(() => {
                    const catalogIds = semenCatalog
                      .filter(s => s.ownBullId === detailBull.id || s.bullName === detailBull.name)
                      .map(s => s.id);
                    const births = semenBirths.filter(b => catalogIds.includes(b.semenCatalogId));
                    if (births.length === 0) return <p className="text-sm text-muted">No AI births recorded.</p>;
                    const live      = births.filter(b => b.status === "Live Birth").length;
                    const pregnant  = births.filter(b => b.status === "Pregnant").length;
                    const stillborn = births.filter(b => b.status === "Stillbirth").length;
                    const openCount = births.filter(b => b.status === "Open").length;
                    return (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">AI Outcomes</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "Live",     val: live,       color: "text-green-600 bg-green-50" },
                            { label: "Pregnant", val: pregnant,   color: "text-blue-600 bg-blue-50" },
                            { label: "Open",     val: openCount,  color: "text-amber-600 bg-amber-50" },
                            { label: "Stillborn",val: stillborn,  color: "text-red-600 bg-red-50" },
                          ].map(({ label, val, color }) => (
                            <div key={label} className={`rounded-xl p-2.5 text-center ${color}`}>
                              <p className="text-xl font-bold">{val}</p>
                              <p className="text-[10px] font-semibold">{label}</p>
                            </div>
                          ))}
                        </div>
                        {births.length > 0 && (
                          <p className="mt-2 text-center text-xs text-muted">
                            Conception rate: {births.length > 0 ? Math.round(live / births.length * 100) : 0}% live ({births.length} AI records)
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════ HEALTH RECORDS TAB ══════════════════ */}
      {mainTab === "health" && (
        <>
          {ongoingHealth > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Icon.stethoscope width={16} height={16} className="text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                {ongoingHealth} bull{ongoingHealth > 1 ? "s have" : " has"} ongoing health issues requiring attention.
              </p>
            </div>
          )}
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Ref</Th>
                  <Th>Bull</Th>
                  <Th>Type</Th>
                  <Th>Date</Th>
                  <Th>Diagnosis</Th>
                  <Th>Treatment</Th>
                  <Th>Vet</Th>
                  <Th>Cost (USD)</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {bullHealthRecords.length === 0 && <EmptyRow colSpan={10} label="No health records for bulls." />}
                {[...bullHealthRecords].sort((a, b) => b.date.localeCompare(a.date)).map(h => (
                  <tr key={h.id} className="transition hover:bg-canvas/60">
                    <Td className="font-mono text-xs text-muted">{h.id}</Td>
                    <Td className="font-medium">
                      <Link href={`/cattle/${h.cattleId}`} className="text-brand-700 hover:underline">
                        {bullName(h.cattleId)}
                      </Link>
                    </Td>
                    <Td><Badge tone="blue">{h.type}</Badge></Td>
                    <Td className="text-xs text-muted">{formatDate(h.date)}</Td>
                    <Td className="max-w-[200px] text-xs">{h.diagnosis}</Td>
                    <Td className="max-w-[200px] text-xs text-muted">{h.treatment}</Td>
                    <Td className="text-xs text-muted">{h.vet}</Td>
                    <Td className="font-mono text-sm">${h.costUsd.toFixed(2)}</Td>
                    <Td>
                      <Badge tone={h.status === "Resolved" ? "green" : h.status === "Ongoing" ? "red" : "amber"}>{h.status}</Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => {
                          setHealthForm({
                            cattleId: h.cattleId, type: h.type, diagnosis: h.diagnosis,
                            treatment: h.treatment, date: h.date, vet: h.vet,
                            status: h.status, costUsd: String(h.costUsd),
                          });
                          setEditingHealthId(h.id);
                          setHealthOpen(true);
                        }} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                        <button onClick={() => remove("healthRecords", h.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════ VACCINATIONS TAB ════════════════════ */}
      {mainTab === "vaccinations" && (
        <>
          {vaccinationsDue > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Icon.syringe width={16} height={16} className="text-red-600" />
              <p className="text-sm font-medium text-red-800">
                {vaccinationsDue} vaccination{vaccinationsDue > 1 ? "s" : ""} due or overdue for bulls.
              </p>
            </div>
          )}
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Ref</Th>
                  <Th>Bull</Th>
                  <Th>Vaccine</Th>
                  <Th>Date Given</Th>
                  <Th>Next Due</Th>
                  <Th>Administered By</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {bullVaccinations.length === 0 && <EmptyRow colSpan={8} label="No vaccination records for bulls." />}
                {[...bullVaccinations].sort((a, b) => b.date.localeCompare(a.date)).map(v => (
                  <tr key={v.id} className="transition hover:bg-canvas/60">
                    <Td className="font-mono text-xs text-muted">{v.id}</Td>
                    <Td className="font-medium">
                      <Link href={`/cattle/${v.cattleId}`} className="text-brand-700 hover:underline">
                        {bullName(v.cattleId)}
                      </Link>
                    </Td>
                    <Td className="text-sm font-medium">{v.vaccine}</Td>
                    <Td className="text-xs text-muted">{formatDate(v.date)}</Td>
                    <Td className="text-xs font-medium">
                      {v.nextDue ? (
                        <span className={daysUntil(v.nextDue) < 0 ? "text-red-600 font-bold" : daysUntil(v.nextDue) <= 14 ? "text-amber-600" : "text-muted"}>
                          {formatDate(v.nextDue)}
                          {daysUntil(v.nextDue) < 0 && " (OVERDUE)"}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td className="text-xs text-muted">{v.administeredBy}</Td>
                    <Td>
                      <Badge tone={v.status === "Completed" ? "green" : v.status === "Scheduled" ? "blue" : v.status === "Due" ? "amber" : "red"}>{v.status}</Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => {
                          setVaxForm({
                            cattleId: v.cattleId, vaccine: v.vaccine, date: v.date,
                            nextDue: v.nextDue, administeredBy: v.administeredBy, status: v.status,
                          });
                          setEditingVaxId(v.id);
                          setVaxOpen(true);
                        }} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                        <button onClick={() => remove("vaccinations", v.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {/* ── Registration form modal ─────────────────────────────── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Bull Registration" : "Register Bull with Government"}
        description="Record official government registration, BSE certification and health clearances."
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Bull" value={form.bullId} onChange={set("bullId")}
              options={allBulls.map(b => ({ value: b.id, label: `${b.name} (${b.id}) — ${b.breed}` }))}
              placeholder="Select a bull" required />
            <SelectField label="Registration Status" value={form.status} onChange={set("status")} options={REG_STATUSES} />

            <div className="col-span-2 border-t border-line pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Registration Details</span>
            </div>
            <TextField label="Registration Number" value={form.regNo} onChange={set("regNo")} required placeholder="e.g. ZW-BULL-2025-0001" />
            <TextField label="Certificate Number" value={form.certificateNo} onChange={set("certificateNo")} placeholder="e.g. DLVS/CERT/2025/001" />
            <TextField label="Registering Authority" value={form.authority} onChange={set("authority")} required placeholder="e.g. Dept. of Livestock & Veterinary Services" />
            <TextField label="Country" value={form.country} onChange={set("country")} required />
            <DateField label="Issue Date" value={form.issueDate} onChange={set("issueDate")} required />
            <DateField label="Expiry Date" value={form.expiryDate} onChange={set("expiryDate")} required />

            <div className="col-span-2 border-t border-line pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Breeding Soundness Evaluation (BSE)</span>
            </div>
            <SelectField label="BSE Grade" value={form.bseGrade} onChange={set("bseGrade")} options={BSE_GRADES} placeholder="— Not evaluated —" />
            <DateField label="BSE Date" value={form.bseDate} onChange={set("bseDate")} />
            <TextField label="BSE Technician / Vet" value={form.bseTechnician} onChange={set("bseTechnician")} placeholder="Dr. Name" />
            <div />

            <div className="col-span-2 border-t border-line pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Health Clearances</span>
            </div>
            <SelectField label="Brucellosis" value={form.brucellosisClear} onChange={set("brucellosisClear")} options={[{value:"true",label:"Cleared"},{value:"false",label:"Not Cleared"}]} />
            <SelectField label="Tuberculosis" value={form.tbClear} onChange={set("tbClear")} options={[{value:"true",label:"Cleared"},{value:"false",label:"Not Cleared"}]} />
            <SelectField label="Viral Diseases (IBR/BVD/EBL)" value={form.viralDiseasesClear} onChange={set("viralDiseasesClear")} options={[{value:"true",label:"Cleared"},{value:"false",label:"Not Cleared"}]} />
            <DateField label="Clearance Issue Date" value={form.clearanceDate} onChange={set("clearanceDate")} />

            <div className="col-span-2 border-t border-line pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Import Details</span>
            </div>
            <SelectField label="Imported Bull?" value={form.isImported} onChange={set("isImported")} options={[{value:"false",label:"No — Own Farm"},{value:"true",label:"Yes — Imported"}]} />
            {form.isImported === "true" && <>
              <TextField label="Import Permit No." value={form.importPermitNo} onChange={set("importPermitNo")} placeholder="e.g. IMP/2025/0001" />
              <TextField label="Country of Origin" value={form.countryOfOrigin} onChange={set("countryOfOrigin")} placeholder="e.g. South Africa" />
              <SelectField label="Quarantine Status" value={form.quarantineStatus} onChange={set("quarantineStatus")} options={QUARANTINE_STATUSES} />
              {(form.quarantineStatus === "Cleared") && (
                <DateField label="Quarantine Clearance Date" value={form.quarantineClearanceDate} onChange={set("quarantineClearanceDate")} />
              )}
            </>}

            <div className="col-span-2">
              <TextAreaField label="Notes" value={form.notes} onChange={set("notes")} rows={2} />
            </div>
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Register Bull"} />
        </form>
      </Modal>

      {/* ── Health record modal ─────────────────────────────────── */}
      <Modal key={editingHealthId ?? "new-health"} open={healthOpen}
        onClose={() => { setHealthOpen(false); setEditingHealthId(null); }}
        title={editingHealthId ? "Edit Health Record" : "Add Bull Health Record"}
        description="Record veterinary event, treatment outcome, and cost for a bull.">
        <form onSubmit={submitHealth} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Bull" value={healthForm.cattleId} onChange={setH("cattleId")}
              options={allBulls.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))}
              required placeholder="— Select bull —" />
            <DateField label="Date" value={healthForm.date} onChange={setH("date")} required />
            <SelectField label="Event Type" value={healthForm.type} onChange={setH("type")} options={[...HEALTH_TYPES]} required />
            <SelectField label="Status" value={healthForm.status} onChange={setH("status")} options={[...HEALTH_STATUSES]} required />
            <TextField label="Veterinarian" value={healthForm.vet} onChange={setH("vet")} required placeholder="Dr. Name" />
            <NumberField label="Cost (USD)" value={healthForm.costUsd} onChange={setH("costUsd")} min={0} placeholder="0.00" />
          </FormGrid>
          <TextAreaField label="Diagnosis" value={healthForm.diagnosis} onChange={setH("diagnosis")} required rows={2} />
          <TextAreaField label="Treatment" value={healthForm.treatment} onChange={setH("treatment")} required rows={2} />
          <FormButtons onCancel={() => { setHealthOpen(false); setEditingHealthId(null); }} submitLabel="Save Record" />
        </form>
      </Modal>

      {/* ── Vaccination modal ───────────────────────────────────── */}
      <Modal key={editingVaxId ?? "new-vax"} open={vaxOpen}
        onClose={() => { setVaxOpen(false); setEditingVaxId(null); }}
        title={editingVaxId ? "Edit Vaccination" : "Add Bull Vaccination"}
        description="Record a vaccine administered to a bull.">
        <form onSubmit={submitVax} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Bull" value={vaxForm.cattleId} onChange={setV("cattleId")}
              options={allBulls.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))}
              required placeholder="— Select bull —" />
            <TextField label="Vaccine Name" value={vaxForm.vaccine} onChange={setV("vaccine")} required placeholder="e.g. Botulism Type D" />
            <DateField label="Date Administered" value={vaxForm.date} onChange={setV("date")} required />
            <DateField label="Next Due Date" value={vaxForm.nextDue} onChange={setV("nextDue")} required />
            <TextField label="Administered By" value={vaxForm.administeredBy} onChange={setV("administeredBy")} required placeholder="Dr. Name or Farmer Name" />
            <SelectField label="Status" value={vaxForm.status} onChange={setV("status")} options={[...VAX_STATUSES]} required />
          </FormGrid>
          <FormButtons onCancel={() => { setVaxOpen(false); setEditingVaxId(null); }} submitLabel="Save Vaccination" />
        </form>
      </Modal>
    </>
  );
}
