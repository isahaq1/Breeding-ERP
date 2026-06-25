"use client";

import { useMemo, useState } from "react";
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
  DateField,
  SelectField,
  NumberField,
  TextAreaField,
  RowActions,
  TextField,
} from "@/components/forms";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import type { PregnancyDiagnosis, PDMethod, PDResult, InseminationEvent } from "@/lib/types";
import { formatDate, daysUntil } from "@/lib/format";

// ---- Constants ---------------------------------------------------------------

const PD_METHODS: PDMethod[] = [
  "Rectal Palpation",
  "Ultrasound",
  "Blood Test",
  "Milk Progesterone",
  "Visual",
];

const PD_RESULTS: PDResult[] = ["Pregnant", "Open", "Twins", "Aborted", "Uncertain"];

const ALERT_WINDOW_DAYS = 7;

// ---- Helpers -----------------------------------------------------------------

function resultTone(
  result: PDResult,
): "green" | "purple" | "red" | "gray" | "amber" {
  switch (result) {
    case "Pregnant":
      return "green";
    case "Twins":
      return "purple";
    case "Open":
      return "red";
    case "Aborted":
      return "gray";
    case "Uncertain":
      return "amber";
  }
}

function computeDaysAfter(inseminationDate: string, diagnosisDate: string): number {
  if (!inseminationDate || !diagnosisDate) return 0;
  const a = new Date(inseminationDate + "T00:00:00Z");
  const b = new Date(diagnosisDate + "T00:00:00Z");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- Form type ---------------------------------------------------------------

interface Form {
  inseminationEventId: string;
  farmerCattleId: string;
  farmId: string;
  diagnosisDate: string;
  daysAfterService: string;
  method: PDMethod | "";
  result: PDResult | "";
  conductedBy: string;
  agentId: string;
  estimatedCalvingDate: string;
  repeatServiceScheduled: boolean;
  repeatServiceDate: string;
  notes: string;
}

const emptyForm: Form = {
  inseminationEventId: "",
  farmerCattleId: "",
  farmId: "",
  diagnosisDate: todayIso(),
  daysAfterService: "",
  method: "",
  result: "",
  conductedBy: "",
  agentId: "",
  estimatedCalvingDate: "",
  repeatServiceScheduled: false,
  repeatServiceDate: "",
  notes: "",
};

// ---- Main page ---------------------------------------------------------------

export default function PregnancyDiagnosisPage() {
  const {
    pregnancyDiagnoses,
    addPregnancyDiagnosis,
    update,
    remove,
    inseminationEvents,
    farmerCattle,
    saleAgents,
  } = useData();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [pendingFilter, setPendingFilter] = useState(false);

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ---- Derived stats ----------------------------------------------------------

  const totalCount = pregnancyDiagnoses.length;
  const pregnantCount = pregnancyDiagnoses.filter(
    (pd) => pd.result === "Pregnant" || pd.result === "Twins",
  ).length;
  const openCount = pregnancyDiagnoses.filter((pd) => pd.result === "Open").length;
  const twinsCount = pregnancyDiagnoses.filter((pd) => pd.result === "Twins").length;
  const repeatCount = pregnancyDiagnoses.filter(
    (pd) => pd.repeatServiceScheduled === true,
  ).length;

  // ---- Pending PD events (no diagnosis yet, result = "Pending PD") ------------

  const diagnosedEventIds = useMemo(
    () => new Set(pregnancyDiagnoses.map((pd) => pd.inseminationEventId)),
    [pregnancyDiagnoses],
  );

  const pendingEvents = useMemo<InseminationEvent[]>(
    () =>
      inseminationEvents
        .filter(
          (ie) =>
            ie.result === "Pending PD" && !diagnosedEventIds.has(ie.id),
        )
        .sort((a, b) => {
          const da = a.pdScheduledDate ?? a.inseminationDate;
          const db = b.pdScheduledDate ?? b.inseminationDate;
          return da.localeCompare(db);
        }),
    [inseminationEvents, diagnosedEventIds],
  );

  // ---- Alert: overdue / due soon ----------------------------------------------

  const alertEvents = useMemo(
    () =>
      pendingEvents.filter((ie) => {
        if (!ie.pdScheduledDate) return false;
        const days = daysUntil(ie.pdScheduledDate);
        return days <= ALERT_WINDOW_DAYS;
      }),
    [pendingEvents],
  );

  // ---- Sorted diagnoses -------------------------------------------------------

  const sorted = useMemo(
    () =>
      [...pregnancyDiagnoses].sort((a, b) =>
        b.diagnosisDate.localeCompare(a.diagnosisDate),
      ),
    [pregnancyDiagnoses],
  );

  // ---- Lookups ----------------------------------------------------------------

  function getCattle(fcId: string) {
    return farmerCattle.find((fc) => fc.id === fcId);
  }

  function getEvent(ieId: string) {
    return inseminationEvents.find((ie) => ie.id === ieId);
  }

  function cowLabel(fcId: string) {
    const fc = getCattle(fcId);
    if (!fc) return fcId;
    return fc.name ? `${fc.name} (${fc.tagNumber})` : fc.tagNumber;
  }

  function eventLabel(ie: InseminationEvent) {
    const cattle = getCattle(ie.farmerCattleId);
    const tag = cattle
      ? cattle.name
        ? `${cattle.name} (${cattle.tagNumber})`
        : cattle.tagNumber
      : ie.farmerCattleId;
    return `${tag} — ${formatDate(ie.inseminationDate)}`;
  }

  // ---- Modal helpers ----------------------------------------------------------

  function openAdd(prefillEvent?: InseminationEvent) {
    setEditingId(null);
    if (prefillEvent) {
      setForm({
        ...emptyForm,
        inseminationEventId: prefillEvent.id,
        farmerCattleId: prefillEvent.farmerCattleId,
        farmId: prefillEvent.farmId,
        agentId: prefillEvent.agentId ?? "",
        diagnosisDate: todayIso(),
        daysAfterService: String(
          computeDaysAfter(prefillEvent.inseminationDate, todayIso()),
        ),
      });
    } else {
      setForm(emptyForm);
    }
    setOpen(true);
  }

  function openEdit(pd: PregnancyDiagnosis) {
    setEditingId(pd.id);
    setForm({
      inseminationEventId: pd.inseminationEventId,
      farmerCattleId: pd.farmerCattleId,
      farmId: pd.farmId,
      diagnosisDate: pd.diagnosisDate,
      daysAfterService: String(pd.daysAfterService),
      method: pd.method,
      result: pd.result,
      conductedBy: pd.conductedBy,
      agentId: pd.agentId ?? "",
      estimatedCalvingDate: pd.estimatedCalvingDate ?? "",
      repeatServiceScheduled: pd.repeatServiceScheduled ?? false,
      repeatServiceDate: pd.repeatServiceDate ?? "",
      notes: pd.notes ?? "",
    });
    setOpen(true);
  }

  function onInseminationChange(ieId: string) {
    const ie = getEvent(ieId);
    setForm((f) => {
      const days = ie
        ? String(computeDaysAfter(ie.inseminationDate, f.diagnosisDate))
        : f.daysAfterService;
      return {
        ...f,
        inseminationEventId: ieId,
        farmerCattleId: ie ? ie.farmerCattleId : f.farmerCattleId,
        farmId: ie ? ie.farmId : f.farmId,
        daysAfterService: days,
      };
    });
  }

  function onDiagnosisDateChange(date: string) {
    setForm((f) => {
      const ie = getEvent(f.inseminationEventId);
      const days = ie
        ? String(computeDaysAfter(ie.inseminationDate, date))
        : f.daysAfterService;
      return { ...f, diagnosisDate: date, daysAfterService: days };
    });
  }

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!form.method || !form.result) return;

    const payload: Omit<PregnancyDiagnosis, "id"> = {
      inseminationEventId: form.inseminationEventId,
      farmerCattleId: form.farmerCattleId,
      farmId: form.farmId,
      diagnosisDate: form.diagnosisDate,
      daysAfterService: Number(form.daysAfterService) || 0,
      method: form.method as PDMethod,
      result: form.result as PDResult,
      conductedBy: form.conductedBy.trim(),
      agentId: form.agentId || undefined,
      estimatedCalvingDate: form.estimatedCalvingDate || undefined,
      repeatServiceScheduled: form.repeatServiceScheduled || undefined,
      repeatServiceDate: form.repeatServiceDate || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      update("pregnancyDiagnoses", editingId, payload);
    } else {
      addPregnancyDiagnosis(payload);
    }

    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  // ---- Pending events for display (filtered when user clicked alert) ----------

  const displayedPending = pendingFilter
    ? alertEvents
    : pendingEvents;

  // ---- Render -----------------------------------------------------------------

  return (
    <>
      <PageHeader
        title="Pregnancy Diagnosis"
        description="Record and track PD outcomes for inseminated cows. Monitor pregnant, open, and repeat-service animals."
        action={
          <PrimaryButton onClick={() => openAdd()}>
            <Icon.plus width={16} height={16} />
            Record PD
          </PrimaryButton>
        }
      />

      {/* Alert banner */}
      {alertEvents.length > 0 && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Icon.stethoscope width={18} height={18} className="shrink-0 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              <strong>{alertEvents.length}</strong>{" "}
              {alertEvents.length === 1 ? "cow is" : "cows are"} overdue or due soon for
              a pregnancy check.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingFilter((v) => !v);
              window.document
                .getElementById("pending-pd-section")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="ml-4 shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
          >
            {pendingFilter ? "Show all pending" : "Show overdue only"}
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total PD Records"
          value={String(totalCount)}
          iconName="report"
          tone="blue"
        />
        <StatCard
          label="Pregnant"
          value={String(pregnantCount)}
          iconName="heart"
          tone="green"
        />
        <StatCard
          label="Open"
          value={String(openCount)}
          iconName="cow"
          tone="red"
        />
        <StatCard
          label="Twins"
          value={String(twinsCount)}
          iconName="baby"
          tone="purple"
        />
        <StatCard
          label="Repeat Service Scheduled"
          value={String(repeatCount)}
          iconName="syringe"
          tone="amber"
        />
      </div>

      {/* Pending PD section */}
      <div id="pending-pd-section">
        {pendingEvents.length > 0 && (
          <Card className="mt-6">
            <CardHeader
              title={
                pendingFilter
                  ? `Overdue / Due Soon (${displayedPending.length})`
                  : `Pending Pregnancy Checks (${pendingEvents.length})`
              }
              action={
                pendingFilter ? (
                  <button
                    type="button"
                    onClick={() => setPendingFilter(false)}
                    className="text-xs text-muted underline hover:text-ink"
                  >
                    Show all
                  </button>
                ) : null
              }
            />
            <div className="rounded-xl bg-amber-50/60 p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Cow</Th>
                    <Th>Insemination Date</Th>
                    <Th>PD Due Date</Th>
                    <Th>Days Overdue / Remaining</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPending.length === 0 ? (
                    <EmptyRow colSpan={5} label="No events match this filter." />
                  ) : (
                    displayedPending.map((ie) => {
                      const dueDate = ie.pdScheduledDate;
                      const days = dueDate ? daysUntil(dueDate) : null;
                      const overdue = days !== null && days < 0;
                      const urgent = days !== null && days >= 0 && days <= ALERT_WINDOW_DAYS;

                      return (
                        <tr key={ie.id} className="transition hover:bg-amber-50">
                          <Td className="font-medium">{cowLabel(ie.farmerCattleId)}</Td>
                          <Td>{formatDate(ie.inseminationDate)}</Td>
                          <Td>{dueDate ? formatDate(dueDate) : "—"}</Td>
                          <Td>
                            {days === null ? (
                              <span className="text-muted">—</span>
                            ) : overdue ? (
                              <Badge tone="red">{Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""} overdue</Badge>
                            ) : urgent ? (
                              <Badge tone="amber">{days} day{days !== 1 ? "s" : ""} remaining</Badge>
                            ) : (
                              <Badge tone="gray">{days} day{days !== 1 ? "s" : ""} remaining</Badge>
                            )}
                          </Td>
                          <Td className="text-right">
                            <button
                              type="button"
                              onClick={() => openAdd(ie)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
                            >
                              <Icon.plus width={13} height={13} />
                              Record PD
                            </button>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* PD Records table */}
      <Card className="mt-6">
        <CardHeader title="Pregnancy Diagnosis Records" />
        <Table>
          <thead>
            <tr>
              <Th>Insemination Date</Th>
              <Th>Cow</Th>
              <Th>Service Days</Th>
              <Th>Diagnosis Date</Th>
              <Th>Days After</Th>
              <Th>Method</Th>
              <Th>Result</Th>
              <Th>Calving Expected</Th>
              <Th>Conducted By</Th>
              <Th>Repeat Service</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <EmptyRow colSpan={11} label="No pregnancy diagnosis records yet. Use 'Record PD' to add one." />
            ) : (
              sorted.map((pd) => {
                const ie = getEvent(pd.inseminationEventId);
                return (
                  <tr key={pd.id} className="transition hover:bg-canvas/60">
                    <Td className="text-muted">
                      {ie ? formatDate(ie.inseminationDate) : "—"}
                    </Td>
                    <Td className="font-medium">{cowLabel(pd.farmerCattleId)}</Td>
                    <Td className="text-muted text-center">
                      {ie ? (
                        <Badge tone="gray">
                          {computeDaysAfter(ie.inseminationDate, pd.diagnosisDate)} d
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{formatDate(pd.diagnosisDate)}</Td>
                    <Td className="text-muted text-center">{pd.daysAfterService}</Td>
                    <Td>
                      <Badge tone="blue">{pd.method}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={resultTone(pd.result)}>{pd.result}</Badge>
                    </Td>
                    <Td className="text-muted">
                      {pd.estimatedCalvingDate ? formatDate(pd.estimatedCalvingDate) : "—"}
                    </Td>
                    <Td className="text-muted">{pd.conductedBy}</Td>
                    <Td>
                      {pd.repeatServiceScheduled ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge tone="amber">Scheduled</Badge>
                          {pd.repeatServiceDate && (
                            <span className="text-[11px] text-muted">
                              {formatDate(pd.repeatServiceDate)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted/50">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <RowActions
                          onEdit={() => openEdit(pd)}
                          onDelete={() => remove("pregnancyDiagnoses", pd.id)}
                          label={pd.id}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? `Edit PD Record — ${editingId}` : "Record Pregnancy Diagnosis"}
        description={
          editingId
            ? "Update the pregnancy diagnosis details below."
            : "Record the outcome of a pregnancy diagnosis examination."
        }
        size="lg"
      >
        <form onSubmit={submit} className="space-y-5 p-5">
          {/* Insemination event */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Insemination Reference
            </p>
            <SelectField
              label="Insemination Event"
              value={form.inseminationEventId}
              onChange={onInseminationChange}
              options={inseminationEvents.map((ie) => ({
                value: ie.id,
                label: eventLabel(ie),
              }))}
              required
              placeholder="— Select insemination event —"
            />
          </div>

          {/* Diagnosis details */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Diagnosis Details
            </p>
            <FormGrid>
              <DateField
                label="Diagnosis Date"
                value={form.diagnosisDate}
                onChange={onDiagnosisDateChange}
                required
              />
              <NumberField
                label="Days After Service"
                value={form.daysAfterService}
                onChange={set("daysAfterService")}
                min={0}
                placeholder="Auto-computed or enter manually"
              />
              <SelectField
                label="PD Method"
                value={form.method}
                onChange={set("method")}
                options={PD_METHODS}
                required
                placeholder="— Select method —"
              />
              <SelectField
                label="Result"
                value={form.result}
                onChange={set("result")}
                options={PD_RESULTS}
                required
                placeholder="— Select result —"
              />
            </FormGrid>
          </div>

          {/* Conducted by */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Examiner
            </p>
            <FormGrid>
              <TextField
                label="Conducted By"
                value={form.conductedBy}
                onChange={set("conductedBy")}
                required
                placeholder="e.g. Dr. Jane Mwangi"
              />
              <SelectField
                label="Agent (optional)"
                value={form.agentId}
                onChange={set("agentId")}
                options={saleAgents.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                }))}
                placeholder="— None —"
              />
            </FormGrid>
          </div>

          {/* Calving date — shown when Pregnant or Twins */}
          {(form.result === "Pregnant" || form.result === "Twins") && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-700">
                <Icon.baby width={14} height={14} />
                Calving Estimate
              </p>
              <DateField
                label="Estimated Calving Date"
                value={form.estimatedCalvingDate}
                onChange={set("estimatedCalvingDate")}
              />
              {form.result === "Twins" && (
                <p className="mt-2 text-[11px] text-green-700">
                  Twin pregnancy detected — monitor closely as calving risk is elevated.
                </p>
              )}
            </div>
          )}

          {/* Repeat service — shown when Open */}
          {form.result === "Open" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <Icon.syringe width={14} height={14} />
                Repeat Service
              </p>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.repeatServiceScheduled}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      repeatServiceScheduled: e.target.checked,
                      repeatServiceDate: e.target.checked ? f.repeatServiceDate : "",
                    }))
                  }
                  className="h-4 w-4 rounded border-line accent-brand-600"
                />
                <span className="text-sm font-medium text-amber-800">
                  Schedule repeat insemination service
                </span>
              </label>
              {form.repeatServiceScheduled && (
                <div className="mt-3">
                  <DateField
                    label="Repeat Service Date"
                    value={form.repeatServiceDate}
                    onChange={set("repeatServiceDate")}
                  />
                </div>
              )}
            </div>
          )}

          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={set("notes")}
            placeholder="Optional observations or comments…"
            rows={3}
          />

          <FormButtons
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? "Save Changes" : "Record PD"}
          />
        </form>
      </Modal>
    </>
  );
}
