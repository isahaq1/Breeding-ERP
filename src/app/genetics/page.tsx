"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PageHeader, StatCard, Card, CardHeader, Badge, PrimaryButton,
  Table, Th, Td, EmptyRow,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal, FormGrid, FormButtons, TextField, SelectField,
  TextAreaField, DateField,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { ageFrom, formatDate } from "@/lib/format";
import { canBeDam, canBeSire, isFemaleClass } from "@/lib/data";
import type { Pedigree, GenomicRecord, PedigreeStatus } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────
function AnimalPill({ id, cattleList }: { id: string; cattleList: ReturnType<typeof useData>["cattle"] }) {
  const a = cattleList.find(c => c.id === id);
  if (!a) return <span className="text-xs text-muted">{id}</span>;
  return (
    <Link
      href={`/cattle/${a.id}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink transition hover:border-brand-300 hover:text-brand-700"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isFemaleClass(a.class) ? "bg-violet-400" : "bg-sky-400"}`} />
      {a.name} <span className="text-muted">({a.id})</span>
    </Link>
  );
}

const PED_STATUSES: PedigreeStatus[] = ["Registered", "Pending", "Rejected", "Lapsed"];
const DNA_SOURCES = ["Blood", "Hair follicle", "Tissue", "Semen"] as const;
const SNP_PANELS = ["LD 7K", "HD 777K", "Custom 50K", "BeadChip 150K"];
const LABS = ["Neogen GeneSeek", "Zoetis Genetics", "CDCB (USA)", "AHDB Dairy (UK)", "Local Laboratory"];

const emptyPed = {
  cattleId: "", sireId: "", damId: "",
  paternalGrandsireId: "", paternalGrandamId: "",
  maternalGrandsireId: "", maternalGrandamId: "",
  breed1Name: "", breed1Pct: "", breed2Name: "", breed2Pct: "",
  registrationNo: "", registrationBody: "Zimbabwe Cattle Producers Association",
  issueDate: "2026-06-24", expiryDate: "", isVerified: "false",
  blockchainTxId: "", status: "Pending" as PedigreeStatus, notes: "",
};

const emptyGen = {
  cattleId: "", testDate: "2026-06-24",
  laboratory: "Neogen GeneSeek", snpPanel: "LD 7K",
  dnaSource: "Blood" as GenomicRecord["dnaSource"],
  parentageVerified: "false",
  breed1Name: "", breed1Pct: "", breed2Name: "", breed2Pct: "",
  milkEpd: "", fatEpd: "", proteinEpd: "",
  fertilityIndex: "", conformationScore: "",
  inbreedingCoefficient: "", geneticMeritIndex: "",
  certificateNo: "", status: "Pending" as GenomicRecord["status"], notes: "",
};

export default function GeneticsPage() {
  const { cattle, pedigrees, genomicRecords, addPedigree, addGenomicRecord, update, remove } = useData();
  const [tab, setTab] = useState<"lineage" | "pedigrees" | "genomics">("lineage");

  const [pedModal, setPedModal] = useState<{ open: boolean; editing: Pedigree | null }>({ open: false, editing: null });
  const [genModal, setGenModal] = useState<{ open: boolean; editing: GenomicRecord | null }>({ open: false, editing: null });

  const [pedForm, setPedForm] = useState(emptyPed);
  const [genForm, setGenForm] = useState(emptyGen);

  const setP = (k: keyof typeof emptyPed) => (v: string) => setPedForm(f => ({ ...f, [k]: v }));
  const setG = (k: keyof typeof emptyGen) => (v: string) => setGenForm(f => ({ ...f, [k]: v }));

  const sires = cattle.filter(c => canBeSire(c.class));
  const dams = cattle.filter(c => canBeDam(c.class) && cattle.some(o => o.damId === c.id));
  const breeds = Array.from(new Set(cattle.map(c => c.breed)));
  const verifiedPedigrees = pedigrees.filter(p => p.isVerified).length;

  function animalName(id: string) {
    const c = cattle.find(x => x.id === id);
    return c ? `${c.name} (${c.id})` : id;
  }

  function buildBreedComp(name1: string, pct1: string, name2: string, pct2: string): Record<string, number> {
    const comp: Record<string, number> = {};
    if (name1 && pct1) comp[name1] = Number(pct1);
    if (name2 && pct2) comp[name2] = Number(pct2);
    return comp;
  }

  function submitPedigree(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<Pedigree, "id"> = {
      cattleId: pedForm.cattleId,
      sireId: pedForm.sireId,
      damId: pedForm.damId,
      paternalGrandsireId: pedForm.paternalGrandsireId || undefined,
      paternalGrandamId: pedForm.paternalGrandamId || undefined,
      maternalGrandsireId: pedForm.maternalGrandsireId || undefined,
      maternalGrandamId: pedForm.maternalGrandamId || undefined,
      breedComposition: buildBreedComp(pedForm.breed1Name, pedForm.breed1Pct, pedForm.breed2Name, pedForm.breed2Pct),
      registrationNo: pedForm.registrationNo,
      registrationBody: pedForm.registrationBody,
      issueDate: pedForm.issueDate,
      expiryDate: pedForm.expiryDate || undefined,
      isVerified: pedForm.isVerified === "true",
      blockchainTxId: pedForm.blockchainTxId || undefined,
      status: pedForm.status,
      notes: pedForm.notes || undefined,
    };
    if (pedModal.editing) update("pedigrees", pedModal.editing.id, payload);
    else addPedigree(payload);
    setPedModal({ open: false, editing: null });
    setPedForm(emptyPed);
  }

  function submitGenomic(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<GenomicRecord, "id"> = {
      cattleId: genForm.cattleId,
      testDate: genForm.testDate,
      laboratory: genForm.laboratory,
      snpPanel: genForm.snpPanel,
      dnaSource: genForm.dnaSource,
      parentageVerified: genForm.parentageVerified === "true",
      breedComposition: buildBreedComp(genForm.breed1Name, genForm.breed1Pct, genForm.breed2Name, genForm.breed2Pct),
      milkEpd: genForm.milkEpd ? Number(genForm.milkEpd) : undefined,
      fatEpd: genForm.fatEpd ? Number(genForm.fatEpd) : undefined,
      proteinEpd: genForm.proteinEpd ? Number(genForm.proteinEpd) : undefined,
      fertilityIndex: genForm.fertilityIndex ? Number(genForm.fertilityIndex) : undefined,
      conformationScore: genForm.conformationScore ? Number(genForm.conformationScore) : undefined,
      inbreedingCoefficient: genForm.inbreedingCoefficient ? Number(genForm.inbreedingCoefficient) : undefined,
      geneticMeritIndex: genForm.geneticMeritIndex ? Number(genForm.geneticMeritIndex) : undefined,
      certificateNo: genForm.certificateNo || undefined,
      status: genForm.status,
      notes: genForm.notes || undefined,
    };
    if (genModal.editing) update("genomicRecords", genModal.editing.id, payload);
    else addGenomicRecord(payload);
    setGenModal({ open: false, editing: null });
    setGenForm(emptyGen);
  }

  const TABS = [
    { key: "lineage", label: "Sire & Dam Lines" },
    { key: "pedigrees", label: "Pedigrees" },
    { key: "genomics", label: "Genomic Records" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Genetics & Lineage"
        description="Sire & dam lines, official pedigrees, genomic testing and estimated breeding values."
        action={
          tab === "pedigrees" ? (
            <PrimaryButton onClick={() => { setPedForm(emptyPed); setPedModal({ open: true, editing: null }); }}>
              <Icon.plus width={16} height={16} /> Add Pedigree
            </PrimaryButton>
          ) : tab === "genomics" ? (
            <PrimaryButton onClick={() => { setGenForm(emptyGen); setGenModal({ open: true, editing: null }); }}>
              <Icon.plus width={16} height={16} /> Add Genomic Record
            </PrimaryButton>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active Sires" value={String(sires.length)} iconName="dna" tone="blue" />
        <StatCard label="Producing Dams" value={String(dams.length)} iconName="cow" tone="purple" />
        <StatCard label="Registered Pedigrees" value={String(verifiedPedigrees)} sublabel={`${pedigrees.length} total`} iconName="shield" tone="green" />
        <StatCard label="Genomic Tests" value={String(genomicRecords.filter(g => g.status === "Completed").length)} sublabel={`${genomicRecords.length} total`} iconName="analytics" tone="green" />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-xl border border-line bg-canvas p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LINEAGE TAB ──────────────────────────────────────────────────── */}
      {tab === "lineage" && (
        <>
          <Card className="mt-4">
            <CardHeader title="Sire Lines (Progeny by Bull)" />
            <div className="divide-y divide-line">
              {sires.map(s => {
                const progeny = cattle.filter(c => c.sireId === s.id);
                return (
                  <div key={s.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-100 text-sky-700">
                        <Icon.dna width={20} height={20} />
                      </div>
                      <div>
                        <Link href={`/cattle/${s.id}`} className="text-sm font-semibold text-ink hover:text-brand-700">
                          {s.name} ({s.id})
                        </Link>
                        <p className="text-xs text-muted">{s.breed} · {ageFrom(s.dob)}</p>
                      </div>
                      <Badge tone="gray">{progeny.length} offspring</Badge>
                    </div>
                    {progeny.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 pl-13">
                        {progeny.map(p => <AnimalPill key={p.id} id={p.id} cattleList={cattle} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader title="Dam Lines (Maternal Families)" />
            <div className="divide-y divide-line">
              {dams.map(d => {
                const offspring = cattle.filter(c => c.damId === d.id);
                return (
                  <div key={d.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 sm:w-64">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-100 text-violet-700">
                        <Icon.cow width={20} height={20} />
                      </div>
                      <div>
                        <Link href={`/cattle/${d.id}`} className="text-sm font-semibold text-ink hover:text-brand-700">
                          {d.name} ({d.id})
                        </Link>
                        <p className="text-xs text-muted">{d.breed}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Icon.swap width={16} height={16} className="text-muted" />
                      {offspring.map(o => <AnimalPill key={o.id} id={o.id} cattleList={cattle} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ── PEDIGREES TAB ─────────────────────────────────────────────────── */}
      {tab === "pedigrees" && (
        <Card className="mt-4">
          <Table>
            <thead>
              <tr>
                <Th>Reg. No</Th>
                <Th>Animal</Th>
                <Th>Sire</Th>
                <Th>Dam</Th>
                <Th>Breed Composition</Th>
                <Th>Registry</Th>
                <Th>Issued</Th>
                <Th>Verified</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {pedigrees.length === 0 && <EmptyRow colSpan={10} label="No pedigrees registered yet." />}
              {pedigrees.map(p => (
                <tr key={p.id} className="transition hover:bg-canvas/60">
                  <Td>
                    <p className="font-mono text-xs font-semibold">{p.registrationNo}</p>
                    <p className="text-[11px] text-muted">{p.id}</p>
                  </Td>
                  <Td className="font-medium text-sm">
                    <Link href={`/cattle/${p.cattleId}`} className="hover:text-brand-700">
                      {animalName(p.cattleId)}
                    </Link>
                  </Td>
                  <Td className="text-xs text-muted">{animalName(p.sireId)}</Td>
                  <Td className="text-xs text-muted">{animalName(p.damId)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(p.breedComposition).map(([breed, pct]) => (
                        <Badge key={breed} tone="blue">{pct}% {breed}</Badge>
                      ))}
                    </div>
                  </Td>
                  <Td className="text-xs text-muted">{p.registrationBody}</Td>
                  <Td className="text-xs text-muted">{formatDate(p.issueDate)}</Td>
                  <Td>
                    {p.isVerified
                      ? <Badge tone="green">✓ Verified</Badge>
                      : <Badge tone="amber">Unverified</Badge>}
                  </Td>
                  <Td>
                    <Badge tone={p.status === "Registered" ? "green" : p.status === "Pending" ? "amber" : p.status === "Lapsed" ? "gray" : "red"}>
                      {p.status}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => {
                        const bc = Object.entries(p.breedComposition);
                        setPedForm({
                          cattleId: p.cattleId, sireId: p.sireId, damId: p.damId,
                          paternalGrandsireId: p.paternalGrandsireId ?? "",
                          paternalGrandamId: p.paternalGrandamId ?? "",
                          maternalGrandsireId: p.maternalGrandsireId ?? "",
                          maternalGrandamId: p.maternalGrandamId ?? "",
                          breed1Name: bc[0]?.[0] ?? "", breed1Pct: String(bc[0]?.[1] ?? ""),
                          breed2Name: bc[1]?.[0] ?? "", breed2Pct: String(bc[1]?.[1] ?? ""),
                          registrationNo: p.registrationNo,
                          registrationBody: p.registrationBody,
                          issueDate: p.issueDate, expiryDate: p.expiryDate ?? "",
                          isVerified: String(p.isVerified), blockchainTxId: p.blockchainTxId ?? "",
                          status: p.status, notes: p.notes ?? "",
                        });
                        setPedModal({ open: true, editing: p });
                      }} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                      <button onClick={() => remove("pedigrees", p.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── GENOMIC RECORDS TAB ────────────────────────────────────────────── */}
      {tab === "genomics" && (
        <Card className="mt-4">
          <Table>
            <thead>
              <tr>
                <Th>Animal</Th>
                <Th>Lab / Panel</Th>
                <Th>Date</Th>
                <Th>DNA Source</Th>
                <Th>Breed Composition</Th>
                <Th>Milk EPD</Th>
                <Th>Fertility</Th>
                <Th>GMI</Th>
                <Th>Inbreeding</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {genomicRecords.length === 0 && <EmptyRow colSpan={11} label="No genomic records yet." />}
              {genomicRecords.map(g => (
                <tr key={g.id} className="transition hover:bg-canvas/60">
                  <Td className="font-medium text-sm">
                    <Link href={`/cattle/${g.cattleId}`} className="hover:text-brand-700">
                      {animalName(g.cattleId)}
                    </Link>
                  </Td>
                  <Td>
                    <p className="text-xs font-medium">{g.laboratory}</p>
                    <p className="text-[11px] text-muted">{g.snpPanel}</p>
                  </Td>
                  <Td className="text-xs text-muted">{formatDate(g.testDate)}</Td>
                  <Td><Badge tone="blue">{g.dnaSource}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(g.breedComposition).map(([breed, pct]) => (
                        <Badge key={breed} tone="purple">{pct}% {breed}</Badge>
                      ))}
                    </div>
                  </Td>
                  <Td className="font-semibold text-sm">{g.milkEpd != null ? `+${g.milkEpd}kg` : "—"}</Td>
                  <Td className="font-semibold text-sm">{g.fertilityIndex != null ? g.fertilityIndex : "—"}</Td>
                  <Td className="font-bold text-brand-700">{g.geneticMeritIndex != null ? g.geneticMeritIndex : "—"}</Td>
                  <Td className="text-xs">{g.inbreedingCoefficient != null ? `${g.inbreedingCoefficient}%` : "—"}</Td>
                  <Td>
                    <Badge tone={g.status === "Completed" ? "green" : g.status === "Pending" ? "amber" : "red"}>
                      {g.status}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => {
                        const bc = Object.entries(g.breedComposition);
                        setGenForm({
                          cattleId: g.cattleId, testDate: g.testDate,
                          laboratory: g.laboratory, snpPanel: g.snpPanel,
                          dnaSource: g.dnaSource, parentageVerified: String(g.parentageVerified),
                          breed1Name: bc[0]?.[0] ?? "", breed1Pct: String(bc[0]?.[1] ?? ""),
                          breed2Name: bc[1]?.[0] ?? "", breed2Pct: String(bc[1]?.[1] ?? ""),
                          milkEpd: g.milkEpd != null ? String(g.milkEpd) : "",
                          fatEpd: g.fatEpd != null ? String(g.fatEpd) : "",
                          proteinEpd: g.proteinEpd != null ? String(g.proteinEpd) : "",
                          fertilityIndex: g.fertilityIndex != null ? String(g.fertilityIndex) : "",
                          conformationScore: g.conformationScore != null ? String(g.conformationScore) : "",
                          inbreedingCoefficient: g.inbreedingCoefficient != null ? String(g.inbreedingCoefficient) : "",
                          geneticMeritIndex: g.geneticMeritIndex != null ? String(g.geneticMeritIndex) : "",
                          certificateNo: g.certificateNo ?? "", status: g.status, notes: g.notes ?? "",
                        });
                        setGenModal({ open: true, editing: g });
                      }} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                      <button onClick={() => remove("genomicRecords", g.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── PEDIGREE MODAL ─────────────────────────────────────────────────── */}
      <Modal key={pedModal.editing?.id ?? "new-ped"} open={pedModal.open}
        onClose={() => setPedModal({ open: false, editing: null })}
        title={pedModal.editing ? "Edit Pedigree" : "Register Pedigree"}
        description="Official 3-generation lineage with breed composition and registry details."
        size="lg">
        <form onSubmit={submitPedigree} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Animal" value={pedForm.cattleId} onChange={setP("cattleId")}
              options={cattle.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required placeholder="— Select animal —" />
            <SelectField label="Sire (Father)" value={pedForm.sireId} onChange={setP("sireId")}
              options={cattle.filter(c => canBeSire(c.class)).map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required placeholder="— Select sire —" />
            <SelectField label="Dam (Mother)" value={pedForm.damId} onChange={setP("damId")}
              options={cattle.filter(c => canBeDam(c.class)).map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required placeholder="— Select dam —" />
          </FormGrid>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Grandparents (optional)</p>
            <FormGrid>
              <SelectField label="Paternal Grandsire" value={pedForm.paternalGrandsireId} onChange={setP("paternalGrandsireId")}
                options={cattle.filter(c => canBeSire(c.class)).map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))} placeholder="—" />
              <SelectField label="Paternal Granddam" value={pedForm.paternalGrandamId} onChange={setP("paternalGrandamId")}
                options={cattle.filter(c => canBeDam(c.class)).map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))} placeholder="—" />
              <SelectField label="Maternal Grandsire" value={pedForm.maternalGrandsireId} onChange={setP("maternalGrandsireId")}
                options={cattle.filter(c => canBeSire(c.class)).map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))} placeholder="—" />
              <SelectField label="Maternal Granddam" value={pedForm.maternalGrandamId} onChange={setP("maternalGrandamId")}
                options={cattle.filter(c => canBeDam(c.class)).map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))} placeholder="—" />
            </FormGrid>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Breed Composition</p>
            <FormGrid>
              <TextField label="Primary Breed" value={pedForm.breed1Name} onChange={setP("breed1Name")} placeholder="e.g. Holstein" />
              <TextField label="Primary Breed %" value={pedForm.breed1Pct} onChange={setP("breed1Pct")} placeholder="e.g. 62.5" />
              <TextField label="Secondary Breed" value={pedForm.breed2Name} onChange={setP("breed2Name")} placeholder="e.g. Friesian" />
              <TextField label="Secondary Breed %" value={pedForm.breed2Pct} onChange={setP("breed2Pct")} placeholder="e.g. 37.5" />
            </FormGrid>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Registration</p>
            <FormGrid>
              <TextField label="Registration No." value={pedForm.registrationNo} onChange={setP("registrationNo")} required placeholder="ZCPA-2024-00142" />
              <TextField label="Registering Body" value={pedForm.registrationBody} onChange={setP("registrationBody")} required />
              <DateField label="Issue Date" value={pedForm.issueDate} onChange={setP("issueDate")} required />
              <DateField label="Expiry Date (opt)" value={pedForm.expiryDate} onChange={setP("expiryDate")} />
              <SelectField label="Verified" value={pedForm.isVerified} onChange={setP("isVerified")} options={[{ value: "true", label: "Yes — Verified" }, { value: "false", label: "No — Pending" }]} required />
              <SelectField label="Status" value={pedForm.status} onChange={setP("status")} options={[...PED_STATUSES]} required />
              <TextField label="Blockchain Tx ID (opt)" value={pedForm.blockchainTxId} onChange={setP("blockchainTxId")} placeholder="0xabc123..." />
            </FormGrid>
          </div>
          <TextAreaField label="Notes" value={pedForm.notes} onChange={setP("notes")} />
          <FormButtons onCancel={() => setPedModal({ open: false, editing: null })} submitLabel="Save Pedigree" />
        </form>
      </Modal>

      {/* ── GENOMIC MODAL ─────────────────────────────────────────────────── */}
      <Modal key={genModal.editing?.id ?? "new-gen"} open={genModal.open}
        onClose={() => setGenModal({ open: false, editing: null })}
        title={genModal.editing ? "Edit Genomic Record" : "Add Genomic Record"}
        description="SNP panel test results and estimated breeding values (EBVs)."
        size="lg">
        <form onSubmit={submitGenomic} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Animal" value={genForm.cattleId} onChange={setG("cattleId")}
              options={cattle.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required placeholder="— Select animal —" />
            <DateField label="Test Date" value={genForm.testDate} onChange={setG("testDate")} required />
            <SelectField label="Laboratory" value={genForm.laboratory} onChange={setG("laboratory")} options={LABS} required />
            <SelectField label="SNP Panel" value={genForm.snpPanel} onChange={setG("snpPanel")} options={SNP_PANELS} required />
            <SelectField label="DNA Source" value={genForm.dnaSource} onChange={setG("dnaSource")} options={[...DNA_SOURCES]} required />
            <SelectField label="Parentage Verified" value={genForm.parentageVerified} onChange={setG("parentageVerified")}
              options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} required />
          </FormGrid>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Breed Composition</p>
            <FormGrid>
              <TextField label="Primary Breed" value={genForm.breed1Name} onChange={setG("breed1Name")} placeholder="e.g. Holstein" />
              <TextField label="Primary %" value={genForm.breed1Pct} onChange={setG("breed1Pct")} placeholder="75" />
              <TextField label="Secondary Breed" value={genForm.breed2Name} onChange={setG("breed2Name")} placeholder="e.g. Jersey" />
              <TextField label="Secondary %" value={genForm.breed2Pct} onChange={setG("breed2Pct")} placeholder="25" />
            </FormGrid>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Estimated Breeding Values (EBVs)</p>
            <FormGrid>
              <TextField label="Milk EPD (kg)" value={genForm.milkEpd} onChange={setG("milkEpd")} placeholder="320" />
              <TextField label="Fat EPD (%)" value={genForm.fatEpd} onChange={setG("fatEpd")} placeholder="0.08" />
              <TextField label="Protein EPD (%)" value={genForm.proteinEpd} onChange={setG("proteinEpd")} placeholder="0.12" />
              <TextField label="Fertility Index" value={genForm.fertilityIndex} onChange={setG("fertilityIndex")} placeholder="78" />
              <TextField label="Conformation Score" value={genForm.conformationScore} onChange={setG("conformationScore")} placeholder="84" />
              <TextField label="Inbreeding Coeff. %" value={genForm.inbreedingCoefficient} onChange={setG("inbreedingCoefficient")} placeholder="3.2" />
              <TextField label="Genetic Merit Index" value={genForm.geneticMeritIndex} onChange={setG("geneticMeritIndex")} placeholder="112" />
              <TextField label="Certificate No. (opt)" value={genForm.certificateNo} onChange={setG("certificateNo")} placeholder="GEN-ZW-2025-0041" />
              <SelectField label="Status" value={genForm.status} onChange={setG("status")} options={["Completed", "Pending", "Failed"]} required />
            </FormGrid>
          </div>
          <TextAreaField label="Notes" value={genForm.notes} onChange={setG("notes")} />
          <FormButtons onCancel={() => setGenModal({ open: false, editing: null })} submitLabel="Save Record" />
        </form>
      </Modal>
    </>
  );
}
