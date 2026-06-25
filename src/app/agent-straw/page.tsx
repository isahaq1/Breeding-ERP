"use client";

import React, { useMemo, useState } from "react";
import {
  PageHeader,
  StatCard,
  Card,
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
  SelectField,
  NumberField,
  DateField,
  TextAreaField,
  RowActions,
} from "@/components/forms";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import { formatDate } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type Form = {
  issueDate: string;
  dpId: string;
  agentId: string;
  semenCatalogId: string;
  batchId: string;
  quantityIssued: string;
  quantityUsed: string;
  quantityReturned: string;
  quantityWasted: string;
  status: string;
  closedDate: string;
  notes: string;
};

type ReconcileForm = {
  quantityUsed: string;
  quantityReturned: string;
  quantityWasted: string;
  notes: string;
};

const emptyForm: Form = {
  issueDate: "",
  dpId: "",
  agentId: "",
  semenCatalogId: "",
  batchId: "",
  quantityIssued: "",
  quantityUsed: "0",
  quantityReturned: "0",
  quantityWasted: "0",
  status: "Open",
  closedDate: "",
  notes: "",
};

const TODAY_ISO = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────

function balance(issued: number, used: number, returned: number, wasted: number): number {
  return issued - used - returned - wasted;
}

// ══════════════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════════════

export default function AgentStrawPage() {
  const {
    agentStrawIssues,
    addAgentStrawIssue,
    update,
    remove,
    distributionPoints,
    saleAgents,
    semenCatalog,
    semenBatches,
  } = useData();

  // ── Tab ─────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");

  // ── Add / Edit modal ────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{ open: boolean; editId: string | null }>({
    open: false,
    editId: null,
  });
  const [form, setForm] = useState<Form>(emptyForm);
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Reconcile modal ─────────────────────────────────────────────────────────
  const [reconcileModal, setReconcileModal] = useState<{
    open: boolean;
    issueId: string | null;
  }>({ open: false, issueId: null });
  const [recForm, setRecForm] = useState<ReconcileForm>({
    quantityUsed: "0",
    quantityReturned: "0",
    quantityWasted: "0",
    notes: "",
  });
  const setRec = (k: keyof ReconcileForm) => (v: string) =>
    setRecForm((f) => ({ ...f, [k]: v }));

  // ── "All Issues" filters ─────────────────────────────────────────────────────
  const [filterAgent, setFilterAgent] = useState("");
  const [filterDp, setFilterDp] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ── Lookups ──────────────────────────────────────────────────────────────────
  function dpName(id: string) {
    return distributionPoints.find((d) => d.id === id)?.name ?? id;
  }
  function agentName(id: string) {
    const a = saleAgents.find((s) => s.id === id);
    return a ? `${a.firstName} ${a.lastName}` : id;
  }
  function catalogLabel(id: string) {
    const c = semenCatalog.find((s) => s.id === id);
    return c ? `${c.bullName} (${c.breed})` : id;
  }
  function batchLabel(id?: string) {
    if (!id) return "—";
    return semenBatches.find((b) => b.id === id)?.batchNo ?? id;
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = agentStrawIssues.length;
    const open = agentStrawIssues.filter((i) => i.status === "Open").length;
    const closed = agentStrawIssues.filter((i) => i.status === "Closed").length;
    const totalIssued = agentStrawIssues.reduce((s, i) => s + i.quantityIssued, 0);
    const totalUsed = agentStrawIssues.reduce((s, i) => s + i.quantityUsed, 0);
    return { total, open, closed, totalIssued, totalUsed };
  }, [agentStrawIssues]);

  // ── Active issues ─────────────────────────────────────────────────────────────
  const activeIssues = useMemo(
    () => agentStrawIssues.filter((i) => i.status === "Open"),
    [agentStrawIssues],
  );

  // ── Filtered all issues ───────────────────────────────────────────────────────
  const filteredIssues = useMemo(() => {
    return agentStrawIssues.filter((i) => {
      if (filterAgent && i.agentId !== filterAgent) return false;
      if (filterDp && i.dpId !== filterDp) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      return true;
    });
  }, [agentStrawIssues, filterAgent, filterDp, filterStatus]);

  // ── Batches filtered by selected catalog ──────────────────────────────────────
  const filteredBatches = useMemo(() => {
    if (!form.semenCatalogId) return semenBatches;
    // SemenBatch links to a collection, but we can show all batches when no filter applies
    return semenBatches;
  }, [semenBatches, form.semenCatalogId]);

  // ── Open add modal ────────────────────────────────────────────────────────────
  function openAdd() {
    setForm(emptyForm);
    setModal({ open: true, editId: null });
  }

  // ── Open edit modal ────────────────────────────────────────────────────────────
  function openEdit(id: string) {
    const issue = agentStrawIssues.find((i) => i.id === id);
    if (!issue) return;
    setForm({
      issueDate: issue.issueDate,
      dpId: issue.dpId,
      agentId: issue.agentId,
      semenCatalogId: issue.semenCatalogId,
      batchId: issue.batchId ?? "",
      quantityIssued: String(issue.quantityIssued),
      quantityUsed: String(issue.quantityUsed),
      quantityReturned: String(issue.quantityReturned),
      quantityWasted: String(issue.quantityWasted),
      status: issue.status,
      closedDate: issue.closedDate ?? "",
      notes: issue.notes ?? "",
    });
    setModal({ open: true, editId: id });
  }

  // ── Open reconcile modal ──────────────────────────────────────────────────────
  function openReconcile(id: string) {
    const issue = agentStrawIssues.find((i) => i.id === id);
    if (!issue) return;
    setRecForm({
      quantityUsed: String(issue.quantityUsed),
      quantityReturned: String(issue.quantityReturned),
      quantityWasted: String(issue.quantityWasted),
      notes: issue.notes ?? "",
    });
    setReconcileModal({ open: true, issueId: id });
  }

  // ── Submit add/edit ───────────────────────────────────────────────────────────
  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const payload = {
      issueDate: form.issueDate,
      dpId: form.dpId,
      agentId: form.agentId,
      semenCatalogId: form.semenCatalogId,
      batchId: form.batchId || undefined,
      quantityIssued: Number(form.quantityIssued),
      quantityUsed: Number(form.quantityUsed),
      quantityReturned: Number(form.quantityReturned),
      quantityWasted: Number(form.quantityWasted),
      status: form.status as "Open" | "Closed",
      closedDate: form.closedDate || undefined,
      notes: form.notes || undefined,
    };
    if (modal.editId) {
      update("agentStrawIssues", modal.editId, payload);
    } else {
      addAgentStrawIssue(payload);
    }
    setModal({ open: false, editId: null });
  }

  // ── Submit reconcile ──────────────────────────────────────────────────────────
  function handleReconcile(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!reconcileModal.issueId) return;
    update("agentStrawIssues", reconcileModal.issueId, {
      quantityUsed: Number(recForm.quantityUsed),
      quantityReturned: Number(recForm.quantityReturned),
      quantityWasted: Number(recForm.quantityWasted),
      status: "Closed",
      closedDate: TODAY_ISO,
      notes: recForm.notes || undefined,
    });
    setReconcileModal({ open: false, issueId: null });
  }

  // ── Reconcile modal data ──────────────────────────────────────────────────────
  const reconcileIssue = useMemo(
    () =>
      reconcileModal.issueId
        ? agentStrawIssues.find((i) => i.id === reconcileModal.issueId) ?? null
        : null,
    [reconcileModal.issueId, agentStrawIssues],
  );

  const recBalance = reconcileIssue
    ? balance(
        reconcileIssue.quantityIssued,
        Number(recForm.quantityUsed),
        Number(recForm.quantityReturned),
        Number(recForm.quantityWasted),
      )
    : 0;

  // ── Balance cell ──────────────────────────────────────────────────────────────
  function BalanceCell({ issued, used, returned, wasted }: { issued: number; used: number; returned: number; wasted: number }) {
    const bal = balance(issued, used, returned, wasted);
    const cls =
      bal < 0
        ? "font-semibold text-red-600"
        : bal > 0
          ? "font-semibold text-amber-600"
          : "text-muted";
    return <span className={cls}>{bal}</span>;
  }

  // ── Issue row ─────────────────────────────────────────────────────────────────
  function IssueRow({
    issue,
    showReconcile,
  }: {
    issue: (typeof agentStrawIssues)[number];
    showReconcile?: boolean;
  }) {
    return (
      <tr className="hover:bg-canvas/60 transition">
        <Td>{formatDate(issue.issueDate)}</Td>
        <Td>{dpName(issue.dpId)}</Td>
        <Td className="font-medium">{agentName(issue.agentId)}</Td>
        <Td>{catalogLabel(issue.semenCatalogId)}</Td>
        <Td className="font-mono text-xs">{batchLabel(issue.batchId)}</Td>
        <Td className="tabular-nums text-right">{issue.quantityIssued}</Td>
        <Td className="tabular-nums text-right">{issue.quantityUsed}</Td>
        <Td className="tabular-nums text-right">{issue.quantityReturned}</Td>
        <Td className="tabular-nums text-right">{issue.quantityWasted}</Td>
        <Td className="text-right">
          <BalanceCell
            issued={issue.quantityIssued}
            used={issue.quantityUsed}
            returned={issue.quantityReturned}
            wasted={issue.quantityWasted}
          />
        </Td>
        <Td>
          <Badge tone={issue.status === "Open" ? "amber" : "green"}>
            {issue.status}
          </Badge>
        </Td>
        <Td>
          <div className="flex items-center gap-1">
            {showReconcile && issue.status === "Open" && (
              <button
                type="button"
                onClick={() => openReconcile(issue.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-medium text-ink hover:bg-canvas transition"
              >
                <Icon.edit width={11} height={11} />
                Reconcile
              </button>
            )}
            <RowActions
              label={`issue ${issue.id}`}
              onEdit={() => openEdit(issue.id)}
              onDelete={() => remove("agentStrawIssues", issue.id)}
            />
          </div>
        </Td>
      </tr>
    );
  }

  // ── Table headers ─────────────────────────────────────────────────────────────
  function IssueTableHead() {
    return (
      <thead>
        <tr>
          <Th>Issue Date</Th>
          <Th>DP</Th>
          <Th>Agent</Th>
          <Th>Bull / Semen</Th>
          <Th>Batch</Th>
          <Th className="text-right">Issued</Th>
          <Th className="text-right">Used</Th>
          <Th className="text-right">Returned</Th>
          <Th className="text-right">Wasted</Th>
          <Th className="text-right">Balance</Th>
          <Th>Status</Th>
          <Th className="text-right">Actions</Th>
        </tr>
      </thead>
    );
  }

  // ── Form balance (add/edit modal) ─────────────────────────────────────────────
  const formBalance = balance(
    Number(form.quantityIssued) || 0,
    Number(form.quantityUsed) || 0,
    Number(form.quantityReturned) || 0,
    Number(form.quantityWasted) || 0,
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page header */}
      <PageHeader
        title="Agent Straw Issuance"
        description="Track straw issuance to field agents from distribution points and reconcile usage, returns, and wastage."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Issue Straws
          </PrimaryButton>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Total Issues" value={String(stats.total)} iconName="report" tone="blue" />
        <StatCard label="Open Issues" value={String(stats.open)} iconName="bell" tone="amber" />
        <StatCard label="Closed Issues" value={String(stats.closed)} iconName="shield" tone="green" />
        <StatCard label="Total Straws Issued" value={String(stats.totalIssued)} iconName="dna" tone="purple" />
        <StatCard label="Total Straws Used" value={String(stats.totalUsed)} iconName="vial" tone="blue" />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-line bg-canvas p-1">
        {(
          [
            { k: "active", l: `Active Issues (${activeIssues.length})` },
            { k: "all", l: `All Issues / History (${agentStrawIssues.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setActiveTab(t.k)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              activeTab === t.k
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Active Issues tab ─────────────────────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="mt-4">
          {activeIssues.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted">
              No open straw issues. All issues have been reconciled.
            </Card>
          ) : (
            <Card className="overflow-hidden border-amber-200 bg-amber-50/30">
              <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3">
                <Icon.bell width={16} height={16} />
                <span className="text-sm font-semibold text-amber-900">
                  {activeIssues.length} open issue{activeIssues.length !== 1 ? "s" : ""} pending reconciliation
                </span>
              </div>
              <Table>
                <IssueTableHead />
                <tbody>
                  {activeIssues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} showReconcile />
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ── All Issues tab ────────────────────────────────────────────────────── */}
      {activeTab === "all" && (
        <div className="mt-4 space-y-3">
          {/* Filters */}
          <Card className="px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SelectField
                label="Filter by Agent"
                value={filterAgent}
                onChange={setFilterAgent}
                placeholder="All Agents"
                options={saleAgents.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                }))}
              />
              <SelectField
                label="Filter by DP"
                value={filterDp}
                onChange={setFilterDp}
                placeholder="All Distribution Points"
                options={distributionPoints.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
              <SelectField
                label="Filter by Status"
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="All Statuses"
                options={["Open", "Closed"]}
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <IssueTableHead />
              <tbody>
                {filteredIssues.length === 0 && (
                  <EmptyRow colSpan={12} label="No issues match the current filters." />
                )}
                {filteredIssues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} showReconcile={false} />
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {/* ══════════════════════════ MODALS ════════════════════════════════════════ */}

      {/* Reconcile modal */}
      <Modal
        key={reconcileModal.issueId ?? "rec-closed"}
        open={reconcileModal.open}
        onClose={() => setReconcileModal({ open: false, issueId: null })}
        title="Close / Reconcile Issue"
        description="Update actual straws used, returned, and wasted, then close this issue."
        size="md"
      >
        {reconcileIssue && (
          <form onSubmit={handleReconcile} className="space-y-4 p-5">
            {/* Read-only context */}
            <div className="rounded-lg border border-line bg-canvas px-4 py-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Agent</span>
                <span className="font-semibold">{agentName(reconcileIssue.agentId)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Issue Date</span>
                <span>{formatDate(reconcileIssue.issueDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Distribution Point</span>
                <span>{dpName(reconcileIssue.dpId)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Straws Issued</span>
                <span className="font-semibold tabular-nums">{reconcileIssue.quantityIssued}</span>
              </div>
            </div>

            {/* Editable quantities */}
            <FormGrid>
              <NumberField
                label="Straws Used"
                value={recForm.quantityUsed}
                onChange={setRec("quantityUsed")}
                min={0}
                required
              />
              <NumberField
                label="Straws Returned"
                value={recForm.quantityReturned}
                onChange={setRec("quantityReturned")}
                min={0}
                required
              />
              <NumberField
                label="Straws Wasted"
                value={recForm.quantityWasted}
                onChange={setRec("quantityWasted")}
                min={0}
                required
              />
              {/* Computed balance */}
              <div className="flex flex-col justify-end pb-1">
                <p className="mb-1 text-xs font-medium text-muted">Balance (Unaccounted)</p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    recBalance < 0
                      ? "text-red-600"
                      : recBalance > 0
                        ? "text-amber-600"
                        : "text-brand-700"
                  }`}
                >
                  {recBalance}
                </p>
              </div>
            </FormGrid>

            <TextAreaField
              label="Notes"
              value={recForm.notes}
              onChange={setRec("notes")}
              placeholder="Any remarks about the reconciliation…"
            />

            <FormButtons
              onCancel={() => setReconcileModal({ open: false, issueId: null })}
              submitLabel="Close Issue"
            />
          </form>
        )}
      </Modal>

      {/* Add / Edit modal */}
      <Modal
        key={modal.editId ?? "new-issue"}
        open={modal.open}
        onClose={() => setModal({ open: false, editId: null })}
        title={modal.editId ? "Edit Straw Issue" : "Issue Straws to Agent"}
        description="Record straws issued from a distribution point to a field agent."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {/* Section 1 — Issue Details */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Issue Details
            </p>
            <FormGrid>
              <DateField
                label="Issue Date"
                value={form.issueDate}
                onChange={set("issueDate")}
                required
              />
              <SelectField
                label="Distribution Point"
                value={form.dpId}
                onChange={set("dpId")}
                required
                placeholder="— Select DP —"
                options={distributionPoints.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
              <SelectField
                label="Agent"
                value={form.agentId}
                onChange={set("agentId")}
                required
                placeholder="— Select Agent —"
                options={saleAgents.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                }))}
              />
              <SelectField
                label="Bull / Semen Catalog"
                value={form.semenCatalogId}
                onChange={set("semenCatalogId")}
                required
                placeholder="— Select Bull —"
                options={semenCatalog.map((c) => ({
                  value: c.id,
                  label: `${c.bullName} (${c.breed})`,
                }))}
              />
              <SelectField
                label="Batch (optional)"
                value={form.batchId}
                onChange={set("batchId")}
                placeholder="— No specific batch —"
                options={filteredBatches.map((b) => ({
                  value: b.id,
                  label: b.batchNo,
                }))}
              />
              <NumberField
                label="Quantity Issued"
                value={form.quantityIssued}
                onChange={set("quantityIssued")}
                min={1}
                required
              />
              <SelectField
                label="Status"
                value={form.status}
                onChange={set("status")}
                required
                options={["Open", "Closed"]}
              />
              {form.status === "Closed" && (
                <DateField
                  label="Closed Date"
                  value={form.closedDate}
                  onChange={set("closedDate")}
                />
              )}
            </FormGrid>
          </div>

          {/* Section 2 — Reconciliation */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Reconciliation
            </p>
            <FormGrid>
              <NumberField
                label="Quantity Used"
                value={form.quantityUsed}
                onChange={set("quantityUsed")}
                min={0}
              />
              <NumberField
                label="Quantity Returned"
                value={form.quantityReturned}
                onChange={set("quantityReturned")}
                min={0}
              />
              <NumberField
                label="Quantity Wasted"
                value={form.quantityWasted}
                onChange={set("quantityWasted")}
                min={0}
              />
              <div className="flex flex-col justify-end pb-1">
                <p className="mb-1 text-xs font-medium text-muted">Balance (computed)</p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    formBalance < 0
                      ? "text-red-600"
                      : formBalance > 0
                        ? "text-amber-600"
                        : "text-brand-700"
                  }`}
                >
                  {formBalance}
                </p>
              </div>
            </FormGrid>
            <div className="mt-3">
              <TextAreaField
                label="Notes"
                value={form.notes}
                onChange={set("notes")}
                placeholder="Optional notes about this issue…"
              />
            </div>
          </div>

          <FormButtons
            onCancel={() => setModal({ open: false, editId: null })}
            submitLabel={modal.editId ? "Save Changes" : "Issue Straws"}
          />
        </form>
      </Modal>
    </>
  );
}
