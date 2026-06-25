"use client";

import { useState, useMemo } from "react";
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
import { Icon } from "@/components/icons";
import {
  Modal,
  FormGrid,
  FormButtons,
  TextField,
  SelectField,
  TextAreaField,
  NumberField,
  DateField,
} from "@/components/forms";
import { useData } from "@/lib/store";
import type {
  DistributionPoint,
  DPStatus,
  DPStrawStock,
  StrawDispatch,
  DispatchStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "dps" | "stock" | "dispatches";

type DPForm = {
  name: string;
  code: string;
  district: string;
  address: string;
  contactPerson: string;
  phone: string;
  hierarchyNodeId: string;
  managerId: string;
  nitrogenCapacityLiters: string;
  currentNitrogenLiters: string;
  maxStrawCapacity: string;
  currentStrawCount: string;
  status: DPStatus;
  lastNitrogenRefill: string;
  nextRefillDue: string;
  lat: string;
  lng: string;
  notes: string;
};

type StockForm = {
  dpId: string;
  semenCatalogId: string;
  batchId: string;
  quantityReceived: string;
  quantityOnHand: string;
  quantityIssued: string;
  lastReceivedDate: string;
  notes: string;
};

type DispatchForm = {
  dispatchDate: string;
  fromType: "MainStore" | "DP";
  fromDpId: string;
  toDpId: string;
  toAgentId: string;
  semenCatalogId: string;
  batchId: string;
  quantityDispatched: string;
  quantityReceived: string;
  status: DispatchStatus;
  dispatchedBy: string;
  receivedBy: string;
  dispatchedAt: string;
  receivedAt: string;
  notes: string;
};

// ── Empty forms ───────────────────────────────────────────────────────────────

const emptyDP: DPForm = {
  name: "",
  code: "",
  district: "",
  address: "",
  contactPerson: "",
  phone: "",
  hierarchyNodeId: "",
  managerId: "",
  nitrogenCapacityLiters: "",
  currentNitrogenLiters: "",
  maxStrawCapacity: "",
  currentStrawCount: "",
  status: "Active",
  lastNitrogenRefill: "",
  nextRefillDue: "",
  lat: "",
  lng: "",
  notes: "",
};

const emptyStock: StockForm = {
  dpId: "",
  semenCatalogId: "",
  batchId: "",
  quantityReceived: "",
  quantityOnHand: "",
  quantityIssued: "0",
  lastReceivedDate: "",
  notes: "",
};

const emptyDispatch: DispatchForm = {
  dispatchDate: "",
  fromType: "MainStore",
  fromDpId: "",
  toDpId: "",
  toAgentId: "",
  semenCatalogId: "",
  batchId: "",
  quantityDispatched: "",
  quantityReceived: "",
  status: "Pending",
  dispatchedBy: "",
  receivedBy: "",
  dispatchedAt: "",
  receivedAt: "",
  notes: "",
};

// ── Nitrogen level bar ────────────────────────────────────────────────────────

function LevelBar({
  current,
  max,
  colorClass,
  label,
}: {
  current: number;
  max: number;
  colorClass: string;
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-semibold text-ink tabular-nums">
          {current} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
        <div
          className={`h-2 rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Dispatch status badge tone ────────────────────────────────────────────────

function dispatchTone(
  status: DispatchStatus,
): "green" | "blue" | "amber" | "red" | "gray" {
  if (status === "Received") return "green";
  if (status === "In Transit") return "blue";
  if (status === "Pending") return "amber";
  if (status === "Rejected") return "red";
  return "gray";
}

// ── DP status badge tone ──────────────────────────────────────────────────────

function dpStatusTone(
  status: DPStatus,
): "green" | "amber" | "red" | "blue" | "gray" | "purple" {
  if (status === "Active") return "green";
  if (status === "Maintenance") return "amber";
  return "gray";
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════

export default function DPManagementPage() {
  const {
    distributionPoints,
    addDistributionPoint,
    update,
    remove,
    dpStrawStocks,
    addDPStrawStock,
    strawDispatches,
    addStrawDispatch,
    hierarchyNodes,
    territoryManagers,
    semenCatalog,
    saleAgents,
  } = useData();

  const [tab, setTab] = useState<Tab>("dps");

  // ── DP modal state ──────────────────────────────────────────────────────────
  const [dpModal, setDPModal] = useState<{
    open: boolean;
    editing: DistributionPoint | null;
  }>({ open: false, editing: null });
  const [dpForm, setDPForm] = useState<DPForm>(emptyDP);

  // ── Stock modal state ───────────────────────────────────────────────────────
  const [stockModal, setStockModal] = useState(false);
  const [stockForm, setStockForm] = useState<StockForm>(emptyStock);
  const [stockDPFilter, setStockDPFilter] = useState("");

  // ── Dispatch modal state ────────────────────────────────────────────────────
  const [dispatchModal, setDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState<DispatchForm>(emptyDispatch);

  // ── View-stock shortcut from DP card ───────────────────────────────────────
  const [viewStockDPId, setViewStockDPId] = useState<string | null>(null);

  // ── Form setters ────────────────────────────────────────────────────────────
  const setDP = (k: keyof DPForm) => (v: string) =>
    setDPForm((f) => ({ ...f, [k]: v }));
  const setSt = (k: keyof StockForm) => (v: string) =>
    setStockForm((f) => ({ ...f, [k]: v }));
  const setDis = (k: keyof DispatchForm) => (v: string) =>
    setDispatchForm((f) => ({ ...f, [k]: v }));

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalDPs = distributionPoints.length;
  const activeDPs = distributionPoints.filter(
    (dp) => dp.status === "Active",
  ).length;
  const lowNitrogen = distributionPoints.filter((dp) => {
    const cap = dp.nitrogenCapacityLiters;
    return cap > 0 && dp.currentNitrogenLiters / cap < 0.3;
  }).length;
  const totalStraws = distributionPoints.reduce(
    (sum, dp) => sum + dp.currentStrawCount,
    0,
  );

  // ── Filtered stock ──────────────────────────────────────────────────────────
  const filteredStock = useMemo(() => {
    if (!stockDPFilter && !viewStockDPId) return dpStrawStocks;
    const filter = viewStockDPId ?? stockDPFilter;
    return dpStrawStocks.filter((s) => s.dpId === filter);
  }, [dpStrawStocks, stockDPFilter, viewStockDPId]);

  // ── Open modals ─────────────────────────────────────────────────────────────
  function openAddDP() {
    setDPForm(emptyDP);
    setDPModal({ open: false, editing: null });
    // use timeout-free approach: just open right away
    setDPModal({ open: true, editing: null });
  }

  function openEditDP(dp: DistributionPoint) {
    setDPForm({
      name: dp.name,
      code: dp.code,
      district: dp.district,
      address: dp.address,
      contactPerson: dp.contactPerson,
      phone: dp.phone ?? "",
      hierarchyNodeId: dp.hierarchyNodeId ?? "",
      managerId: dp.managerId ?? "",
      nitrogenCapacityLiters: String(dp.nitrogenCapacityLiters),
      currentNitrogenLiters: String(dp.currentNitrogenLiters),
      maxStrawCapacity: String(dp.maxStrawCapacity),
      currentStrawCount: String(dp.currentStrawCount),
      status: dp.status,
      lastNitrogenRefill: dp.lastNitrogenRefill ?? "",
      nextRefillDue: dp.nextRefillDue ?? "",
      lat: dp.lat != null ? String(dp.lat) : "",
      lng: dp.lng != null ? String(dp.lng) : "",
      notes: dp.notes ?? "",
    });
    setDPModal({ open: true, editing: dp });
  }

  function openViewStock(dpId: string) {
    setViewStockDPId(dpId);
    setTab("stock");
  }

  function openAddStock(dpId?: string) {
    setStockForm({ ...emptyStock, dpId: dpId ?? "" });
    setStockModal(true);
  }

  function openAddDispatch() {
    setDispatchForm(emptyDispatch);
    setDispatchModal(true);
  }

  // ── Submit handlers ─────────────────────────────────────────────────────────
  function submitDP(e: React.SyntheticEvent) {
    e.preventDefault();
    const payload: Omit<DistributionPoint, "id"> = {
      name: dpForm.name,
      code: dpForm.code,
      district: dpForm.district,
      address: dpForm.address,
      contactPerson: dpForm.contactPerson,
      phone: dpForm.phone || undefined,
      hierarchyNodeId: dpForm.hierarchyNodeId || undefined,
      managerId: dpForm.managerId || undefined,
      nitrogenCapacityLiters: parseFloat(dpForm.nitrogenCapacityLiters) || 0,
      currentNitrogenLiters: parseFloat(dpForm.currentNitrogenLiters) || 0,
      maxStrawCapacity: parseInt(dpForm.maxStrawCapacity) || 0,
      currentStrawCount: parseInt(dpForm.currentStrawCount) || 0,
      status: dpForm.status,
      lastNitrogenRefill: dpForm.lastNitrogenRefill || undefined,
      nextRefillDue: dpForm.nextRefillDue || undefined,
      lat: dpForm.lat ? parseFloat(dpForm.lat) : undefined,
      lng: dpForm.lng ? parseFloat(dpForm.lng) : undefined,
      notes: dpForm.notes || undefined,
    };
    if (dpModal.editing) {
      update("distributionPoints", dpModal.editing.id, payload);
    } else {
      addDistributionPoint(payload);
    }
    setDPModal({ open: false, editing: null });
  }

  function submitStock(e: React.SyntheticEvent) {
    e.preventDefault();
    const payload: Omit<DPStrawStock, "id"> = {
      dpId: stockForm.dpId,
      semenCatalogId: stockForm.semenCatalogId,
      batchId: stockForm.batchId || undefined,
      quantityReceived: parseInt(stockForm.quantityReceived) || 0,
      quantityOnHand: parseInt(stockForm.quantityOnHand) || 0,
      quantityIssued: parseInt(stockForm.quantityIssued) || 0,
      lastReceivedDate: stockForm.lastReceivedDate,
      notes: stockForm.notes || undefined,
    };
    addDPStrawStock(payload);
    setStockModal(false);
  }

  function submitDispatch(e: React.SyntheticEvent) {
    e.preventDefault();
    const payload: Omit<StrawDispatch, "id"> = {
      dispatchDate: dispatchForm.dispatchDate,
      fromType: dispatchForm.fromType,
      fromDpId: dispatchForm.fromDpId || undefined,
      toDpId: dispatchForm.toDpId || undefined,
      toAgentId: dispatchForm.toAgentId || undefined,
      semenCatalogId: dispatchForm.semenCatalogId,
      batchId: dispatchForm.batchId || undefined,
      quantityDispatched: parseInt(dispatchForm.quantityDispatched) || 0,
      quantityReceived: dispatchForm.quantityReceived
        ? parseInt(dispatchForm.quantityReceived)
        : undefined,
      status: dispatchForm.status,
      dispatchedBy: dispatchForm.dispatchedBy,
      receivedBy: dispatchForm.receivedBy || undefined,
      dispatchedAt:
        dispatchForm.dispatchedAt || new Date().toISOString(),
      receivedAt: dispatchForm.receivedAt || undefined,
      notes: dispatchForm.notes || undefined,
    };
    addStrawDispatch(payload);
    setDispatchModal(false);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function dpName(id?: string) {
    if (!id) return "Main Store";
    const dp = distributionPoints.find((x) => x.id === id);
    return dp ? `${dp.name} (${dp.code})` : id;
  }

  function bullName(catalogId: string) {
    const entry = semenCatalog.find((x) => x.id === catalogId);
    return entry ? entry.bullName : catalogId;
  }

  function agentName(id: string) {
    const a = saleAgents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : id;
  }

  return (
    <>
      <PageHeader
        title="Distribution Point Management"
        description="Manage semen distribution points, straw stock levels, nitrogen monitoring, and dispatch logistics."
        action={
          <div className="flex items-center gap-2">
            {tab === "dps" && (
              <PrimaryButton onClick={openAddDP}>
                <Icon.plus width={16} height={16} />
                Add DP
              </PrimaryButton>
            )}
            {tab === "stock" && (
              <PrimaryButton onClick={() => openAddStock()}>
                <Icon.plus width={16} height={16} />
                Add Stock Record
              </PrimaryButton>
            )}
            {tab === "dispatches" && (
              <PrimaryButton onClick={openAddDispatch}>
                <Icon.plus width={16} height={16} />
                New Dispatch
              </PrimaryButton>
            )}
          </div>
        }
      />

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total DPs"
          value={String(totalDPs)}
          iconName="network"
          tone="blue"
        />
        <StatCard
          label="Active DPs"
          value={String(activeDPs)}
          iconName="location"
          tone="green"
        />
        <StatCard
          label="Low Nitrogen"
          value={String(lowNitrogen)}
          iconName="thermometer"
          tone="amber"
        />
        <StatCard
          label="Total Straws in DPs"
          value={String(totalStraws)}
          iconName="vial"
          tone="blue"
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-line bg-canvas p-1">
        {(
          [
            { k: "dps", l: `Distribution Points (${totalDPs})` },
            { k: "stock", l: `Stock (${dpStrawStocks.length})` },
            { k: "dispatches", l: `Dispatches (${strawDispatches.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => {
              if (t.k !== "stock") setViewStockDPId(null);
              setTab(t.k);
            }}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.k
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: DPs ════════════════════════════════════════ */}
      {tab === "dps" && (
        <div className="mt-4">
          {distributionPoints.length === 0 ? (
            <Card>
              <div className="py-16 text-center text-sm text-muted">
                No distribution points yet.{" "}
                <button
                  type="button"
                  className="text-brand-600 underline"
                  onClick={openAddDP}
                >
                  Add the first DP.
                </button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {distributionPoints.map((dp) => {
                const nitroPct =
                  dp.nitrogenCapacityLiters > 0
                    ? (dp.currentNitrogenLiters /
                        dp.nitrogenCapacityLiters) *
                      100
                    : 0;
                const isLowN = nitroPct < 30;
                const nitroColor = isLowN
                  ? "bg-red-500"
                  : nitroPct < 60
                    ? "bg-amber-400"
                    : "bg-green-500";
                return (
                  <Card key={dp.id} className="flex flex-col p-5">
                    {/* Header */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-ink truncate">
                            {dp.name}
                          </p>
                          <Badge tone="blue">{dp.code}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted truncate">
                          {dp.district}
                        </p>
                      </div>
                      <Badge tone={dpStatusTone(dp.status)}>
                        {dp.status}
                      </Badge>
                    </div>

                    {/* Nitrogen bar */}
                    <div className="mb-2">
                      <LevelBar
                        current={dp.currentNitrogenLiters}
                        max={dp.nitrogenCapacityLiters}
                        colorClass={nitroColor}
                        label="Nitrogen (L)"
                      />
                      {isLowN && (
                        <p className="mt-0.5 text-[10px] font-semibold text-red-600">
                          Low nitrogen — refill required
                        </p>
                      )}
                    </div>

                    {/* Straw bar */}
                    <div className="mb-4">
                      <LevelBar
                        current={dp.currentStrawCount}
                        max={dp.maxStrawCapacity}
                        colorClass="bg-brand-500"
                        label="Straws"
                      />
                    </div>

                    {/* Contact */}
                    <div className="mb-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Icon.agent width={12} height={12} />
                        <span className="font-medium text-ink">
                          {dp.contactPerson}
                        </span>
                      </div>
                      {dp.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Icon.wifi width={12} height={12} />
                          <span>{dp.phone}</span>
                        </div>
                      )}
                      {dp.nextRefillDue && (
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Icon.thermometer width={12} height={12} />
                          <span>
                            Next refill:{" "}
                            <strong className="text-ink">
                              {formatDate(dp.nextRefillDue)}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDP(dp)}
                        className="flex-1 rounded-lg border border-line bg-canvas py-1.5 text-xs font-semibold text-ink hover:bg-surface transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openViewStock(dp.id)}
                        className="flex-1 rounded-lg border border-brand-200 bg-brand-50 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                      >
                        View Stock
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: STOCK ══════════════════════════════════════ */}
      {tab === "stock" && (
        <div className="mt-4 space-y-3">
          {/* Filter row */}
          <Card>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-xs font-semibold text-muted">
                Filter by DP:
              </span>
              <select
                value={viewStockDPId ?? stockDPFilter}
                onChange={(e) => {
                  setViewStockDPId(null);
                  setStockDPFilter(e.target.value);
                }}
                className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All DPs</option>
                {distributionPoints.map((dp) => (
                  <option key={dp.id} value={dp.id}>
                    {dp.name} ({dp.code})
                  </option>
                ))}
              </select>
              {(viewStockDPId ?? stockDPFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setViewStockDPId(null);
                    setStockDPFilter("");
                  }}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Clear filter
                </button>
              )}
              <span className="ml-auto text-xs text-muted">
                {filteredStock.length} record
                {filteredStock.length !== 1 ? "s" : ""}
              </span>
            </div>
          </Card>

          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>DP</Th>
                  <Th>Bull</Th>
                  <Th className="text-right">Received</Th>
                  <Th className="text-right">On Hand</Th>
                  <Th className="text-right">Issued</Th>
                  <Th>Last Received</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 && (
                  <EmptyRow
                    colSpan={7}
                    label="No stock records found."
                  />
                )}
                {filteredStock.map((s) => {
                  const dp = distributionPoints.find(
                    (x) => x.id === s.dpId,
                  );
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-canvas/60 transition"
                    >
                      <Td>
                        <p className="font-semibold text-sm">
                          {dp ? dp.name : s.dpId}
                        </p>
                        {dp && (
                          <p className="text-xs text-muted">{dp.code}</p>
                        )}
                      </Td>
                      <Td>
                        <p className="font-medium text-sm">
                          {bullName(s.semenCatalogId)}
                        </p>
                        {s.batchId && (
                          <p className="text-xs text-muted">
                            Batch: {s.batchId}
                          </p>
                        )}
                      </Td>
                      <Td className="text-right font-mono font-semibold">
                        {s.quantityReceived}
                      </Td>
                      <Td className="text-right font-mono font-semibold text-green-700">
                        {s.quantityOnHand}
                      </Td>
                      <Td className="text-right font-mono font-semibold text-muted">
                        {s.quantityIssued}
                      </Td>
                      <Td className="text-xs text-muted">
                        {formatDate(s.lastReceivedDate)}
                      </Td>
                      <Td>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              remove("dpStrawStocks", s.id)
                            }
                            className="p-1.5 text-muted hover:text-red-600 transition"
                            title="Remove record"
                          >
                            <Icon.trash width={14} height={14} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {/* ══════════════════ TAB: DISPATCHES ═════════════════════════════════ */}
      {tab === "dispatches" && (
        <div className="mt-4">
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Bull</Th>
                  <Th className="text-right">Dispatched</Th>
                  <Th className="text-right">Received</Th>
                  <Th>Dispatched By</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {strawDispatches.length === 0 && (
                  <EmptyRow colSpan={9} label="No dispatches recorded." />
                )}
                {strawDispatches.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-canvas/60 transition"
                  >
                    <Td className="text-xs text-muted">
                      {formatDate(d.dispatchDate)}
                    </Td>
                    <Td className="text-xs">
                      {d.fromType === "MainStore" ? (
                        <Badge tone="blue">Main Store</Badge>
                      ) : (
                        <span className="font-medium">
                          {dpName(d.fromDpId)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-xs">
                      {d.toDpId ? (
                        <span className="font-medium">
                          {dpName(d.toDpId)}
                        </span>
                      ) : d.toAgentId ? (
                        <span className="font-medium">
                          {agentName(d.toAgentId)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td className="text-xs">
                      {bullName(d.semenCatalogId)}
                    </Td>
                    <Td className="text-right font-mono font-semibold">
                      {d.quantityDispatched}
                    </Td>
                    <Td className="text-right font-mono text-muted">
                      {d.quantityReceived ?? "—"}
                    </Td>
                    <Td className="text-xs">{d.dispatchedBy}</Td>
                    <Td>
                      <Badge tone={dispatchTone(d.status)}>
                        {d.status}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            remove("strawDispatches", d.id)
                          }
                          className="p-1.5 text-muted hover:text-red-600 transition"
                          title="Remove"
                        >
                          <Icon.trash width={14} height={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {/* ══════════════════════════ MODALS ══════════════════════════════════ */}

      {/* Add / Edit DP Modal */}
      <Modal
        key={dpModal.editing?.id ?? "new-dp"}
        open={dpModal.open}
        onClose={() => setDPModal({ open: false, editing: null })}
        title={
          dpModal.editing
            ? "Edit Distribution Point"
            : "Add Distribution Point"
        }
        description="Configure a semen distribution point with nitrogen storage, straw capacity, and contact information."
        size="lg"
      >
        <form onSubmit={submitDP} className="space-y-4 p-5">
          <FormGrid>
            <TextField
              label="Name"
              value={dpForm.name}
              onChange={setDP("name")}
              required
              placeholder="e.g. Harare North DP"
            />
            <TextField
              label="Code"
              value={dpForm.code}
              onChange={setDP("code")}
              required
              placeholder="e.g. DP-HRN"
            />
            <TextField
              label="District"
              value={dpForm.district}
              onChange={setDP("district")}
              required
              placeholder="e.g. Harare"
            />
            <TextField
              label="Address"
              value={dpForm.address}
              onChange={setDP("address")}
              required
              placeholder="Street / landmark"
            />
            <TextField
              label="Contact Person"
              value={dpForm.contactPerson}
              onChange={setDP("contactPerson")}
              required
              placeholder="Full name"
            />
            <TextField
              label="Phone"
              value={dpForm.phone}
              onChange={setDP("phone")}
              placeholder="+263-77-…"
              type="tel"
            />
            <SelectField
              label="Hierarchy Node"
              value={dpForm.hierarchyNodeId}
              onChange={setDP("hierarchyNodeId")}
              placeholder="— None —"
              options={hierarchyNodes.map((n) => ({
                value: n.id,
                label: `${n.name} (${n.code})`,
              }))}
            />
            <SelectField
              label="Manager"
              value={dpForm.managerId}
              onChange={setDP("managerId")}
              placeholder="— Unassigned —"
              options={territoryManagers
                .filter((m) => m.isActive)
                .map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.role})`,
                }))}
            />
            <NumberField
              label="Nitrogen Capacity (Liters)"
              value={dpForm.nitrogenCapacityLiters}
              onChange={setDP("nitrogenCapacityLiters")}
              required
              min={0}
              placeholder="e.g. 50"
            />
            <NumberField
              label="Current Nitrogen (Liters)"
              value={dpForm.currentNitrogenLiters}
              onChange={setDP("currentNitrogenLiters")}
              required
              min={0}
              placeholder="e.g. 35"
            />
            <NumberField
              label="Max Straw Capacity"
              value={dpForm.maxStrawCapacity}
              onChange={setDP("maxStrawCapacity")}
              required
              min={0}
              placeholder="e.g. 500"
            />
            <NumberField
              label="Current Straw Count"
              value={dpForm.currentStrawCount}
              onChange={setDP("currentStrawCount")}
              required
              min={0}
              placeholder="e.g. 320"
            />
            <SelectField
              label="Status"
              value={dpForm.status}
              onChange={setDP("status")}
              required
              options={["Active", "Inactive", "Maintenance"]}
            />
            <DateField
              label="Last Nitrogen Refill"
              value={dpForm.lastNitrogenRefill}
              onChange={setDP("lastNitrogenRefill")}
            />
            <DateField
              label="Next Refill Due"
              value={dpForm.nextRefillDue}
              onChange={setDP("nextRefillDue")}
            />
          </FormGrid>

          {/* GPS */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              GPS Coordinates (optional)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Latitude"
                value={dpForm.lat}
                onChange={setDP("lat")}
                step={0.0001}
                placeholder="-17.8252"
              />
              <NumberField
                label="Longitude"
                value={dpForm.lng}
                onChange={setDP("lng")}
                step={0.0001}
                placeholder="31.0335"
              />
            </div>
          </div>

          <TextAreaField
            label="Notes"
            value={dpForm.notes}
            onChange={setDP("notes")}
          />
          <FormButtons
            onCancel={() => setDPModal({ open: false, editing: null })}
            submitLabel={dpModal.editing ? "Save Changes" : "Add DP"}
          />
        </form>
      </Modal>

      {/* Add Stock Record Modal */}
      <Modal
        key={stockModal ? "stock-open" : "stock-closed"}
        open={stockModal}
        onClose={() => setStockModal(false)}
        title="Add Stock Record"
        description="Record semen straws received at a distribution point."
        size="md"
      >
        <form onSubmit={submitStock} className="space-y-4 p-5">
          <FormGrid>
            <SelectField
              label="Distribution Point"
              value={stockForm.dpId}
              onChange={setSt("dpId")}
              required
              placeholder="— Select DP —"
              options={distributionPoints.map((dp) => ({
                value: dp.id,
                label: `${dp.name} (${dp.code})`,
              }))}
            />
            <SelectField
              label="Bull (Semen Catalog)"
              value={stockForm.semenCatalogId}
              onChange={setSt("semenCatalogId")}
              required
              placeholder="— Select bull —"
              options={semenCatalog.map((c) => ({
                value: c.id,
                label: `${c.bullName} — ${c.breed}`,
              }))}
            />
            <TextField
              label="Batch ID (optional)"
              value={stockForm.batchId}
              onChange={setSt("batchId")}
              placeholder="e.g. BTH-2026-001"
            />
            <DateField
              label="Last Received Date"
              value={stockForm.lastReceivedDate}
              onChange={setSt("lastReceivedDate")}
              required
            />
            <NumberField
              label="Quantity Received"
              value={stockForm.quantityReceived}
              onChange={setSt("quantityReceived")}
              required
              min={0}
              placeholder="e.g. 100"
            />
            <NumberField
              label="Quantity On Hand"
              value={stockForm.quantityOnHand}
              onChange={setSt("quantityOnHand")}
              required
              min={0}
              placeholder="e.g. 80"
            />
            <NumberField
              label="Quantity Issued"
              value={stockForm.quantityIssued}
              onChange={setSt("quantityIssued")}
              min={0}
              placeholder="e.g. 20"
            />
          </FormGrid>
          <TextAreaField
            label="Notes"
            value={stockForm.notes}
            onChange={setSt("notes")}
          />
          <FormButtons
            onCancel={() => setStockModal(false)}
            submitLabel="Add Stock Record"
          />
        </form>
      </Modal>

      {/* Add Dispatch Modal */}
      <Modal
        key={dispatchModal ? "dispatch-open" : "dispatch-closed"}
        open={dispatchModal}
        onClose={() => setDispatchModal(false)}
        title="New Straw Dispatch"
        description="Record a straw dispatch from the main store or a DP to another DP or agent."
        size="lg"
      >
        <form onSubmit={submitDispatch} className="space-y-4 p-5">
          <FormGrid>
            <DateField
              label="Dispatch Date"
              value={dispatchForm.dispatchDate}
              onChange={setDis("dispatchDate")}
              required
            />
            <SelectField
              label="From Type"
              value={dispatchForm.fromType}
              onChange={setDis("fromType")}
              required
              options={[
                { value: "MainStore", label: "Main Store" },
                { value: "DP", label: "Distribution Point" },
              ]}
            />
            {dispatchForm.fromType === "DP" && (
              <SelectField
                label="From DP"
                value={dispatchForm.fromDpId}
                onChange={setDis("fromDpId")}
                placeholder="— Select DP —"
                options={distributionPoints.map((dp) => ({
                  value: dp.id,
                  label: `${dp.name} (${dp.code})`,
                }))}
              />
            )}
            <SelectField
              label="To DP (optional)"
              value={dispatchForm.toDpId}
              onChange={setDis("toDpId")}
              placeholder="— None —"
              options={distributionPoints.map((dp) => ({
                value: dp.id,
                label: `${dp.name} (${dp.code})`,
              }))}
            />
            <SelectField
              label="To Agent (optional)"
              value={dispatchForm.toAgentId}
              onChange={setDis("toAgentId")}
              placeholder="— None —"
              options={saleAgents
                .filter((a) => a.isActive)
                .map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                }))}
            />
            <SelectField
              label="Bull (Semen Catalog)"
              value={dispatchForm.semenCatalogId}
              onChange={setDis("semenCatalogId")}
              required
              placeholder="— Select bull —"
              options={semenCatalog.map((c) => ({
                value: c.id,
                label: `${c.bullName} — ${c.breed}`,
              }))}
            />
            <TextField
              label="Batch ID (optional)"
              value={dispatchForm.batchId}
              onChange={setDis("batchId")}
              placeholder="e.g. BTH-2026-001"
            />
            <NumberField
              label="Quantity Dispatched"
              value={dispatchForm.quantityDispatched}
              onChange={setDis("quantityDispatched")}
              required
              min={1}
              placeholder="e.g. 50"
            />
            <NumberField
              label="Quantity Received (if known)"
              value={dispatchForm.quantityReceived}
              onChange={setDis("quantityReceived")}
              min={0}
              placeholder="e.g. 48"
            />
            <SelectField
              label="Status"
              value={dispatchForm.status}
              onChange={setDis("status")}
              required
              options={[
                "Pending",
                "In Transit",
                "Received",
                "Partial",
                "Rejected",
              ]}
            />
            <TextField
              label="Dispatched By"
              value={dispatchForm.dispatchedBy}
              onChange={setDis("dispatchedBy")}
              required
              placeholder="Full name"
            />
            <TextField
              label="Received By (optional)"
              value={dispatchForm.receivedBy}
              onChange={setDis("receivedBy")}
              placeholder="Full name"
            />
          </FormGrid>
          <TextAreaField
            label="Notes"
            value={dispatchForm.notes}
            onChange={setDis("notes")}
          />
          <FormButtons
            onCancel={() => setDispatchModal(false)}
            submitLabel="Create Dispatch"
          />
        </form>
      </Modal>
    </>
  );
}
