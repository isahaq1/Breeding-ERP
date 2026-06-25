"use client";

import { useMemo, useState } from "react";
import {
  PageHeader, StatCard, Card, CardHeader, Badge, PrimaryButton,
  Table, Th, Td, EmptyRow,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal, FormGrid, FormButtons, TextField, SelectField,
  TextAreaField, NumberField, DateField,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type {
  SemenQualityTest, SemenBatch, SemenBatchQuality, SemenStraw,
  BatchStatus, StrawStatus,
} from "@/lib/types";

// ── Smart quality thresholds (ICAR / WHO standards) ───────────────────────
const MOTILITY_PASS = 70;      // % total motility minimum
const PROGRESSIVE_PASS = 60;  // % progressive motility minimum
const MORPHOLOGY_PASS = 65;   // % normal morphology minimum
const VIABILITY_PASS = 75;    // % viability minimum

function qualityScore(test: SemenQualityTest): number {
  let score = 0;
  if (test.totalMotilityPct >= MOTILITY_PASS) score += 25;
  else score += Math.round((test.totalMotilityPct / MOTILITY_PASS) * 25);
  if (test.progressiveMotilityPct >= PROGRESSIVE_PASS) score += 25;
  else score += Math.round((test.progressiveMotilityPct / PROGRESSIVE_PASS) * 25);
  if (test.morphologyNormalPct >= MORPHOLOGY_PASS) score += 25;
  else score += Math.round((test.morphologyNormalPct / MORPHOLOGY_PASS) * 25);
  if (test.viabilityPct >= VIABILITY_PASS) score += 25;
  else score += Math.round((test.viabilityPct / VIABILITY_PASS) * 25);
  return Math.min(100, score);
}

function scoreTone(s: number): "green" | "amber" | "red" {
  if (s >= 80) return "green";
  if (s >= 60) return "amber";
  return "red";
}

function batchStatusTone(s: BatchStatus): "green" | "amber" | "blue" | "red" | "gray" {
  const map: Record<BatchStatus, "green" | "amber" | "blue" | "red" | "gray"> = {
    Released: "green", Frozen: "blue", Quarantine: "amber", Processing: "purple" as "green",
    Destroyed: "gray",
  };
  return map[s] ?? "gray";
}

function strawStatusTone(s: StrawStatus): "green" | "amber" | "blue" | "red" | "gray" {
  const map: Record<StrawStatus, "green" | "amber" | "blue" | "red" | "gray"> = {
    "In Stock": "green", Dispatched: "blue", Used: "gray",
    Destroyed: "red", Quarantined: "amber",
  };
  return map[s] ?? "gray";
}

const BATCH_STATUSES: BatchStatus[] = ["Processing", "Frozen", "Quarantine", "Released", "Destroyed"];
const STRAW_STATUSES: StrawStatus[] = ["In Stock", "Dispatched", "Used", "Destroyed", "Quarantined"];
const COLOR_OPTIONS = ["Yellow", "Red", "Blue", "Green", "White", "Orange", "Purple", "Pink"];
const THAW_PROTOCOLS = ["37°C water bath, 30 seconds", "35°C water bath, 30 seconds", "37°C water bath, 15 seconds", "Room temperature, 60 seconds"];

// ── empty forms ────────────────────────────────────────────────────────────
const emptyTest = {
  collectionId: "", bullId: "",
  testDate: "2026-06-24", testedBy: "",
  totalMotilityPct: "", progressiveMotilityPct: "", morphologyNormalPct: "",
  concentrationMPerMl: "", viabilityPct: "", volumeMl: "", pH: "6.8",
  colorAppearance: "Creamy White" as SemenQualityTest["colorAppearance"],
  acrosomalIntegrityPct: "", dnaFragmentationPct: "",
  result: "Pass" as SemenQualityTest["result"], notes: "",
};

const emptyBatch = {
  collectionId: "", bullId: "", batchNo: "",
  processingDate: "2026-06-24", processor: "",
  diluentUsed: "Tris-egg-yolk", extensionRatio: "1:4",
  glycerolPct: "7", equilibrationTimeMin: "120",
  packagingType: "0.25ml" as "0.25ml" | "0.5ml",
  totalStrawsFilled: "", strawsAccepted: "", strawsRejected: "",
  status: "Processing" as BatchStatus, releaseDate: "", notes: "",
};

const emptyBatchQuality = {
  batchId: "", testDate: "2026-06-24", testedBy: "",
  postThawMotilityPct: "", postThawProgressivePct: "", postThawMorphologyPct: "",
  thawProtocol: "37°C water bath, 30 seconds",
  result: "Approved" as SemenBatchQuality["result"], notes: "",
};

const emptyStraw = {
  batchId: "", bullId: "", serialNumber: "",
  strawType: "0.25ml" as "0.25ml" | "0.5ml",
  colorCode: "Yellow", doseMillion: "",
  tankId: "", canisterId: "", gobletPosition: "",
  storedDate: "2026-06-24", expiryDate: "",
  status: "In Stock" as StrawStatus, notes: "",
};

// ── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, tone = "green" }: {
  value: number; max?: number; tone?: "green" | "amber" | "red";
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = tone === "green" ? "bg-green-500" : tone === "amber" ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium">{value}%</span>
    </div>
  );
}

// ── AI Quality Badge ────────────────────────────────────────────────────────
function QualityScoreBadge({ test }: { test: SemenQualityTest }) {
  const score = qualityScore(test);
  const tone = scoreTone(score);
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Acceptable" : "Below Standard";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-bold ${tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : "text-red-700"}`}>
        {score}
      </span>
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SemenLabPage() {
  const {
    semenQualityTests, semenBatches, semenBatchQuality, semenStraws,
    semenCollections, nitrogenTanks, tankCanisters, cattle,
    addSemenQualityTest, addSemenBatch, addSemenBatchQuality, addSemenStraw,
    update, remove,
  } = useData();

  const [tab, setTab] = useState<"tests" | "batches" | "batchqc" | "straws">("tests");

  // Modal states
  const [testModal, setTestModal] = useState<{ open: boolean; editing: SemenQualityTest | null }>({ open: false, editing: null });
  const [batchModal, setBatchModal] = useState<{ open: boolean; editing: SemenBatch | null }>({ open: false, editing: null });
  const [bqModal, setBqModal] = useState<{ open: boolean; editing: SemenBatchQuality | null }>({ open: false, editing: null });
  const [strawModal, setStrawModal] = useState<{ open: boolean; editing: SemenStraw | null }>({ open: false, editing: null });

  const [testForm, setTestForm] = useState(emptyTest);
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [bqForm, setBqForm] = useState(emptyBatchQuality);
  const [strawForm, setStrawForm] = useState(emptyStraw);

  const setT = (k: keyof typeof emptyTest) => (v: string) => setTestForm(f => ({ ...f, [k]: v }));
  const setB = (k: keyof typeof emptyBatch) => (v: string) => setBatchForm(f => ({ ...f, [k]: v }));
  const setBq = (k: keyof typeof emptyBatchQuality) => (v: string) => setBqForm(f => ({ ...f, [k]: v }));
  const setSt = (k: keyof typeof emptyStraw) => (v: string) => setStrawForm(f => ({ ...f, [k]: v }));

  const bulls = useMemo(() => cattle.filter(c => c.class === "Bull"), [cattle]);

  // Stats
  const passedTests = semenQualityTests.filter(t => t.result === "Pass").length;
  const releasedBatches = semenBatches.filter(b => b.status === "Released").length;
  const strawsInStock = semenStraws.filter(s => s.status === "In Stock").length;
  const avgScore = semenQualityTests.length
    ? Math.round(semenQualityTests.reduce((s, t) => s + qualityScore(t), 0) / semenQualityTests.length)
    : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function submitTest(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      collectionId: testForm.collectionId,
      bullId: testForm.bullId,
      testDate: testForm.testDate,
      testedBy: testForm.testedBy,
      totalMotilityPct: Number(testForm.totalMotilityPct),
      progressiveMotilityPct: Number(testForm.progressiveMotilityPct),
      morphologyNormalPct: Number(testForm.morphologyNormalPct),
      concentrationMPerMl: Number(testForm.concentrationMPerMl),
      viabilityPct: Number(testForm.viabilityPct),
      volumeMl: Number(testForm.volumeMl),
      pH: Number(testForm.pH),
      colorAppearance: testForm.colorAppearance,
      acrosomalIntegrityPct: testForm.acrosomalIntegrityPct ? Number(testForm.acrosomalIntegrityPct) : undefined,
      dnaFragmentationPct: testForm.dnaFragmentationPct ? Number(testForm.dnaFragmentationPct) : undefined,
      result: testForm.result,
      notes: testForm.notes || undefined,
    };
    if (testModal.editing) {
      update("semenQualityTests", testModal.editing.id, payload);
    } else {
      addSemenQualityTest(payload);
    }
    setTestModal({ open: false, editing: null });
    setTestForm(emptyTest);
  }

  function submitBatch(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      collectionId: batchForm.collectionId,
      bullId: batchForm.bullId,
      batchNo: batchForm.batchNo,
      processingDate: batchForm.processingDate,
      processor: batchForm.processor,
      diluentUsed: batchForm.diluentUsed,
      extensionRatio: batchForm.extensionRatio,
      glycerolPct: Number(batchForm.glycerolPct),
      equilibrationTimeMin: Number(batchForm.equilibrationTimeMin),
      packagingType: batchForm.packagingType,
      totalStrawsFilled: Number(batchForm.totalStrawsFilled),
      strawsAccepted: Number(batchForm.strawsAccepted),
      strawsRejected: Number(batchForm.strawsRejected),
      status: batchForm.status,
      releaseDate: batchForm.releaseDate || undefined,
      notes: batchForm.notes || undefined,
    };
    if (batchModal.editing) {
      update("semenBatches", batchModal.editing.id, payload);
    } else {
      addSemenBatch(payload);
    }
    setBatchModal({ open: false, editing: null });
    setBatchForm(emptyBatch);
  }

  function submitBq(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      batchId: bqForm.batchId,
      testDate: bqForm.testDate,
      testedBy: bqForm.testedBy,
      postThawMotilityPct: Number(bqForm.postThawMotilityPct),
      postThawProgressivePct: Number(bqForm.postThawProgressivePct),
      postThawMorphologyPct: Number(bqForm.postThawMorphologyPct),
      thawProtocol: bqForm.thawProtocol,
      result: bqForm.result,
      notes: bqForm.notes || undefined,
    };
    if (bqModal.editing) {
      update("semenBatchQuality", bqModal.editing.id, payload);
    } else {
      addSemenBatchQuality(payload);
    }
    setBqModal({ open: false, editing: null });
    setBqForm(emptyBatchQuality);
  }

  function submitStraw(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      batchId: strawForm.batchId,
      bullId: strawForm.bullId,
      serialNumber: strawForm.serialNumber,
      strawType: strawForm.strawType,
      colorCode: strawForm.colorCode,
      doseMillion: Number(strawForm.doseMillion),
      tankId: strawForm.tankId,
      canisterId: strawForm.canisterId,
      gobletPosition: strawForm.gobletPosition,
      storedDate: strawForm.storedDate,
      expiryDate: strawForm.expiryDate || undefined,
      status: strawForm.status,
      notes: strawForm.notes || undefined,
    };
    if (strawModal.editing) {
      update("semenStraws", strawModal.editing.id, payload);
    } else {
      addSemenStraw(payload);
    }
    setStrawModal({ open: false, editing: null });
    setStrawForm(emptyStraw);
  }

  function bullName(id: string) {
    const b = bulls.find(b => b.id === id);
    return b ? `${b.name} (${b.id})` : id;
  }

  function batchLabel(id: string) {
    const b = semenBatches.find(b => b.id === id);
    return b ? `${b.batchNo} (${b.id})` : id;
  }

  const TABS = [
    { key: "tests", label: "Quality Tests" },
    { key: "batches", label: "Processing Batches" },
    { key: "batchqc", label: "Post-Thaw QC" },
    { key: "straws", label: "Straw Inventory" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Semen Laboratory"
        description="Quality testing, batch processing, post-thaw QC, and individual straw tracking with AI-assisted scoring."
        action={
          <PrimaryButton onClick={() => {
            if (tab === "tests") { setTestForm(emptyTest); setTestModal({ open: true, editing: null }); }
            else if (tab === "batches") { setBatchForm(emptyBatch); setBatchModal({ open: true, editing: null }); }
            else if (tab === "batchqc") { setBqForm(emptyBatchQuality); setBqModal({ open: true, editing: null }); }
            else { setStrawForm(emptyStraw); setStrawModal({ open: true, editing: null }); }
          }}>
            <Icon.plus width={16} height={16} />
            Add {tab === "tests" ? "QC Test" : tab === "batches" ? "Batch" : tab === "batchqc" ? "Post-Thaw QC" : "Straw"}
          </PrimaryButton>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Quality Tests" value={String(semenQualityTests.length)} sublabel={`${passedTests} passed`} iconName="stethoscope" tone="blue" />
        <StatCard label="AI Quality Score" value={`${avgScore}/100`} sublabel="avg across tests" iconName="analytics" tone={avgScore >= 80 ? "green" : avgScore >= 60 ? "amber" : "purple"} />
        <StatCard label="Batches Released" value={String(releasedBatches)} sublabel={`${semenBatches.length} total`} iconName="vial" tone="green" />
        <StatCard label="Straws In Stock" value={String(strawsInStock)} sublabel={`${semenStraws.length} total`} iconName="collection" tone="purple" />
      </div>

      {/* Smart alerts */}
      {semenQualityTests.some(t => t.result === "Fail") && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>⚠ AI Alert:</strong>{" "}
          {semenQualityTests.filter(t => t.result === "Fail").length} collection(s) failed quality standards.
          Review and consider discarding or re-testing.
        </div>
      )}
      {semenBatches.some(b => b.status === "Quarantine") && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>⚡ Pending:</strong>{" "}
          {semenBatches.filter(b => b.status === "Quarantine").length} batch(es) in quarantine awaiting post-thaw QC.
          Complete QC testing to release.
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-canvas p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium whitespace-nowrap transition ${
              tab === t.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── QUALITY TESTS TAB ─────────────────────────────────────────────── */}
      {tab === "tests" && (
        <Card className="mt-4">
          <CardHeader title="Pre-Freeze Semen Quality Tests" action={
            <span className="text-xs text-muted">ICAR/WHO thresholds: motility ≥{MOTILITY_PASS}% · morphology ≥{MORPHOLOGY_PASS}%</span>
          } />
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Bull</Th>
                <Th>Collection</Th>
                <Th>Date</Th>
                <Th>Total Motility</Th>
                <Th>Progressive</Th>
                <Th>Morphology</Th>
                <Th>Viability</Th>
                <Th>Conc (M/mL)</Th>
                <Th>AI Score</Th>
                <Th>Result</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {semenQualityTests.length === 0 && <EmptyRow colSpan={12} label="No quality tests recorded yet." />}
              {semenQualityTests.map(t => (
                <tr key={t.id} className={`transition hover:bg-canvas/60 ${t.result === "Fail" ? "bg-red-50/30" : ""}`}>
                  <Td className="font-mono text-xs text-muted">{t.id}</Td>
                  <Td className="font-medium">{bullName(t.bullId)}</Td>
                  <Td className="text-xs text-muted">{t.collectionId}</Td>
                  <Td className="text-sm text-muted">{formatDate(t.testDate)}</Td>
                  <Td>
                    <ProgressBar value={t.totalMotilityPct} tone={t.totalMotilityPct >= MOTILITY_PASS ? "green" : "red"} />
                  </Td>
                  <Td>
                    <ProgressBar value={t.progressiveMotilityPct} tone={t.progressiveMotilityPct >= PROGRESSIVE_PASS ? "green" : "amber"} />
                  </Td>
                  <Td>
                    <ProgressBar value={t.morphologyNormalPct} tone={t.morphologyNormalPct >= MORPHOLOGY_PASS ? "green" : "amber"} />
                  </Td>
                  <Td>
                    <ProgressBar value={t.viabilityPct} tone={t.viabilityPct >= VIABILITY_PASS ? "green" : "amber"} />
                  </Td>
                  <Td className="font-medium">{t.concentrationMPerMl.toLocaleString()}</Td>
                  <Td><QualityScoreBadge test={t} /></Td>
                  <Td>
                    <Badge tone={t.result === "Pass" ? "green" : t.result === "Marginal" ? "amber" : "red"}>
                      {t.result}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setTestForm({
                        collectionId: t.collectionId, bullId: t.bullId,
                        testDate: t.testDate, testedBy: t.testedBy,
                        totalMotilityPct: String(t.totalMotilityPct),
                        progressiveMotilityPct: String(t.progressiveMotilityPct),
                        morphologyNormalPct: String(t.morphologyNormalPct),
                        concentrationMPerMl: String(t.concentrationMPerMl),
                        viabilityPct: String(t.viabilityPct),
                        volumeMl: String(t.volumeMl), pH: String(t.pH),
                        colorAppearance: t.colorAppearance,
                        acrosomalIntegrityPct: t.acrosomalIntegrityPct ? String(t.acrosomalIntegrityPct) : "",
                        dnaFragmentationPct: t.dnaFragmentationPct ? String(t.dnaFragmentationPct) : "",
                        result: t.result, notes: t.notes ?? "",
                      }); setTestModal({ open: true, editing: t }); }}
                        className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                      <button onClick={() => remove("semenQualityTests", t.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── BATCHES TAB ─────────────────────────────────────────────────────── */}
      {tab === "batches" && (
        <Card className="mt-4">
          <CardHeader title="Processing Batches" action={
            <span className="text-xs text-muted">Batch workflow: Processing → Frozen → Quarantine → Released</span>
          } />
          <Table>
            <thead>
              <tr>
                <Th>Batch No</Th>
                <Th>Bull</Th>
                <Th>Date</Th>
                <Th>Diluent</Th>
                <Th>Glycerol %</Th>
                <Th>Type</Th>
                <Th>Filled</Th>
                <Th>Accepted</Th>
                <Th>Yield %</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {semenBatches.length === 0 && <EmptyRow colSpan={11} label="No processing batches yet." />}
              {semenBatches.map(b => (
                <tr key={b.id} className="transition hover:bg-canvas/60">
                  <Td>
                    <p className="font-semibold text-sm">{b.batchNo}</p>
                    <p className="text-xs text-muted">{b.id}</p>
                  </Td>
                  <Td className="text-sm">{bullName(b.bullId)}</Td>
                  <Td className="text-sm text-muted">{formatDate(b.processingDate)}</Td>
                  <Td className="text-xs text-muted">{b.diluentUsed}</Td>
                  <Td className="text-sm">{b.glycerolPct}%</Td>
                  <Td><Badge tone="blue">{b.packagingType}</Badge></Td>
                  <Td className="font-semibold">{b.totalStrawsFilled}</Td>
                  <Td className="text-green-700 font-semibold">{b.strawsAccepted}</Td>
                  <Td>
                    <ProgressBar
                      value={Math.round((b.strawsAccepted / b.totalStrawsFilled) * 100)}
                      tone={b.strawsAccepted / b.totalStrawsFilled >= 0.9 ? "green" : "amber"}
                    />
                  </Td>
                  <Td><Badge tone={batchStatusTone(b.status)}>{b.status}</Badge></Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setBatchModal({ open: true, editing: b })} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                      <button onClick={() => remove("semenBatches", b.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── BATCH QC TAB ────────────────────────────────────────────────────── */}
      {tab === "batchqc" && (
        <Card className="mt-4">
          <CardHeader title="Post-Thaw Batch Quality Control" action={
            <span className="text-xs text-muted">Minimum standard: post-thaw motility ≥40%</span>
          } />
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Batch</Th>
                <Th>Test Date</Th>
                <Th>Technician</Th>
                <Th>Post-Thaw Motility</Th>
                <Th>Progressive</Th>
                <Th>Morphology</Th>
                <Th>Thaw Protocol</Th>
                <Th>Result</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {semenBatchQuality.length === 0 && <EmptyRow colSpan={10} label="No post-thaw QC records yet." />}
              {semenBatchQuality.map(q => (
                <tr key={q.id} className="transition hover:bg-canvas/60">
                  <Td className="font-mono text-xs text-muted">{q.id}</Td>
                  <Td className="text-sm">{batchLabel(q.batchId)}</Td>
                  <Td className="text-sm text-muted">{formatDate(q.testDate)}</Td>
                  <Td className="text-sm text-muted">{q.testedBy}</Td>
                  <Td><ProgressBar value={q.postThawMotilityPct} tone={q.postThawMotilityPct >= 40 ? "green" : "red"} /></Td>
                  <Td><ProgressBar value={q.postThawProgressivePct} tone={q.postThawProgressivePct >= 30 ? "green" : "amber"} /></Td>
                  <Td><ProgressBar value={q.postThawMorphologyPct} tone={q.postThawMorphologyPct >= 60 ? "green" : "amber"} /></Td>
                  <Td className="text-xs text-muted max-w-[180px] whitespace-normal">{q.thawProtocol}</Td>
                  <Td>
                    <Badge tone={q.result === "Approved" ? "green" : q.result === "Conditional" ? "amber" : "red"}>
                      {q.result}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setBqModal({ open: true, editing: q })} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                      <button onClick={() => remove("semenBatchQuality", q.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── STRAWS TAB ──────────────────────────────────────────────────────── */}
      {tab === "straws" && (
        <Card className="mt-4">
          <CardHeader title="Straw Inventory" action={
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-700 font-medium">{strawsInStock} in stock</span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-blue-700 font-medium">{semenStraws.filter(s => s.status === "Dispatched").length} dispatched</span>
            </div>
          } />
          <Table>
            <thead>
              <tr>
                <Th>Serial</Th>
                <Th>Bull</Th>
                <Th>Batch</Th>
                <Th>Type</Th>
                <Th>Color</Th>
                <Th>Dose (M)</Th>
                <Th>Location</Th>
                <Th>Stored</Th>
                <Th>Expiry</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {semenStraws.length === 0 && <EmptyRow colSpan={11} label="No straws recorded yet." />}
              {semenStraws.map(s => {
                const tank = nitrogenTanks.find(t => t.id === s.tankId);
                const canister = tankCanisters.find(c => c.id === s.canisterId);
                return (
                  <tr key={s.id} className="transition hover:bg-canvas/60">
                    <Td className="font-mono text-xs">{s.serialNumber}</Td>
                    <Td className="text-sm">{bullName(s.bullId)}</Td>
                    <Td className="text-xs text-muted">{s.batchId}</Td>
                    <Td><Badge tone="blue">{s.strawType}</Badge></Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border border-line" style={{ background: s.colorCode.toLowerCase() }} />
                        <span className="text-xs">{s.colorCode}</span>
                      </div>
                    </Td>
                    <Td className="font-semibold">{s.doseMillion}M</Td>
                    <Td className="text-xs text-muted">
                      {tank ? tank.name : s.tankId} / {canister ? canister.code : s.canisterId} / {s.gobletPosition}
                    </Td>
                    <Td className="text-xs text-muted">{formatDate(s.storedDate)}</Td>
                    <Td className="text-xs text-muted">{s.expiryDate ? formatDate(s.expiryDate) : "—"}</Td>
                    <Td><Badge tone={strawStatusTone(s.status)}>{s.status}</Badge></Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setStrawModal({ open: true, editing: s })} className="p-1.5 text-muted hover:text-ink"><Icon.edit width={13} height={13} /></button>
                        <button onClick={() => remove("semenStraws", s.id)} className="p-1.5 text-muted hover:text-red-600"><Icon.trash width={13} height={13} /></button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}

      {/* Quality Test Modal */}
      <Modal
        key={testModal.editing?.id ?? "new-test"}
        open={testModal.open}
        onClose={() => setTestModal({ open: false, editing: null })}
        title={testModal.editing ? "Edit QC Test" : "Record Semen Quality Test"}
        description="Pre-freeze assessment. AI scoring uses ICAR/WHO thresholds."
        size="lg"
      >
        <form onSubmit={submitTest} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Bull" value={testForm.bullId} onChange={setT("bullId")}
              options={bulls.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))}
              required placeholder="— Select bull —" />
            <SelectField label="Collection" value={testForm.collectionId} onChange={setT("collectionId")}
              options={semenCollections.map(c => ({ value: c.id, label: `${c.id} (${formatDate(c.collectionDate)})` }))}
              required placeholder="— Select collection —" />
            <DateField label="Test Date" value={testForm.testDate} onChange={setT("testDate")} required />
            <TextField label="Tested By" value={testForm.testedBy} onChange={setT("testedBy")} required placeholder="Technician name" />
          </FormGrid>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Motility & Morphology</p>
            <FormGrid>
              <NumberField label="Total Motility %" value={testForm.totalMotilityPct} onChange={setT("totalMotilityPct")} required min={0} max={100} placeholder={`≥${MOTILITY_PASS} = Pass`} />
              <NumberField label="Progressive Motility %" value={testForm.progressiveMotilityPct} onChange={setT("progressiveMotilityPct")} required min={0} max={100} />
              <NumberField label="Normal Morphology %" value={testForm.morphologyNormalPct} onChange={setT("morphologyNormalPct")} required min={0} max={100} />
              <NumberField label="Viability %" value={testForm.viabilityPct} onChange={setT("viabilityPct")} required min={0} max={100} />
            </FormGrid>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Physical Parameters</p>
            <FormGrid>
              <NumberField label="Volume (mL)" value={testForm.volumeMl} onChange={setT("volumeMl")} required min={0} />
              <NumberField label="Concentration (M/mL)" value={testForm.concentrationMPerMl} onChange={setT("concentrationMPerMl")} required min={0} />
              <NumberField label="pH" value={testForm.pH} onChange={setT("pH")} required min={5} max={9} placeholder="6.8" />
              <SelectField label="Color / Appearance" value={testForm.colorAppearance} onChange={setT("colorAppearance")}
                options={["Creamy White", "White", "Yellowish", "Pink", "Other"]} required />
            </FormGrid>
          </div>
          <FormGrid>
            <NumberField label="Acrosomal Integrity % (opt)" value={testForm.acrosomalIntegrityPct} onChange={setT("acrosomalIntegrityPct")} min={0} max={100} />
            <NumberField label="DNA Fragmentation % (opt)" value={testForm.dnaFragmentationPct} onChange={setT("dnaFragmentationPct")} min={0} max={100} />
            <SelectField label="Result" value={testForm.result} onChange={setT("result")} options={["Pass", "Marginal", "Fail"]} required />
          </FormGrid>
          <TextAreaField label="Notes" value={testForm.notes} onChange={setT("notes")} placeholder="Optional…" />
          <FormButtons onCancel={() => setTestModal({ open: false, editing: null })} submitLabel="Save Test" />
        </form>
      </Modal>

      {/* Batch Modal */}
      <Modal
        key={batchModal.editing?.id ?? "new-batch"}
        open={batchModal.open}
        onClose={() => setBatchModal({ open: false, editing: null })}
        title={batchModal.editing ? "Edit Batch" : "New Processing Batch"}
        size="lg"
      >
        <form onSubmit={submitBatch} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Bull" value={batchForm.bullId} onChange={setB("bullId")}
              options={bulls.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))}
              required placeholder="— Select bull —" />
            <SelectField label="Collection" value={batchForm.collectionId} onChange={setB("collectionId")}
              options={semenCollections.map(c => ({ value: c.id, label: `${c.id}` }))}
              required placeholder="— Select collection —" />
            <TextField label="Batch Number" value={batchForm.batchNo} onChange={setB("batchNo")} required placeholder="BTH-2026-001" />
            <DateField label="Processing Date" value={batchForm.processingDate} onChange={setB("processingDate")} required />
            <TextField label="Processor" value={batchForm.processor} onChange={setB("processor")} required placeholder="Technician name" />
            <TextField label="Diluent" value={batchForm.diluentUsed} onChange={setB("diluentUsed")} required placeholder="Tris-egg-yolk" />
            <TextField label="Extension Ratio" value={batchForm.extensionRatio} onChange={setB("extensionRatio")} required placeholder="1:4" />
            <NumberField label="Glycerol %" value={batchForm.glycerolPct} onChange={setB("glycerolPct")} required min={0} max={20} />
            <NumberField label="Equilibration (min)" value={batchForm.equilibrationTimeMin} onChange={setB("equilibrationTimeMin")} required min={0} />
            <SelectField label="Packaging Type" value={batchForm.packagingType} onChange={setB("packagingType")} options={["0.25ml", "0.5ml"]} required />
            <NumberField label="Total Filled" value={batchForm.totalStrawsFilled} onChange={setB("totalStrawsFilled")} required min={0} />
            <NumberField label="Accepted" value={batchForm.strawsAccepted} onChange={setB("strawsAccepted")} required min={0} />
            <NumberField label="Rejected" value={batchForm.strawsRejected} onChange={setB("strawsRejected")} required min={0} />
            <SelectField label="Status" value={batchForm.status} onChange={setB("status")} options={[...BATCH_STATUSES]} required />
            <DateField label="Release Date (opt)" value={batchForm.releaseDate} onChange={setB("releaseDate")} />
          </FormGrid>
          <TextAreaField label="Notes" value={batchForm.notes} onChange={setB("notes")} />
          <FormButtons onCancel={() => setBatchModal({ open: false, editing: null })} submitLabel="Save Batch" />
        </form>
      </Modal>

      {/* Batch QC Modal */}
      <Modal
        key={bqModal.editing?.id ?? "new-bq"}
        open={bqModal.open}
        onClose={() => setBqModal({ open: false, editing: null })}
        title={bqModal.editing ? "Edit Post-Thaw QC" : "Record Post-Thaw QC"}
      >
        <form onSubmit={submitBq} className="space-y-4 p-5">
          <SelectField label="Batch" value={bqForm.batchId} onChange={setBq("batchId")}
            options={semenBatches.map(b => ({ value: b.id, label: `${b.batchNo} (${b.id})` }))}
            required placeholder="— Select batch —" />
          <FormGrid>
            <DateField label="Test Date" value={bqForm.testDate} onChange={setBq("testDate")} required />
            <TextField label="Tested By" value={bqForm.testedBy} onChange={setBq("testedBy")} required />
            <NumberField label="Post-Thaw Motility %" value={bqForm.postThawMotilityPct} onChange={setBq("postThawMotilityPct")} required min={0} max={100} placeholder="≥40 = ICAR pass" />
            <NumberField label="Progressive Motility %" value={bqForm.postThawProgressivePct} onChange={setBq("postThawProgressivePct")} required min={0} max={100} />
            <NumberField label="Morphology %" value={bqForm.postThawMorphologyPct} onChange={setBq("postThawMorphologyPct")} required min={0} max={100} />
            <SelectField label="Thaw Protocol" value={bqForm.thawProtocol} onChange={setBq("thawProtocol")} options={THAW_PROTOCOLS} required />
            <SelectField label="Result" value={bqForm.result} onChange={setBq("result")} options={["Approved", "Conditional", "Rejected"]} required />
          </FormGrid>
          <TextAreaField label="Notes" value={bqForm.notes} onChange={setBq("notes")} />
          <FormButtons onCancel={() => setBqModal({ open: false, editing: null })} submitLabel="Save QC" />
        </form>
      </Modal>

      {/* Straw Modal */}
      <Modal
        key={strawModal.editing?.id ?? "new-straw"}
        open={strawModal.open}
        onClose={() => setStrawModal({ open: false, editing: null })}
        title={strawModal.editing ? "Edit Straw" : "Register Straw"}
        size="lg"
      >
        <form onSubmit={submitStraw} className="space-y-4 p-5">
          <FormGrid>
            <SelectField label="Batch" value={strawForm.batchId} onChange={setSt("batchId")}
              options={semenBatches.map(b => ({ value: b.id, label: b.batchNo }))} required placeholder="— Select batch —" />
            <SelectField label="Bull" value={strawForm.bullId} onChange={setSt("bullId")}
              options={bulls.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))} required placeholder="— Select bull —" />
            <TextField label="Serial Number" value={strawForm.serialNumber} onChange={setSt("serialNumber")} required placeholder="TK01-CA1-0001" />
            <SelectField label="Straw Type" value={strawForm.strawType} onChange={setSt("strawType")} options={["0.25ml", "0.5ml"]} required />
            <SelectField label="Color Code" value={strawForm.colorCode} onChange={setSt("colorCode")} options={COLOR_OPTIONS} required />
            <NumberField label="Dose (million sperm)" value={strawForm.doseMillion} onChange={setSt("doseMillion")} required min={0} />
            <SelectField label="Tank" value={strawForm.tankId} onChange={setSt("tankId")}
              options={nitrogenTanks.map(t => ({ value: t.id, label: t.name }))} required placeholder="— Select tank —" />
            <SelectField label="Canister" value={strawForm.canisterId} onChange={setSt("canisterId")}
              options={tankCanisters.filter(c => !strawForm.tankId || c.tankId === strawForm.tankId).map(c => ({ value: c.id, label: c.code }))}
              required placeholder="— Select canister —" />
            <TextField label="Goblet Position" value={strawForm.gobletPosition} onChange={setSt("gobletPosition")} required placeholder="G1-R1" />
            <DateField label="Stored Date" value={strawForm.storedDate} onChange={setSt("storedDate")} required />
            <DateField label="Expiry Date (opt)" value={strawForm.expiryDate} onChange={setSt("expiryDate")} />
            <SelectField label="Status" value={strawForm.status} onChange={setSt("status")} options={[...STRAW_STATUSES]} required />
          </FormGrid>
          <TextAreaField label="Notes" value={strawForm.notes} onChange={setSt("notes")} />
          <FormButtons onCancel={() => setStrawModal({ open: false, editing: null })} submitLabel="Save Straw" />
        </form>
      </Modal>
    </>
  );
}
