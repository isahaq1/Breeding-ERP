"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PageHeader,
  Card,
  StatCard,
  Table,
  Th,
  Td,
  EmptyRow,
  Badge,
  PrimaryButton,
  CardHeader,
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
import { formatDate, currency, TODAY } from "@/lib/format";
import type {
  SemenCatalog,
  SemenOrder,
  SemenStatus,
  SemenOrderStatus,
  SemenSource,
  PaymentStatus,
  SemenStrawType,
  SaleAgent,
  IncentiveStatus,
  AIBirthStatus,
  CalfSex,
  CalvingEase,
} from "@/lib/types";

// ---- Local tone helpers -----------------------------------------------------

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "purple";

function catalogTone(s: SemenStatus): Tone {
  if (s === "Available") return "green";
  if (s === "Low Stock") return "amber";
  return "red";
}

function orderTone(s: SemenOrderStatus): Tone {
  if (s === "Delivered") return "green";
  if (s === "Pending") return "amber";
  if (s === "Approved" || s === "Shipped") return "blue";
  if (s === "Cancelled") return "red";
  return "gray";
}

function paymentTone(s: PaymentStatus): Tone {
  if (s === "Paid") return "green";
  if (s === "Partial") return "amber";
  return "red";
}

function birthStatusTone(s: AIBirthStatus): Tone {
  if (s === "Live Birth") return "green";
  if (s === "Pregnant") return "blue";
  if (s === "Open") return "amber";
  return "red"; // Stillbirth
}

function incentiveTone(s: IncentiveStatus): Tone {
  if (s === "Paid") return "green";
  if (s === "Approved") return "blue";
  return "amber";
}

// ---- Constants --------------------------------------------------------------

const BREEDS = [
  "Holstein", "Jersey", "Angus", "Hereford", "Simmental", "Brahman",
  "Charolais", "Limousin", "Brown Swiss", "Ayrshire", "Guernsey",
  "Gir", "Sahiwal", "Friesian", "Shorthorn", "Other",
];

const STATUS_OPTIONS: SemenStatus[] = [
  "Available", "Low Stock", "Out of Stock", "Expired",
];

const ORDER_STATUS_OPTIONS: SemenOrderStatus[] = [
  "Pending", "Approved", "Shipped", "Delivered", "Cancelled",
];

const PAYMENT_OPTIONS: PaymentStatus[] = ["Unpaid", "Partial", "Paid"];

const STRAW_TYPES: SemenStrawType[] = ["0.25ml", "0.5ml"];

const INCENTIVE_STATUSES: IncentiveStatus[] = ["Pending", "Approved", "Paid"];

const AI_BIRTH_STATUSES: AIBirthStatus[] = ["Pregnant", "Open", "Live Birth", "Stillbirth"];
const CALF_SEXES: CalfSex[] = ["Heifer", "Bull", "Unknown"];
const CALVING_EASE_OPTIONS: CalvingEase[] = ["Easy", "Assisted", "Difficult", "C-Section"];

const SEMEN_SOURCES: SemenSource[] = ["Own Collection", "Import", "Purchase"];

// ---- Form defaults ----------------------------------------------------------

const emptyCatalogForm = {
  source: "Import" as string,
  ownBullId: "",
  bullName: "",
  bullRegNo: "",
  breed: "",
  countryOfOrigin: "",
  supplier: "",
  supplierCountry: "",
  collectionDate: "",
  expiryDate: "",
  strawType: "0.5ml",
  progressiveMotilityPct: "",
  morphologyPct: "",
  concentrationMPerMl: "",
  cellsPerDose: "",
  milkEpdKg: "",
  fatEpdKg: "",
  proteinEpdKg: "",
  fertilityIndex: "",
  conformationScore: "",
  tankId: "",
  canisterId: "",
  gobletId: "",
  initialStraws: "",
  pricePerStrawUsd: "",
  status: "Available",
  certifications: "",
  notes: "",
};

const emptyOrderForm = {
  farmerId: "",
  farmId: "",
  semenCatalogId: "",
  quantityOrdered: "",
  orderDate: TODAY.toISOString().slice(0, 10),
  expectedDelivery: "",
  actualDelivery: "",
  quantityDelivered: "",
  status: "Pending",
  unitPriceUsd: "",
  paymentStatus: "Unpaid",
  saleAgentId: "",
  commissionPct: "",
  notes: "",
};

const emptyAgentForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  defaultCommissionPct: "",
  notes: "",
};

const emptyBirthForm = {
  semenOrderId: "",
  semenCatalogId: "",
  farmerId: "",
  farmId: "",
  inseminationDate: "",
  damTagNo: "",
  damBreed: "",
  status: "Pregnant" as AIBirthStatus,
  birthDate: "",
  calfTagNo: "",
  calfSex: "Unknown" as CalfSex,
  calfWeightKg: "",
  calvingEase: "" as CalvingEase | "",
  notes: "",
};

// ---- Section header for forms -----------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 mt-1 border-b border-line pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {children}
      </span>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

type TabType = "catalog" | "orders" | "agents" | "incentives" | "births";
const TAB_VALUES: TabType[] = ["catalog", "orders", "agents", "incentives", "births"];
function parseTab(t: string | null): TabType {
  return TAB_VALUES.includes(t as TabType) ? (t as TabType) : "catalog";
}

function SemenSupplyContent() {
  const {
    cattle,
    semenCatalog,
    semenOrders,
    semenBirths,
    saleAgents,
    saleIncentives,
    farmers,
    farms,
    addSemenCatalog,
    addSemenOrder,
    addSemenBirth,
    addSaleAgent,
    addSaleIncentive,
    update,
    remove,
  } = useData();

  const bulls = useMemo(() => cattle.filter((c) => c.class === "Bull"), [cattle]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(() => parseTab(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  // Catalog modal state
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState(emptyCatalogForm);

  // Order modal state
  const [orderOpen, setOrderOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);

  // Agent modal state
  const [agentOpen, setAgentOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);

  // Birth modal state
  const [birthOpen, setBirthOpen] = useState(false);
  const [editingBirthId, setEditingBirthId] = useState<string | null>(null);
  const [birthForm, setBirthForm] = useState(emptyBirthForm);

  // Filter state
  const [catalogQuery, setCatalogQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [incentiveAgentFilter, setIncentiveAgentFilter] = useState("");
  const [incentiveStatusFilter, setIncentiveStatusFilter] = useState("");

  // ---- Helpers ---------------------------------------------------------------

  function getAvailableStraws(catalogId: string): number {
    const cat = semenCatalog.find((c) => c.id === catalogId);
    if (!cat) return 0;
    const used = semenOrders
      .filter((o) => o.semenCatalogId === catalogId && o.status === "Delivered")
      .reduce((sum, o) => sum + (o.quantityDelivered ?? o.quantityOrdered), 0);
    return Math.max(0, cat.initialStraws - used);
  }

  function getFarmerName(farmerId: string): string {
    const f = farmers.find((x) => x.id === farmerId);
    return f ? `${f.firstName} ${f.lastName}` : farmerId;
  }

  function getFarmName(farmId: string): string {
    return farms.find((f) => f.id === farmId)?.name ?? farmId;
  }

  function getCatalogLabel(catalogId: string): string {
    const c = semenCatalog.find((x) => x.id === catalogId);
    return c ? `${c.bullName} (${c.bullRegNo}) — ${c.breed}` : catalogId;
  }

  function getAgentName(agentId: string): string {
    const a = saleAgents.find((x) => x.id === agentId);
    return a ? `${a.firstName} ${a.lastName}` : agentId;
  }

  // ---- Stats -----------------------------------------------------------------

  const stats = useMemo(() => {
    const totalAvailable = semenCatalog.reduce(
      (sum, c) => sum + getAvailableStraws(c.id),
      0,
    );
    const activeOrders = semenOrders.filter((o) =>
      ["Pending", "Approved", "Shipped"].includes(o.status),
    ).length;
    const totalRevenue = semenOrders
      .filter((o) => o.status === "Delivered" && o.paymentStatus === "Paid")
      .reduce((sum, o) => sum + o.totalAmountUsd, 0);
    const pendingIncentives = saleIncentives
      .filter((i) => i.status !== "Paid")
      .reduce((sum, i) => sum + i.commissionAmount, 0);
    const totalLiveBirths = semenBirths.filter((b) => b.status === "Live Birth").length;
    return { totalLots: semenCatalog.length, totalAvailable, activeOrders, totalRevenue, pendingIncentives, totalLiveBirths };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semenCatalog, semenOrders, saleIncentives, semenBirths]);

  const agentStats = useMemo(() => {
    const map: Record<string, { orders: number; totalEarned: number; pendingAmount: number }> = {};
    for (const a of saleAgents) {
      const inc = saleIncentives.filter((i) => i.agentId === a.id);
      map[a.id] = {
        orders: inc.length,
        totalEarned: inc.reduce((s, i) => s + i.commissionAmount, 0),
        pendingAmount: inc.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.commissionAmount, 0),
      };
    }
    return map;
  }, [saleAgents, saleIncentives]);

  const bullSupplySummary = useMemo(() => {
    return bulls.map((bull) => {
      const entries = semenCatalog.filter((c) => c.ownBullId === bull.id);
      const totalStraws = entries.reduce((s, c) => s + c.initialStraws, 0);
      const availableStraws = entries.reduce((s, c) => s + getAvailableStraws(c.id), 0);
      const soldStraws = totalStraws - availableStraws;
      return { bull, lots: entries.length, totalStraws, availableStraws, soldStraws };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulls, semenCatalog, semenOrders]);

  // ---- Filtered rows ---------------------------------------------------------

  const catalogRows = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    return semenCatalog.filter((c) => {
      if (!q) return true;
      return (
        c.bullName.toLowerCase().includes(q) ||
        c.bullRegNo.toLowerCase().includes(q) ||
        c.breed.toLowerCase().includes(q) ||
        c.countryOfOrigin.toLowerCase().includes(q) ||
        c.supplier.toLowerCase().includes(q)
      );
    });
  }, [semenCatalog, catalogQuery]);

  const orderRows = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return semenOrders.filter((o) => {
      if (orderStatusFilter && o.status !== orderStatusFilter) return false;
      if (!q) return true;
      const farmerName = getFarmerName(o.farmerId).toLowerCase();
      const bullLabel = getCatalogLabel(o.semenCatalogId).toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        farmerName.includes(q) ||
        bullLabel.includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semenOrders, orderQuery, orderStatusFilter, farmers, semenCatalog]);

  const incentiveRows = useMemo(() => {
    return saleIncentives.filter((i) => {
      if (incentiveAgentFilter && i.agentId !== incentiveAgentFilter) return false;
      if (incentiveStatusFilter && i.status !== incentiveStatusFilter) return false;
      return true;
    });
  }, [saleIncentives, incentiveAgentFilter, incentiveStatusFilter]);

  const birthRows = useMemo(() => [...semenBirths].sort(
    (a, b) => (b.inseminationDate > a.inseminationDate ? 1 : -1),
  ), [semenBirths]);

  // ---- Catalog form ----------------------------------------------------------

  const setCatalog =
    (k: keyof typeof emptyCatalogForm) => (v: string) =>
      setCatalogForm((f) => ({ ...f, [k]: v }));

  function openAddCatalog() {
    setEditingCatalogId(null);
    setCatalogForm(emptyCatalogForm);
    setCatalogOpen(true);
  }

  function openEditCatalog(c: SemenCatalog) {
    setEditingCatalogId(c.id);
    setCatalogForm({
      source: c.source ?? "Import",
      ownBullId: c.ownBullId ?? "",
      bullName: c.bullName,
      bullRegNo: c.bullRegNo,
      breed: c.breed,
      countryOfOrigin: c.countryOfOrigin,
      supplier: c.supplier,
      supplierCountry: c.supplierCountry,
      collectionDate: c.collectionDate,
      expiryDate: c.expiryDate,
      strawType: c.strawType,
      progressiveMotilityPct: String(c.progressiveMotilityPct),
      morphologyPct: String(c.morphologyPct),
      concentrationMPerMl: String(c.concentrationMPerMl),
      cellsPerDose: String(c.cellsPerDose),
      milkEpdKg: c.milkEpdKg != null ? String(c.milkEpdKg) : "",
      fatEpdKg: c.fatEpdKg != null ? String(c.fatEpdKg) : "",
      proteinEpdKg: c.proteinEpdKg != null ? String(c.proteinEpdKg) : "",
      fertilityIndex: c.fertilityIndex != null ? String(c.fertilityIndex) : "",
      conformationScore: c.conformationScore != null ? String(c.conformationScore) : "",
      tankId: c.tankId,
      canisterId: c.canisterId,
      gobletId: c.gobletId,
      initialStraws: String(c.initialStraws),
      pricePerStrawUsd: String(c.pricePerStrawUsd),
      status: c.status,
      certifications: c.certifications ?? "",
      notes: c.notes ?? "",
    });
    setCatalogOpen(true);
  }

  function handleBullChange(v: string) {
    const bull = cattle.find((c) => c.id === v);
    setCatalogForm((f) => ({
      ...f,
      ownBullId: v,
      bullName: bull ? bull.name : f.bullName,
      bullRegNo: bull ? bull.id : f.bullRegNo,
      breed: bull ? bull.breed : f.breed,
      countryOfOrigin: "Own Farm",
      supplier: "Own Collection",
      supplierCountry: "Own Farm",
    }));
  }

  function submitCatalog(e: React.FormEvent) {
    e.preventDefault();
    const f = catalogForm;
    const isOwn = f.source === "Own Collection";
    const payload: Omit<SemenCatalog, "id"> = {
      source: f.source as SemenSource,
      ownBullId: isOwn ? f.ownBullId || undefined : undefined,
      bullName: f.bullName.trim(),
      bullRegNo: f.bullRegNo.trim(),
      breed: f.breed.trim(),
      countryOfOrigin: f.countryOfOrigin.trim(),
      supplier: f.supplier.trim(),
      supplierCountry: f.supplierCountry.trim(),
      collectionDate: f.collectionDate,
      expiryDate: f.expiryDate,
      strawType: f.strawType as SemenStrawType,
      progressiveMotilityPct: parseFloat(f.progressiveMotilityPct) || 0,
      morphologyPct: parseFloat(f.morphologyPct) || 0,
      concentrationMPerMl: parseFloat(f.concentrationMPerMl) || 0,
      cellsPerDose: parseFloat(f.cellsPerDose) || 0,
      milkEpdKg: f.milkEpdKg ? parseFloat(f.milkEpdKg) : undefined,
      fatEpdKg: f.fatEpdKg ? parseFloat(f.fatEpdKg) : undefined,
      proteinEpdKg: f.proteinEpdKg ? parseFloat(f.proteinEpdKg) : undefined,
      fertilityIndex: f.fertilityIndex ? parseFloat(f.fertilityIndex) : undefined,
      conformationScore: f.conformationScore ? parseFloat(f.conformationScore) : undefined,
      tankId: f.tankId.trim(),
      canisterId: f.canisterId.trim(),
      gobletId: f.gobletId.trim(),
      initialStraws: parseInt(f.initialStraws) || 0,
      pricePerStrawUsd: parseFloat(f.pricePerStrawUsd) || 0,
      status: f.status as SemenStatus,
      certifications: f.certifications.trim() || undefined,
      notes: f.notes.trim() || undefined,
    };
    if (editingCatalogId) {
      update("semenCatalog", editingCatalogId, payload);
    } else {
      addSemenCatalog(payload);
    }
    setCatalogForm(emptyCatalogForm);
    setEditingCatalogId(null);
    setCatalogOpen(false);
  }

  // ---- Order form ------------------------------------------------------------

  const setOrder =
    (k: keyof typeof emptyOrderForm) => (v: string) =>
      setOrderForm((f) => ({ ...f, [k]: v }));

  function handleFarmerChange(v: string) {
    const farmer = farmers.find((f) => f.id === v);
    setOrderForm((f) => ({ ...f, farmerId: v, farmId: farmer?.farmId ?? "" }));
  }

  function handleSemenChange(v: string) {
    const cat = semenCatalog.find((c) => c.id === v);
    setOrderForm((f) => ({
      ...f,
      semenCatalogId: v,
      unitPriceUsd: cat ? String(cat.pricePerStrawUsd) : f.unitPriceUsd,
    }));
  }

  function handleAgentChange(v: string) {
    const agent = saleAgents.find((a) => a.id === v);
    setOrderForm((f) => ({
      ...f,
      saleAgentId: v,
      commissionPct: agent ? String(agent.defaultCommissionPct) : f.commissionPct,
    }));
  }

  function openAddOrder() {
    setEditingOrderId(null);
    setOrderForm(emptyOrderForm);
    setOrderOpen(true);
  }

  function openEditOrder(o: SemenOrder) {
    setEditingOrderId(o.id);
    setOrderForm({
      farmerId: o.farmerId,
      farmId: o.farmId,
      semenCatalogId: o.semenCatalogId,
      quantityOrdered: String(o.quantityOrdered),
      orderDate: o.orderDate,
      expectedDelivery: o.expectedDelivery,
      actualDelivery: o.actualDelivery ?? "",
      quantityDelivered: o.quantityDelivered != null ? String(o.quantityDelivered) : "",
      status: o.status,
      unitPriceUsd: String(o.unitPriceUsd),
      paymentStatus: o.paymentStatus,
      saleAgentId: o.saleAgentId ?? "",
      commissionPct: o.commissionPct != null ? String(o.commissionPct) : "",
      notes: o.notes ?? "",
    });
    setOrderOpen(true);
  }

  function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    const f = orderForm;
    const qty = parseInt(f.quantityOrdered) || 0;
    const price = parseFloat(f.unitPriceUsd) || 0;
    const totalAmount = qty * price;
    const agentId = f.saleAgentId.trim();
    const commPct = agentId
      ? (parseFloat(f.commissionPct) || saleAgents.find((a) => a.id === agentId)?.defaultCommissionPct || 0)
      : 0;

    const payload: Omit<SemenOrder, "id"> = {
      farmerId: f.farmerId,
      farmId: f.farmId,
      semenCatalogId: f.semenCatalogId,
      quantityOrdered: qty,
      quantityDelivered: f.quantityDelivered ? parseInt(f.quantityDelivered) : undefined,
      orderDate: f.orderDate,
      expectedDelivery: f.expectedDelivery,
      actualDelivery: f.actualDelivery || undefined,
      status: f.status as SemenOrderStatus,
      unitPriceUsd: price,
      totalAmountUsd: totalAmount,
      paymentStatus: f.paymentStatus as PaymentStatus,
      saleAgentId: agentId || undefined,
      commissionPct: agentId ? commPct : undefined,
      notes: f.notes.trim() || undefined,
    };

    if (editingOrderId) {
      update("semenOrders", editingOrderId, payload);
    } else {
      // Predict the next order ID so the incentive can reference it
      const maxNum = semenOrders.reduce((m, o) => {
        const n = parseInt(o.id.replace("SO-", "")) || 0;
        return n > m ? n : m;
      }, 0);
      const nextOrderId = `SO-${String(maxNum + 1).padStart(3, "0")}`;
      addSemenOrder(payload);
      if (agentId) {
        addSaleIncentive({
          semenOrderId: nextOrderId,
          agentId,
          saleAmount: totalAmount,
          commissionPct: commPct,
          commissionAmount: parseFloat((totalAmount * commPct / 100).toFixed(2)),
          status: "Pending",
        });
      }
    }
    setOrderForm(emptyOrderForm);
    setEditingOrderId(null);
    setOrderOpen(false);
  }

  // ---- Agent form ------------------------------------------------------------

  const setAgent =
    (k: keyof typeof emptyAgentForm) => (v: string) =>
      setAgentForm((f) => ({ ...f, [k]: v }));

  function openAddAgent() {
    setEditingAgentId(null);
    setAgentForm(emptyAgentForm);
    setAgentOpen(true);
  }

  function openEditAgent(a: SaleAgent) {
    setEditingAgentId(a.id);
    setAgentForm({
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      email: a.email ?? "",
      defaultCommissionPct: String(a.defaultCommissionPct),
      notes: a.notes ?? "",
    });
    setAgentOpen(true);
  }

  function submitAgent(e: React.FormEvent) {
    e.preventDefault();
    const f = agentForm;
    if (editingAgentId) {
      update("saleAgents", editingAgentId, {
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone.trim(),
        email: f.email.trim() || undefined,
        defaultCommissionPct: parseFloat(f.defaultCommissionPct) || 0,
        notes: f.notes.trim() || undefined,
      });
    } else {
      addSaleAgent({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone.trim(),
        email: f.email.trim() || undefined,
        defaultCommissionPct: parseFloat(f.defaultCommissionPct) || 0,
        isActive: true,
        registrationDate: TODAY.toISOString().slice(0, 10),
        notes: f.notes.trim() || undefined,
      });
    }
    setAgentForm(emptyAgentForm);
    setEditingAgentId(null);
    setAgentOpen(false);
  }

  // ---- Birth form ------------------------------------------------------------

  const setBirth =
    (k: keyof typeof emptyBirthForm) => (v: string) =>
      setBirthForm((f) => ({ ...f, [k]: v }));

  function openRecordBirth(order: SemenOrder) {
    setEditingBirthId(null);
    setBirthForm({
      ...emptyBirthForm,
      semenOrderId: order.id,
      semenCatalogId: order.semenCatalogId,
      farmerId: order.farmerId,
      farmId: order.farmId,
    });
    setBirthOpen(true);
  }

  function openEditBirth(b: (typeof semenBirths)[0]) {
    setEditingBirthId(b.id);
    setBirthForm({
      semenOrderId: b.semenOrderId,
      semenCatalogId: b.semenCatalogId,
      farmerId: b.farmerId,
      farmId: b.farmId,
      inseminationDate: b.inseminationDate,
      damTagNo: b.damTagNo,
      damBreed: b.damBreed ?? "",
      status: b.status,
      birthDate: b.birthDate ?? "",
      calfTagNo: b.calfTagNo ?? "",
      calfSex: b.calfSex,
      calfWeightKg: b.calfWeightKg != null ? String(b.calfWeightKg) : "",
      calvingEase: b.calvingEase ?? "",
      notes: b.notes ?? "",
    });
    setBirthOpen(true);
  }

  function handleBirthOrderChange(v: string) {
    const order = semenOrders.find((o) => o.id === v);
    setBirthForm((f) => ({
      ...f,
      semenOrderId: v,
      semenCatalogId: order?.semenCatalogId ?? f.semenCatalogId,
      farmerId: order?.farmerId ?? f.farmerId,
      farmId: order?.farmId ?? f.farmId,
    }));
  }

  function submitBirth(e: React.FormEvent) {
    e.preventDefault();
    const f = birthForm;
    const hasBirth = f.status === "Live Birth" || f.status === "Stillbirth";
    const payload = {
      semenOrderId: f.semenOrderId,
      semenCatalogId: f.semenCatalogId,
      farmerId: f.farmerId,
      farmId: f.farmId,
      inseminationDate: f.inseminationDate,
      damTagNo: f.damTagNo.trim(),
      damBreed: f.damBreed.trim() || undefined,
      status: f.status as AIBirthStatus,
      birthDate: hasBirth && f.birthDate ? f.birthDate : undefined,
      calfTagNo: f.calfTagNo.trim() || undefined,
      calfSex: f.calfSex as CalfSex,
      calfWeightKg: f.calfWeightKg ? parseFloat(f.calfWeightKg) : undefined,
      calvingEase: f.calvingEase ? (f.calvingEase as CalvingEase) : undefined,
      notes: f.notes.trim() || undefined,
    };
    if (editingBirthId) {
      update("semenBirths", editingBirthId, payload);
    } else {
      addSemenBirth(payload);
    }
    setBirthForm(emptyBirthForm);
    setEditingBirthId(null);
    setBirthOpen(false);
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <>
      <PageHeader
        title="Breeding Semen Supply"
        description="AI semen catalogue management, storage tracking, and farmer order fulfilment."
        action={
          activeTab === "catalog" ? (
            <PrimaryButton onClick={openAddCatalog}>
              <Icon.plus width={16} height={16} />
              Add Semen Lot
            </PrimaryButton>
          ) : activeTab === "orders" ? (
            <PrimaryButton onClick={openAddOrder}>
              <Icon.plus width={16} height={16} />
              New Order
            </PrimaryButton>
          ) : activeTab === "agents" ? (
            <PrimaryButton onClick={openAddAgent}>
              <Icon.plus width={16} height={16} />
              Register Agent
            </PrimaryButton>
          ) : activeTab === "births" ? (
            <PrimaryButton onClick={() => { setEditingBirthId(null); setBirthForm(emptyBirthForm); setBirthOpen(true); }}>
              <Icon.plus width={16} height={16} />
              Record Birth
            </PrimaryButton>
          ) : null
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Semen Lots"
          value={String(stats.totalLots)}
          sublabel="in catalogue"
          iconName="vial"
          tone="blue"
        />
        <StatCard
          label="Available Straws"
          value={String(stats.totalAvailable)}
          sublabel="ready for dispatch"
          iconName="dna"
          tone="green"
        />
        <StatCard
          label="Active Orders"
          value={String(stats.activeOrders)}
          sublabel="pending / approved / shipped"
          iconName="report"
          tone="amber"
        />
        <StatCard
          label="Incentives Due"
          value={currency(stats.pendingIncentives)}
          sublabel="unpaid agent commissions"
          iconName="analytics"
          tone="green"
        />
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 border-b border-line">
        {(["catalog", "orders", "agents", "incentives", "births"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => router.replace(`/semen-supply?tab=${tab}`, { scroll: false })}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === tab
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab === "catalog"
              ? "Semen Catalogue"
              : tab === "orders"
              ? "Farmer Orders"
              : tab === "agents"
              ? "Sales Agents"
              : tab === "incentives"
              ? "Incentives"
              : "AI Births"}
          </button>
        ))}
      </div>

      {/* ---- Semen Catalogue tab ---- */}
      {activeTab === "catalog" && (
        <>
          <Card className="mb-4 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
              <Icon.search width={16} height={16} className="text-muted" />
              <input
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Search by bull name, reg no, breed, country or supplier…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
          </Card>

          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Bull / Reg No</Th>
                  <Th>Breed</Th>
                  <Th>Origin</Th>
                  <Th>Quality</Th>
                  <Th>Storage</Th>
                  <Th>Available</Th>
                  <Th>Expiry</Th>
                  <Th>Price</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {catalogRows.length === 0 ? (
                  <EmptyRow colSpan={11} label="No semen lots found" />
                ) : (
                  catalogRows.map((c) => {
                    const available = getAvailableStraws(c.id);
                    return (
                      <tr key={c.id}>
                        <Td className="font-mono text-xs text-muted">{c.id}</Td>
                        <Td>
                          <div className="font-medium">{c.bullName}</div>
                          <div className="font-mono text-xs text-muted">{c.bullRegNo}</div>
                        </Td>
                        <Td className="text-sm">{c.breed}</Td>
                        <Td className="text-sm">
                          <div>{c.countryOfOrigin}</div>
                          <div className="text-xs text-muted">{c.supplier}</div>
                        </Td>
                        <Td className="text-xs">
                          <div><span className="font-medium">{c.progressiveMotilityPct}%</span> motility</div>
                          <div className="text-muted">{c.morphologyPct}% morph · {c.strawType}</div>
                        </Td>
                        <Td className="font-mono text-xs text-muted">
                          <div>{c.tankId}</div>
                          <div>{c.canisterId} / {c.gobletId}</div>
                        </Td>
                        <Td>
                          <span className={`font-semibold ${
                            available === 0
                              ? "text-red-600"
                              : available <= 15
                              ? "text-amber-600"
                              : "text-brand-700"
                          }`}>
                            {available}
                          </span>
                          <span className="text-xs text-muted"> / {c.initialStraws}</span>
                        </Td>
                        <Td className="text-sm">{formatDate(c.expiryDate)}</Td>
                        <Td className="font-mono text-sm">${c.pricePerStrawUsd}/straw</Td>
                        <Td>
                          <Badge tone={catalogTone(c.status)}>{c.status}</Badge>
                        </Td>
                        <Td className="text-right">
                          <RowActions
                            onEdit={() => openEditCatalog(c)}
                            onDelete={() => remove("semenCatalog", c.id)}
                            label={`${c.bullName} (${c.bullRegNo})`}
                          />
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card>

          {/* Genetic merit summary cards */}
          {catalogRows.some((c) => c.milkEpdKg != null || c.fatEpdKg != null || c.fertilityIndex != null) && (
            <div className="mt-6">
              <Card>
                <CardHeader title="Genetic Merit Summary (EPDs)" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <Th>Bull</Th>
                        <Th>Breed</Th>
                        <Th>Milk EPD (kg)</Th>
                        <Th>Fat EPD (kg)</Th>
                        <Th>Protein EPD (kg)</Th>
                        <Th>Fertility Index</Th>
                        <Th>Conformation</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogRows.map((c) => (
                        <tr key={c.id}>
                          <Td className="font-medium">
                            {c.bullName}
                            <span className="ml-1 font-mono text-xs text-muted">({c.bullRegNo})</span>
                          </Td>
                          <Td className="text-muted">{c.breed}</Td>
                          <Td>
                            {c.milkEpdKg != null ? (
                              <span className={c.milkEpdKg >= 0 ? "text-brand-700" : "text-red-600"}>
                                {c.milkEpdKg >= 0 ? "+" : ""}{c.milkEpdKg}
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </Td>
                          <Td>
                            {c.fatEpdKg != null ? (
                              <span className={c.fatEpdKg >= 0 ? "text-brand-700" : "text-red-600"}>
                                {c.fatEpdKg >= 0 ? "+" : ""}{c.fatEpdKg}
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </Td>
                          <Td>
                            {c.proteinEpdKg != null ? (
                              <span className={c.proteinEpdKg >= 0 ? "text-brand-700" : "text-red-600"}>
                                {c.proteinEpdKg >= 0 ? "+" : ""}{c.proteinEpdKg}
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </Td>
                          <Td>
                            {c.fertilityIndex != null ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.fertilityIndex}%` }} />
                                </div>
                                <span className="text-xs font-medium">{c.fertilityIndex}</span>
                              </div>
                            ) : <span className="text-muted">—</span>}
                          </Td>
                          <Td>
                            {c.conformationScore != null ? (
                              <span className="font-medium">{c.conformationScore}<span className="text-xs text-muted">/10</span></span>
                            ) : <span className="text-muted">—</span>}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ---- Bull Supply Summary (inside catalog tab) ---- */}
      {activeTab === "catalog" && bullSupplySummary.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader title="Own-Bull Semen Supply" />
            <Table>
              <thead>
                <tr>
                  <Th>Bull</Th>
                  <Th>Breed</Th>
                  <Th>Tag ID</Th>
                  <Th>Catalog Lots</Th>
                  <Th>Total Straws Frozen</Th>
                  <Th>Straws Sold</Th>
                  <Th>Straws Available</Th>
                </tr>
              </thead>
              <tbody>
                {bullSupplySummary.map(({ bull, lots, totalStraws, availableStraws, soldStraws }) => (
                  <tr key={bull.id}>
                    <Td className="font-medium">{bull.name}</Td>
                    <Td className="text-sm text-muted">{bull.breed}</Td>
                    <Td className="font-mono text-xs text-muted">{bull.id}</Td>
                    <Td className="text-sm">
                      {lots > 0
                        ? <span className="font-semibold">{lots}</span>
                        : <span className="text-muted">—</span>}
                    </Td>
                    <Td className="text-sm font-semibold">{totalStraws || "—"}</Td>
                    <Td className="text-sm">
                      {soldStraws > 0
                        ? <span className="text-amber-600 font-semibold">{soldStraws}</span>
                        : <span className="text-muted">0</span>}
                    </Td>
                    <Td>
                      <span className={`font-semibold ${
                        availableStraws === 0 && totalStraws > 0
                          ? "text-red-600"
                          : availableStraws > 0
                          ? "text-brand-700"
                          : "text-muted"
                      }`}>
                        {totalStraws === 0 ? "No collections" : availableStraws}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {/* ---- Farmer Orders tab ---- */}
      {activeTab === "orders" && (
        <>
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
                <Icon.search width={16} height={16} className="text-muted" />
                <input
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Search by order ID, farmer or bull…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </div>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
              >
                <option value="">All statuses</option>
                {ORDER_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </Card>

          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Order ID</Th>
                  <Th>Farmer</Th>
                  <Th>Farm</Th>
                  <Th>Bull / Semen</Th>
                  <Th>Qty</Th>
                  <Th>Order Date</Th>
                  <Th>Expected Delivery</Th>
                  <Th>Total (USD)</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th>Agent</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {orderRows.length === 0 ? (
                  <EmptyRow colSpan={12} label="No orders found" />
                ) : (
                  orderRows.map((o) => {
                    const cat = semenCatalog.find((c) => c.id === o.semenCatalogId);
                    return (
                      <tr key={o.id}>
                        <Td className="font-mono text-xs text-muted">{o.id}</Td>
                        <Td className="font-medium">{getFarmerName(o.farmerId)}</Td>
                        <Td className="text-sm text-muted">{getFarmName(o.farmId)}</Td>
                        <Td className="text-sm">
                          {cat ? (
                            <>
                              <div className="font-medium">{cat.bullName}</div>
                              <div className="font-mono text-xs text-muted">{cat.bullRegNo} · {cat.breed}</div>
                            </>
                          ) : o.semenCatalogId}
                        </Td>
                        <Td className="text-sm">
                          <span className="font-semibold">{o.quantityOrdered}</span>
                          {o.quantityDelivered != null && o.quantityDelivered !== o.quantityOrdered && (
                            <span className="text-xs text-muted"> (del: {o.quantityDelivered})</span>
                          )}
                        </Td>
                        <Td className="text-sm">{formatDate(o.orderDate)}</Td>
                        <Td className="text-sm">
                          {o.actualDelivery ? (
                            <span className="text-brand-700">{formatDate(o.actualDelivery)}</span>
                          ) : formatDate(o.expectedDelivery)}
                        </Td>
                        <Td className="font-mono text-sm font-medium">{currency(o.totalAmountUsd)}</Td>
                        <Td><Badge tone={orderTone(o.status)}>{o.status}</Badge></Td>
                        <Td><Badge tone={paymentTone(o.paymentStatus)}>{o.paymentStatus}</Badge></Td>
                        <Td className="text-sm">
                          {o.saleAgentId ? (
                            <div>
                              <div className="font-medium">{getAgentName(o.saleAgentId)}</div>
                              <div className="text-xs text-muted">{o.commissionPct}%</div>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openRecordBirth(o)}
                              className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 border border-brand-200"
                            >
                              + Birth
                            </button>
                            <RowActions
                              onEdit={() => openEditOrder(o)}
                              onDelete={() => remove("semenOrders", o.id)}
                              label={o.id}
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
        </>
      )}

      {/* ---- Sales Agents tab ---- */}
      {activeTab === "agents" && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Default Commission</Th>
                <Th>Orders</Th>
                <Th>Total Earned</Th>
                <Th>Pending</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {saleAgents.length === 0 ? (
                <EmptyRow colSpan={10} label="No sales agents registered." />
              ) : (
                saleAgents.map((a) => {
                  const s = agentStats[a.id] ?? { orders: 0, totalEarned: 0, pendingAmount: 0 };
                  return (
                    <tr key={a.id}>
                      <Td className="font-mono text-xs text-muted">{a.id}</Td>
                      <Td className="font-medium">{a.firstName} {a.lastName}</Td>
                      <Td className="font-mono text-sm">{a.phone}</Td>
                      <Td className="text-sm text-muted">{a.email || "—"}</Td>
                      <Td>
                        <span className="font-semibold text-brand-700">{a.defaultCommissionPct}%</span>
                      </Td>
                      <Td className="text-sm font-semibold">{s.orders}</Td>
                      <Td className="font-mono text-sm">{currency(s.totalEarned)}</Td>
                      <Td className="font-mono text-sm">
                        <span className={s.pendingAmount > 0 ? "text-amber-600 font-semibold" : "text-muted"}>
                          {currency(s.pendingAmount)}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={a.isActive ? "green" : "gray"}>
                          {a.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <RowActions
                          onEdit={() => openEditAgent(a)}
                          onDelete={() => remove("saleAgents", a.id)}
                          label={`${a.firstName} ${a.lastName}`}
                        />
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ---- Incentives tab ---- */}
      {activeTab === "incentives" && (
        <>
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={incentiveAgentFilter}
                onChange={(e) => setIncentiveAgentFilter(e.target.value)}
                className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
              >
                <option value="">All agents</option>
                {saleAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                ))}
              </select>
              <select
                value={incentiveStatusFilter}
                onChange={(e) => setIncentiveStatusFilter(e.target.value)}
                className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
              >
                <option value="">All statuses</option>
                {INCENTIVE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </Card>

          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Agent</Th>
                  <Th>Order</Th>
                  <Th>Farmer</Th>
                  <Th>Sale Amount</Th>
                  <Th>Commission %</Th>
                  <Th>Commission Amount</Th>
                  <Th>Status</Th>
                  <Th>Paid Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {incentiveRows.length === 0 ? (
                  <EmptyRow colSpan={10} label="No incentive records found." />
                ) : (
                  incentiveRows.map((inc) => {
                    const order = semenOrders.find((o) => o.id === inc.semenOrderId);
                    return (
                      <tr key={inc.id}>
                        <Td className="font-mono text-xs text-muted">{inc.id}</Td>
                        <Td className="font-medium">{getAgentName(inc.agentId)}</Td>
                        <Td className="font-mono text-xs text-muted">{inc.semenOrderId}</Td>
                        <Td className="text-sm">
                          {order ? getFarmerName(order.farmerId) : "—"}
                        </Td>
                        <Td className="font-mono text-sm">{currency(inc.saleAmount)}</Td>
                        <Td className="text-sm font-semibold">{inc.commissionPct}%</Td>
                        <Td className="font-mono text-sm font-semibold text-brand-700">
                          {currency(inc.commissionAmount)}
                        </Td>
                        <Td>
                          <Badge tone={incentiveTone(inc.status)}>{inc.status}</Badge>
                        </Td>
                        <Td className="text-sm text-muted">
                          {inc.paidDate ? formatDate(inc.paidDate) : "—"}
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inc.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => update("saleIncentives", inc.id, { status: "Approved" })}
                                className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 border border-brand-200"
                              >
                                Approve
                              </button>
                            )}
                            {(inc.status === "Pending" || inc.status === "Approved") && (
                              <button
                                type="button"
                                onClick={() => update("saleIncentives", inc.id, { status: "Paid", paidDate: TODAY.toISOString().slice(0, 10) })}
                                className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 border border-green-200"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {/* ---- AI Births tab ---- */}
      {activeTab === "births" && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Birth ID</Th>
                <Th>Order</Th>
                <Th>Farmer</Th>
                <Th>Bull / Lot</Th>
                <Th>Dam Tag</Th>
                <Th>Insemination Date</Th>
                <Th>Status</Th>
                <Th>Birth Date</Th>
                <Th>Calf Tag</Th>
                <Th>Sex</Th>
                <Th>Weight</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {birthRows.length === 0 ? (
                <EmptyRow colSpan={12} label="No birth records found." />
              ) : (
                birthRows.map((b) => (
                  <tr key={b.id}>
                    <Td className="font-mono text-xs text-muted">{b.id}</Td>
                    <Td className="font-mono text-xs text-muted">{b.semenOrderId}</Td>
                    <Td className="font-medium">{getFarmerName(b.farmerId)}</Td>
                    <Td className="text-sm">
                      <div className="font-medium">{semenCatalog.find((c) => c.id === b.semenCatalogId)?.bullName ?? b.semenCatalogId}</div>
                      <div className="font-mono text-xs text-muted">{semenCatalog.find((c) => c.id === b.semenCatalogId)?.bullRegNo}</div>
                    </Td>
                    <Td className="text-sm">
                      <span className="font-mono">{b.damTagNo}</span>
                      {b.damBreed && <span className="ml-1 text-xs text-muted">({b.damBreed})</span>}
                    </Td>
                    <Td className="text-sm">{formatDate(b.inseminationDate)}</Td>
                    <Td>
                      <Badge tone={birthStatusTone(b.status)}>{b.status}</Badge>
                    </Td>
                    <Td className="text-sm">
                      {b.birthDate ? formatDate(b.birthDate) : <span className="text-muted">—</span>}
                    </Td>
                    <Td className="font-mono text-sm">
                      {b.calfTagNo ?? <span className="text-muted">—</span>}
                    </Td>
                    <Td className="text-sm">{b.calfSex}</Td>
                    <Td className="text-sm">
                      {b.calfWeightKg != null ? `${b.calfWeightKg} kg` : <span className="text-muted">—</span>}
                    </Td>
                    <Td className="text-right">
                      <RowActions
                        onEdit={() => openEditBirth(b)}
                        onDelete={() => remove("semenBirths", b.id)}
                        label={b.id}
                      />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ---- Semen Catalogue Modal ---- */}
      <Modal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        title={editingCatalogId ? "Edit Semen Lot" : "Add Semen Lot"}
        description="Record semen inventory with quality metrics, genetic merit and storage details."
        size="lg"
      >
        <form onSubmit={submitCatalog} className="max-h-[80vh] overflow-y-auto">
          <div className="space-y-4 p-5">
            <FormGrid>
              <SectionTitle>Source & Bull</SectionTitle>
              <div className="col-span-2">
                <SelectField
                  label="Semen Source"
                  value={catalogForm.source}
                  onChange={setCatalog("source")}
                  options={SEMEN_SOURCES.map((s) => ({ value: s, label: s }))}
                  required
                />
              </div>

              {catalogForm.source === "Own Collection" ? (
                <>
                  <div className="col-span-2">
                    <SelectField
                      label="Bull (from Cattle Registry)"
                      value={catalogForm.ownBullId}
                      onChange={handleBullChange}
                      options={bulls.map((b) => ({
                        value: b.id,
                        label: `${b.name} (${b.id}) — ${b.breed}`,
                      }))}
                      placeholder="— Select registered bull —"
                      required
                    />
                  </div>
                  {catalogForm.ownBullId && (
                    <div className="col-span-2 rounded-lg bg-brand-50 px-4 py-2 text-sm">
                      <span className="text-muted">Auto-filled: </span>
                      <span className="font-medium text-brand-700">
                        {catalogForm.bullName}
                      </span>
                      <span className="mx-1 text-muted">·</span>
                      <span className="text-muted">{catalogForm.breed}</span>
                      <span className="mx-1 text-muted">·</span>
                      <span className="font-mono text-xs text-muted">{catalogForm.bullRegNo}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <TextField
                    label="Bull Name"
                    value={catalogForm.bullName}
                    onChange={setCatalog("bullName")}
                    placeholder="e.g. Goldwyn"
                    required
                  />
                  <TextField
                    label="Registration No (NAAB / ICAR)"
                    value={catalogForm.bullRegNo}
                    onChange={setCatalog("bullRegNo")}
                    placeholder="e.g. 7H11234"
                    required
                  />
                  <SelectField
                    label="Breed"
                    value={catalogForm.breed}
                    onChange={setCatalog("breed")}
                    options={BREEDS}
                    placeholder="— Select breed —"
                    required
                  />
                  <TextField
                    label="Country of Origin"
                    value={catalogForm.countryOfOrigin}
                    onChange={setCatalog("countryOfOrigin")}
                    placeholder="e.g. Canada"
                    required
                  />
                </>
              )}

              <SectionTitle>Supplier & Dates</SectionTitle>
              {catalogForm.source !== "Own Collection" && (
                <>
                  <TextField
                    label="Supplier / Stud Farm"
                    value={catalogForm.supplier}
                    onChange={setCatalog("supplier")}
                    placeholder="e.g. Alta Genetics"
                    required
                  />
                  <TextField
                    label="Supplier Country"
                    value={catalogForm.supplierCountry}
                    onChange={setCatalog("supplierCountry")}
                    placeholder="e.g. Canada"
                  />
                </>
              )}
              <DateField
                label="Collection Date"
                value={catalogForm.collectionDate}
                onChange={setCatalog("collectionDate")}
                required
              />
              <DateField
                label="Expiry Date"
                value={catalogForm.expiryDate}
                onChange={setCatalog("expiryDate")}
                required
              />

              <SectionTitle>Semen Quality (ICAR Standard)</SectionTitle>
              <SelectField
                label="Straw Type"
                value={catalogForm.strawType}
                onChange={setCatalog("strawType")}
                options={STRAW_TYPES.map((t) => ({ value: t, label: t }))}
                required
              />
              <NumberField
                label="Progressive Motility (%)"
                value={catalogForm.progressiveMotilityPct}
                onChange={setCatalog("progressiveMotilityPct")}
                min={0}
                step={0.1}
                placeholder="e.g. 72"
                required
              />
              <NumberField
                label="Normal Morphology (%)"
                value={catalogForm.morphologyPct}
                onChange={setCatalog("morphologyPct")}
                min={0}
                step={0.1}
                placeholder="e.g. 85"
              />
              <NumberField
                label="Concentration (M/mL)"
                value={catalogForm.concentrationMPerMl}
                onChange={setCatalog("concentrationMPerMl")}
                min={0}
                step={0.1}
                placeholder="e.g. 120"
              />
              <NumberField
                label="Cells per Dose (M)"
                value={catalogForm.cellsPerDose}
                onChange={setCatalog("cellsPerDose")}
                min={0}
                step={0.1}
                placeholder="e.g. 20"
              />

              <SectionTitle>Genetic Merit / EPDs (Optional)</SectionTitle>
              <NumberField
                label="Milk EPD (kg)"
                value={catalogForm.milkEpdKg}
                onChange={setCatalog("milkEpdKg")}
                step={0.1}
                placeholder="e.g. 1245"
              />
              <NumberField
                label="Fat EPD (kg)"
                value={catalogForm.fatEpdKg}
                onChange={setCatalog("fatEpdKg")}
                step={0.1}
                placeholder="e.g. 38"
              />
              <NumberField
                label="Protein EPD (kg)"
                value={catalogForm.proteinEpdKg}
                onChange={setCatalog("proteinEpdKg")}
                step={0.1}
                placeholder="e.g. 32"
              />
              <NumberField
                label="Fertility Index (0–100)"
                value={catalogForm.fertilityIndex}
                onChange={setCatalog("fertilityIndex")}
                min={0}
                step={1}
                placeholder="e.g. 78"
              />
              <NumberField
                label="Conformation Score (0–10)"
                value={catalogForm.conformationScore}
                onChange={setCatalog("conformationScore")}
                min={0}
                step={0.1}
                placeholder="e.g. 8.2"
              />

              <SectionTitle>Liquid Nitrogen Storage</SectionTitle>
              <TextField
                label="Tank ID"
                value={catalogForm.tankId}
                onChange={setCatalog("tankId")}
                placeholder="e.g. T-01"
                required
              />
              <TextField
                label="Canister ID"
                value={catalogForm.canisterId}
                onChange={setCatalog("canisterId")}
                placeholder="e.g. CAN-A"
                required
              />
              <TextField
                label="Goblet ID"
                value={catalogForm.gobletId}
                onChange={setCatalog("gobletId")}
                placeholder="e.g. GOB-3"
                required
              />

              <SectionTitle>Inventory & Pricing</SectionTitle>
              <NumberField
                label="Initial Straws"
                value={catalogForm.initialStraws}
                onChange={setCatalog("initialStraws")}
                min={1}
                placeholder="e.g. 200"
                required
              />
              <NumberField
                label="Price per Straw (USD)"
                value={catalogForm.pricePerStrawUsd}
                onChange={setCatalog("pricePerStrawUsd")}
                min={0}
                step={0.01}
                placeholder="e.g. 28.00"
                required
              />

              <SectionTitle>Status & Notes</SectionTitle>
              <SelectField
                label="Status"
                value={catalogForm.status}
                onChange={setCatalog("status")}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                required
              />
              <div />
              <div className="col-span-2">
                <TextField
                  label="Certifications"
                  value={catalogForm.certifications}
                  onChange={setCatalog("certifications")}
                  placeholder="e.g. IETS approved, OIE health certified, BVD-free"
                />
              </div>
              <div className="col-span-2">
                <TextAreaField
                  label="Notes"
                  value={catalogForm.notes}
                  onChange={setCatalog("notes")}
                  rows={2}
                />
              </div>
            </FormGrid>
          </div>
          <div className="sticky bottom-0 border-t border-line bg-surface px-5 py-3">
            <FormButtons
              onCancel={() => setCatalogOpen(false)}
              submitLabel={editingCatalogId ? "Save Changes" : "Add Semen Lot"}
            />
          </div>
        </form>
      </Modal>

      {/* ---- Farmer Order Modal ---- */}
      <Modal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title={editingOrderId ? "Edit Order" : "New Semen Order"}
        description="Place or update a semen order for a registered farmer."
      >
        <form onSubmit={submitOrder} className="space-y-4 p-5">
          <FormGrid>
            <div className="col-span-2">
              <SelectField
                label="Farmer"
                value={orderForm.farmerId}
                onChange={handleFarmerChange}
                options={farmers.map((f) => ({
                  value: f.id,
                  label: `${f.firstName} ${f.lastName} (${f.id})`,
                }))}
                placeholder="— Select farmer —"
                required
              />
            </div>
            <div className="col-span-2">
              <SelectField
                label="Farm"
                value={orderForm.farmId}
                onChange={setOrder("farmId")}
                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                placeholder="— Select farm —"
                required
              />
            </div>
            <div className="col-span-2">
              <SelectField
                label="Semen Lot (Bull)"
                value={orderForm.semenCatalogId}
                onChange={handleSemenChange}
                options={semenCatalog.map((c) => ({
                  value: c.id,
                  label: `${c.bullName} (${c.bullRegNo}) — ${c.breed} — ${getAvailableStraws(c.id)} avail.`,
                }))}
                placeholder="— Select semen lot —"
                required
              />
            </div>
            <NumberField
              label="Quantity (straws)"
              value={orderForm.quantityOrdered}
              onChange={setOrder("quantityOrdered")}
              min={1}
              placeholder="e.g. 20"
              required
            />
            <NumberField
              label="Unit Price (USD)"
              value={orderForm.unitPriceUsd}
              onChange={setOrder("unitPriceUsd")}
              min={0}
              step={0.01}
              placeholder="auto-filled from lot"
              required
            />
            <DateField
              label="Order Date"
              value={orderForm.orderDate}
              onChange={setOrder("orderDate")}
              required
            />
            <DateField
              label="Expected Delivery"
              value={orderForm.expectedDelivery}
              onChange={setOrder("expectedDelivery")}
              required
            />
            <SelectField
              label="Status"
              value={orderForm.status}
              onChange={setOrder("status")}
              options={ORDER_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              required
            />
            <SelectField
              label="Payment Status"
              value={orderForm.paymentStatus}
              onChange={setOrder("paymentStatus")}
              options={PAYMENT_OPTIONS.map((s) => ({ value: s, label: s }))}
              required
            />
            {orderForm.status === "Delivered" && (
              <>
                <DateField
                  label="Actual Delivery Date"
                  value={orderForm.actualDelivery}
                  onChange={setOrder("actualDelivery")}
                />
                <NumberField
                  label="Qty Delivered"
                  value={orderForm.quantityDelivered}
                  onChange={setOrder("quantityDelivered")}
                  min={0}
                  placeholder="if different from ordered"
                />
              </>
            )}

            <SectionTitle>Sales Agent (Optional)</SectionTitle>
            <div className="col-span-2">
              <SelectField
                label="Sales Agent"
                value={orderForm.saleAgentId}
                onChange={handleAgentChange}
                options={saleAgents.filter((a) => a.isActive).map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName} — ${a.defaultCommissionPct}% default`,
                }))}
                placeholder="— None (direct sale) —"
              />
            </div>
            {orderForm.saleAgentId && (
              <NumberField
                label="Commission % (override)"
                value={orderForm.commissionPct}
                onChange={setOrder("commissionPct")}
                min={0}
                step={0.1}
                placeholder="leave blank for agent default"
              />
            )}

            <div className="col-span-2">
              <TextAreaField
                label="Notes"
                value={orderForm.notes}
                onChange={setOrder("notes")}
                rows={2}
              />
            </div>
          </FormGrid>
          {orderForm.quantityOrdered && orderForm.unitPriceUsd && (
            <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm">
              <span className="text-muted">Estimated total: </span>
              <span className="font-semibold text-brand-700">
                {currency((parseInt(orderForm.quantityOrdered) || 0) * (parseFloat(orderForm.unitPriceUsd) || 0))}
              </span>
              {orderForm.saleAgentId && orderForm.commissionPct && (
                <>
                  <span className="mx-2 text-muted">·</span>
                  <span className="text-muted">Agent commission: </span>
                  <span className="font-semibold text-amber-700">
                    {currency(
                      (parseInt(orderForm.quantityOrdered) || 0) *
                      (parseFloat(orderForm.unitPriceUsd) || 0) *
                      (parseFloat(orderForm.commissionPct) || 0) / 100
                    )}
                  </span>
                </>
              )}
            </div>
          )}
          <FormButtons
            onCancel={() => setOrderOpen(false)}
            submitLabel={editingOrderId ? "Save Changes" : "Place Order"}
          />
        </form>
      </Modal>

      {/* ---- Sales Agent Modal ---- */}
      <Modal
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        title={editingAgentId ? "Edit Sales Agent" : "Register Sales Agent"}
        description="Register an agent who facilitates semen sales and earns commissions."
      >
        <form onSubmit={submitAgent} className="space-y-4 p-5">
          <FormGrid>
            <TextField
              label="First Name"
              value={agentForm.firstName}
              onChange={setAgent("firstName")}
              required
            />
            <TextField
              label="Last Name"
              value={agentForm.lastName}
              onChange={setAgent("lastName")}
              required
            />
            <TextField
              label="Phone Number"
              value={agentForm.phone}
              onChange={setAgent("phone")}
              placeholder="+234-80X-XXX-XXXX"
              type="tel"
              required
            />
            <TextField
              label="Email Address"
              value={agentForm.email}
              onChange={setAgent("email")}
              type="email"
            />
            <NumberField
              label="Default Commission (%)"
              value={agentForm.defaultCommissionPct}
              onChange={setAgent("defaultCommissionPct")}
              min={0}
              step={0.1}
              placeholder="e.g. 5"
              required
            />
            <div />
            <div className="col-span-2">
              <TextAreaField
                label="Notes"
                value={agentForm.notes}
                onChange={setAgent("notes")}
                rows={2}
              />
            </div>
          </FormGrid>
          <FormButtons
            onCancel={() => setAgentOpen(false)}
            submitLabel={editingAgentId ? "Save Changes" : "Register Agent"}
          />
        </form>
      </Modal>

      {/* ---- Birth Recording Modal ---- */}
      <Modal
        open={birthOpen}
        onClose={() => setBirthOpen(false)}
        title={editingBirthId ? "Edit Birth Record" : "Record AI Birth"}
        description="Track insemination outcome and birth details for a farmer's animal."
      >
        <form onSubmit={submitBirth} className="space-y-4 p-5">
          <FormGrid>
            <div className="col-span-2">
              <SelectField
                label="Semen Order"
                value={birthForm.semenOrderId}
                onChange={handleBirthOrderChange}
                options={semenOrders.map((o) => ({
                  value: o.id,
                  label: `${o.id} — ${getFarmerName(o.farmerId)} — ${getCatalogLabel(o.semenCatalogId)}`,
                }))}
                placeholder="— Select order —"
                required
              />
            </div>
            <DateField
              label="Insemination Date"
              value={birthForm.inseminationDate}
              onChange={setBirth("inseminationDate")}
              required
            />
            <TextField
              label="Dam Tag No"
              value={birthForm.damTagNo}
              onChange={setBirth("damTagNo")}
              placeholder="Farmer's own tag reference"
              required
            />
            <TextField
              label="Dam Breed"
              value={birthForm.damBreed}
              onChange={setBirth("damBreed")}
              placeholder="e.g. Friesian cross"
            />
            <SelectField
              label="Status"
              value={birthForm.status}
              onChange={setBirth("status")}
              options={AI_BIRTH_STATUSES.map((s) => ({ value: s, label: s }))}
              required
            />
            {(birthForm.status === "Live Birth" || birthForm.status === "Stillbirth") && (
              <>
                <SectionTitle>Birth Details</SectionTitle>
                <DateField
                  label="Birth Date"
                  value={birthForm.birthDate}
                  onChange={setBirth("birthDate")}
                />
                <TextField
                  label="Calf Tag No"
                  value={birthForm.calfTagNo}
                  onChange={setBirth("calfTagNo")}
                  placeholder="Farmer-assigned tag"
                />
                <SelectField
                  label="Calf Sex"
                  value={birthForm.calfSex}
                  onChange={setBirth("calfSex")}
                  options={CALF_SEXES.map((s) => ({ value: s, label: s }))}
                />
                <NumberField
                  label="Calf Weight (kg)"
                  value={birthForm.calfWeightKg}
                  onChange={setBirth("calfWeightKg")}
                  min={0}
                  step={0.1}
                  placeholder="e.g. 38"
                />
                <SelectField
                  label="Calving Ease"
                  value={birthForm.calvingEase}
                  onChange={setBirth("calvingEase")}
                  options={CALVING_EASE_OPTIONS.map((s) => ({ value: s, label: s }))}
                  placeholder="— Select —"
                />
              </>
            )}
            <div className="col-span-2">
              <TextAreaField
                label="Notes"
                value={birthForm.notes}
                onChange={setBirth("notes")}
                rows={2}
              />
            </div>
          </FormGrid>
          <FormButtons
            onCancel={() => setBirthOpen(false)}
            submitLabel={editingBirthId ? "Save Changes" : "Record Birth"}
          />
        </form>
      </Modal>
    </>
  );
}

export default function SemenSupplyPage() {
  return (
    <Suspense fallback={null}>
      <SemenSupplyContent />
    </Suspense>
  );
}
