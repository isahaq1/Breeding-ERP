"use client";

import { useState, useMemo } from "react";
import { useData } from "@/lib/store";
import {
  Modal,
  TextField,
  NumberField,
  DateField,
  SelectField,
  TextAreaField,
  FormGrid,
  FormButtons,
} from "@/components/forms";
import { TODAY } from "@/lib/format";
import type { AccountType, TransactionType, TransactionStatus } from "@/lib/types";

// ---- Constants ---------------------------------------------------------------

const ACCOUNT_TYPES: AccountType[] = [
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
];

const TXN_TYPES: TransactionType[] = [
  "Sale",
  "Purchase",
  "Income",
  "Expense",
  "Journal Entry",
  "Opening Balance",
  "Transfer",
];

const TXN_STATUSES = ["Posted", "Draft", "Void"] as const;

const CURRENCIES = ["USD", "BDT", "EUR", "GBP", "CAD", "AUD"];

const CATEGORIES = [
  "Semen Sales",
  "AI Service Fees",
  "Cattle Sales",
  "Other Income",
  "Semen Procurement",
  "Feed & Nutrition",
  "Veterinary & Medical",
  "Labour & Wages",
  "Transport & Logistics",
  "Utilities",
  "Equipment & Maintenance",
  "Stud Fees",
  "Owner Equity",
  "Opening Balance",
  "Other Expenses",
];

// ---- Helpers -----------------------------------------------------------------

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

function typeBadge(type: string) {
  const map: Record<string, string> = {
    Asset: "bg-blue-100 text-blue-700",
    Liability: "bg-orange-100 text-orange-700",
    Equity: "bg-purple-100 text-purple-700",
    Revenue: "bg-green-100 text-green-700",
    Expense: "bg-red-100 text-red-700",
  };
  return map[type] ?? "bg-gray-100 text-gray-600";
}

function txnTypeBadge(type: string) {
  const map: Record<string, string> = {
    Sale: "bg-green-100 text-green-700",
    Purchase: "bg-orange-100 text-orange-700",
    Income: "bg-emerald-100 text-emerald-700",
    Expense: "bg-red-100 text-red-700",
    "Journal Entry": "bg-gray-100 text-gray-600",
    "Opening Balance": "bg-blue-100 text-blue-700",
    Transfer: "bg-purple-100 text-purple-700",
  };
  return map[type] ?? "bg-gray-100 text-gray-600";
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    Posted: "bg-green-100 text-green-700",
    Draft: "bg-yellow-100 text-yellow-700",
    Void: "bg-gray-100 text-gray-400 line-through",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

// Whether a debit entry increases the account balance (normal debit balance)
function isNormalDebitBalance(type: AccountType | string) {
  return type === "Asset" || type === "Expense";
}

// ---- Account Modal -----------------------------------------------------------

type AccountForm = {
  code: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
  notes: string;
};

const emptyAcc: AccountForm = {
  code: "",
  name: "",
  type: "Asset",
  currency: "USD",
  openingBalance: "0",
  notes: "",
};

function AccountModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (f: AccountForm) => void;
}) {
  const [form, setForm] = useState<AccountForm>(emptyAcc);
  const set = (k: keyof AccountForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setForm(emptyAcc);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Account"
      description="Add a new account to the Chart of Accounts"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <FormGrid>
            <TextField
              label="Account Code"
              value={form.code}
              onChange={set("code")}
              required
              placeholder="e.g. 1010"
            />
            <SelectField
              label="Account Type"
              value={form.type}
              onChange={set("type")}
              options={ACCOUNT_TYPES}
              required
            />
          </FormGrid>
          <TextField
            label="Account Name"
            value={form.name}
            onChange={set("name")}
            required
            placeholder="e.g. Petty Cash"
          />
          <FormGrid>
            <NumberField
              label="Opening Balance"
              value={form.openingBalance}
              onChange={set("openingBalance")}
              min={0}
              step={0.01}
            />
            <SelectField
              label="Currency"
              value={form.currency}
              onChange={set("currency")}
              options={CURRENCIES}
              required
            />
          </FormGrid>
          <TextAreaField
            label="Notes (optional)"
            value={form.notes}
            onChange={set("notes")}
            rows={2}
          />
        </div>
        <div className="px-5 pb-5">
          <FormButtons onCancel={onClose} submitLabel="Add Account" />
        </div>
      </form>
    </Modal>
  );
}

// ---- Transaction Modal -------------------------------------------------------

type TxnForm = {
  date: string;
  reference: string;
  description: string;
  type: string;
  category: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: string;
  currency: string;
  status: string;
  notes: string;
};

const emptyTxn = (): TxnForm => ({
  date: TODAY.toISOString().slice(0, 10),
  reference: "",
  description: "",
  type: "Income",
  category: "Semen Sales",
  debitAccountId: "",
  creditAccountId: "",
  amount: "0",
  currency: "USD",
  status: "Posted",
  notes: "",
});

function TransactionModal({
  open,
  onClose,
  onSave,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (f: TxnForm) => void;
  accounts: { id: string; code: string; name: string }[];
}) {
  const [form, setForm] = useState<TxnForm>(emptyTxn);
  const set = (k: keyof TxnForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const accOpts = [...accounts]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setForm(emptyTxn());
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post Transaction"
      description="Double-entry journal entry — every transaction debits one account and credits another"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="max-h-[65vh] overflow-y-auto">
          <div className="space-y-4 p-5">
            <FormGrid>
              <DateField
                label="Date"
                value={form.date}
                onChange={set("date")}
                required
              />
              <TextField
                label="Reference No."
                value={form.reference}
                onChange={set("reference")}
                placeholder="INV-001 / REC-001"
              />
            </FormGrid>
            <TextField
              label="Description"
              value={form.description}
              onChange={set("description")}
              required
              placeholder="Brief description of the transaction"
            />
            <FormGrid>
              <SelectField
                label="Transaction Type"
                value={form.type}
                onChange={set("type")}
                options={TXN_TYPES}
                required
              />
              <SelectField
                label="Category"
                value={form.category}
                onChange={set("category")}
                options={CATEGORIES}
                required
              />
            </FormGrid>
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
              <strong>Double-entry rule:</strong> Total debits must equal total credits. For a sale: Debit Cash/Receivable · Credit Revenue. For an expense: Debit Expense · Credit Cash.
            </div>
            <FormGrid>
              <SelectField
                label="Debit Account (Dr)"
                value={form.debitAccountId}
                onChange={set("debitAccountId")}
                options={accOpts}
                required
                placeholder="Select account…"
              />
              <SelectField
                label="Credit Account (Cr)"
                value={form.creditAccountId}
                onChange={set("creditAccountId")}
                options={accOpts}
                required
                placeholder="Select account…"
              />
            </FormGrid>
            <FormGrid>
              <NumberField
                label="Amount"
                value={form.amount}
                onChange={set("amount")}
                required
                min={0}
                step={0.01}
              />
              <SelectField
                label="Currency"
                value={form.currency}
                onChange={set("currency")}
                options={CURRENCIES}
                required
              />
            </FormGrid>
            <SelectField
              label="Status"
              value={form.status}
              onChange={set("status")}
              options={["Posted", "Draft"]}
              required
            />
            <TextAreaField
              label="Notes (optional)"
              value={form.notes}
              onChange={set("notes")}
              rows={2}
            />
          </div>
        </div>
        <div className="px-5 pb-5">
          <FormButtons onCancel={onClose} submitLabel="Post Transaction" />
        </div>
      </form>
    </Modal>
  );
}

// ---- Page -------------------------------------------------------------------

type Tab = "overview" | "accounts" | "tree" | "transactions" | "ledger";

export default function FinancePage() {
  const { accounts, transactions, addAccount, addTransaction } = useData();

  const [tab, setTab] = useState<Tab>("overview");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    () => new Set(ACCOUNT_TYPES),
  );
  const [showAccModal, setShowAccModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [accSearch, setAccSearch] = useState("");
  const [txnSearch, setTxnSearch] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("");
  const [txnStatusFilter, setTxnStatusFilter] = useState("");
  const [ledgerAccId, setLedgerAccId] = useState("");

  // Running balance for every account (double-entry, posted only)
  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts) map.set(acc.id, acc.openingBalance);
    for (const t of transactions) {
      if (t.status !== "Posted") continue;
      const drAcc = accounts.find((a) => a.id === t.debitAccountId);
      const crAcc = accounts.find((a) => a.id === t.creditAccountId);
      if (drAcc) {
        const delta = isNormalDebitBalance(drAcc.type) ? t.amount : -t.amount;
        map.set(drAcc.id, (map.get(drAcc.id) ?? 0) + delta);
      }
      if (crAcc) {
        const delta = isNormalDebitBalance(crAcc.type) ? -t.amount : t.amount;
        map.set(crAcc.id, (map.get(crAcc.id) ?? 0) + delta);
      }
    }
    return map;
  }, [accounts, transactions]);

  // P&L aggregates
  const totalRevenue = useMemo(
    () =>
      accounts
        .filter((a) => a.type === "Revenue")
        .reduce((s, a) => s + (balances.get(a.id) ?? 0), 0),
    [accounts, balances],
  );
  const totalExpenses = useMemo(
    () =>
      accounts
        .filter((a) => a.type === "Expense")
        .reduce((s, a) => s + (balances.get(a.id) ?? 0), 0),
    [accounts, balances],
  );
  const netIncome = totalRevenue - totalExpenses;
  const totalAssets = useMemo(
    () =>
      accounts
        .filter((a) => a.type === "Asset")
        .reduce((s, a) => s + (balances.get(a.id) ?? 0), 0),
    [accounts, balances],
  );

  // Recent 6 transactions for overview panel
  const recentTxns = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [transactions],
  );

  // Filtered accounts list
  const filteredAccounts = useMemo(
    () =>
      accounts
        .filter(
          (a) =>
            !accSearch ||
            a.name.toLowerCase().includes(accSearch.toLowerCase()) ||
            a.code.includes(accSearch),
        )
        .sort((a, b) => a.code.localeCompare(b.code)),
    [accounts, accSearch],
  );

  // Filtered transactions list
  const filteredTxns = useMemo(
    () =>
      transactions
        .filter((t) => {
          if (txnTypeFilter && t.type !== txnTypeFilter) return false;
          if (txnStatusFilter && t.status !== txnStatusFilter) return false;
          if (txnSearch) {
            const q = txnSearch.toLowerCase();
            return (
              t.description.toLowerCase().includes(q) ||
              t.reference.toLowerCase().includes(q) ||
              t.category.toLowerCase().includes(q)
            );
          }
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, txnTypeFilter, txnStatusFilter, txnSearch],
  );

  // Ledger entries for selected account with running balance
  const ledgerEntries = useMemo(() => {
    if (!ledgerAccId) return [];
    const acc = accounts.find((a) => a.id === ledgerAccId);
    if (!acc) return [];
    const normalDr = isNormalDebitBalance(acc.type);
    const entries = transactions
      .filter(
        (t) =>
          t.debitAccountId === ledgerAccId ||
          t.creditAccountId === ledgerAccId,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    let running = acc.openingBalance;
    return entries.map((t) => {
      const isDr = t.debitAccountId === ledgerAccId;
      const effect = isDr
        ? normalDr
          ? t.amount
          : -t.amount
        : normalDr
          ? -t.amount
          : t.amount;
      running += effect;
      return { txn: t, isDr, running };
    });
  }, [ledgerAccId, accounts, transactions]);

  function handleAddAccount(f: AccountForm) {
    addAccount({
      code: f.code,
      name: f.name,
      type: f.type as AccountType,
      currency: f.currency,
      openingBalance: parseFloat(f.openingBalance) || 0,
      isActive: true,
      notes: f.notes || undefined,
    });
  }

  function handleAddTransaction(f: TxnForm) {
    addTransaction({
      date: f.date,
      reference: f.reference,
      description: f.description,
      type: f.type as TransactionType,
      category: f.category,
      debitAccountId: f.debitAccountId,
      creditAccountId: f.creditAccountId,
      amount: parseFloat(f.amount) || 0,
      currency: f.currency,
      status: f.status as TransactionStatus,
      notes: f.notes || undefined,
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "accounts", label: "Chart of Accounts" },
    { key: "tree", label: "Tree View" },
    { key: "transactions", label: "Transactions" },
    { key: "ledger", label: "Ledger" },
  ];

  function toggleType(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  const allExpanded = expandedTypes.size === ACCOUNT_TYPES.length;

  // Accounts grouped by type, sorted by code within each group
  const accountsByType = useMemo(
    () =>
      Object.fromEntries(
        ACCOUNT_TYPES.map((type) => [
          type,
          accounts
            .filter((a) => a.type === type)
            .sort((a, b) => a.code.localeCompare(b.code)),
        ]),
      ) as Record<string, typeof accounts>,
    [accounts],
  );

  const ledgerAcc = accounts.find((a) => a.id === ledgerAccId);
  const ledgerEndBal =
    ledgerEntries.length > 0
      ? ledgerEntries[ledgerEntries.length - 1].running
      : (ledgerAcc?.openingBalance ?? 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Finance & Accounting</h1>
          <p className="text-sm text-muted">
            Double-entry bookkeeping · Chart of accounts · General ledger
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAccModal(true)}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            + Add Account
          </button>
          <button
            onClick={() => setShowTxnModal(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Post Transaction
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* OVERVIEW TAB                                                       */}
      {/* ================================================================= */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Total Revenue",
                value: totalRevenue,
                color: "text-green-700",
                sub: `${accounts.filter((a) => a.type === "Revenue").length} revenue accounts`,
              },
              {
                label: "Total Expenses",
                value: totalExpenses,
                color: "text-red-700",
                sub: `${accounts.filter((a) => a.type === "Expense").length} expense accounts`,
              },
              {
                label: "Net Income",
                value: netIncome,
                color: netIncome >= 0 ? "text-green-700" : "text-red-700",
                sub: netIncome >= 0 ? "Profitable period" : "Net loss this period",
              },
              {
                label: "Total Assets",
                value: totalAssets,
                color: "text-blue-700",
                sub: `${accounts.filter((a) => a.type === "Asset").length} asset accounts`,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-line bg-surface p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {card.label}
                </p>
                <p className={`mt-1 text-2xl font-bold ${card.color}`}>
                  {fmt(card.value)}
                </p>
                <p className="mt-1 text-xs text-muted">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Balance by type + Recent transactions */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="mb-4 text-sm font-semibold text-ink">
                Balances by Account Type
              </h3>
              <div className="space-y-3">
                {ACCOUNT_TYPES.map((type) => {
                  const accs = accounts.filter((a) => a.type === type);
                  const total = accs.reduce(
                    (s, a) => s + (balances.get(a.id) ?? 0),
                    0,
                  );
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between gap-3"
                    >
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadge(type)}`}
                      >
                        {type}
                      </span>
                      <span className="flex-1 text-xs text-muted">
                        {accs.length} account{accs.length !== 1 ? "s" : ""}
                      </span>
                      <span className="font-semibold text-ink">
                        {fmt(total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="mb-4 text-sm font-semibold text-ink">
                Recent Transactions
              </h3>
              <div className="space-y-3">
                {recentTxns.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {t.description}
                      </p>
                      <p className="text-xs text-muted">
                        {t.date} ·{" "}
                        <span
                          className={`rounded px-1.5 py-0.5 ${txnTypeBadge(t.type)}`}
                        >
                          {t.type}
                        </span>{" "}
                        · {t.category}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-ink">
                      {fmt(t.amount, t.currency)}
                    </span>
                  </div>
                ))}
                {recentTxns.length === 0 && (
                  <p className="text-sm text-muted">No transactions yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Posted vs Draft/Void summary */}
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink">
              Transaction Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center sm:grid-cols-3">
              {(["Posted", "Draft", "Void"] as const).map((s) => {
                const count = transactions.filter((t) => t.status === s).length;
                const total = transactions
                  .filter((t) => t.status === s)
                  .reduce((sum, t) => sum + t.amount, 0);
                return (
                  <div key={s}>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusDot(s)}`}
                    >
                      {s}
                    </span>
                    <p className="mt-2 text-xl font-bold text-ink">{count}</p>
                    <p className="text-xs text-muted">{fmt(total)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* CHART OF ACCOUNTS TAB                                             */}
      {/* ================================================================= */}
      {tab === "accounts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              className="w-64 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Search by code or name…"
              value={accSearch}
              onChange={(e) => setAccSearch(e.target.value)}
            />
            <span className="text-sm text-muted">
              {filteredAccounts.length} account
              {filteredAccounts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  {[
                    "Code",
                    "Account Name",
                    "Type",
                    "Currency",
                    "Opening Bal.",
                    "Current Balance",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredAccounts.map((acc) => {
                  const bal = balances.get(acc.id) ?? 0;
                  return (
                    <tr key={acc.id} className="hover:bg-canvas/50">
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {acc.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {acc.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge(acc.type)}`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{acc.currency}</td>
                      <td className="px-4 py-3 text-muted">
                        {fmtFull(acc.openingBalance)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${bal >= 0 ? "text-ink" : "text-red-600"}`}
                      >
                        {fmt(bal, acc.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            acc.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {acc.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted"
                    >
                      No accounts match your search.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Totals footer */}
              {filteredAccounts.length > 0 && (
                <tfoot className="border-t-2 border-line bg-canvas/50">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-xs font-semibold text-muted"
                    >
                      Totals ({filteredAccounts.length} accounts)
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-muted">
                      {fmtFull(
                        filteredAccounts.reduce(
                          (s, a) => s + a.openingBalance,
                          0,
                        ),
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-ink">
                      {fmt(
                        filteredAccounts.reduce(
                          (s, a) => s + (balances.get(a.id) ?? 0),
                          0,
                        ),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TREE VIEW TAB                                                      */}
      {/* ================================================================= */}
      {tab === "tree" && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""} across {ACCOUNT_TYPES.length} types
            </p>
            <button
              onClick={() =>
                setExpandedTypes(
                  allExpanded ? new Set() : new Set(ACCOUNT_TYPES),
                )
              }
              className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-muted hover:text-ink transition"
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </button>
          </div>

          {/* Tree */}
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {ACCOUNT_TYPES.map((type, typeIdx) => {
              const typeAccounts = accountsByType[type] ?? [];
              const typeTotal = typeAccounts.reduce(
                (s, a) => s + (balances.get(a.id) ?? 0),
                0,
              );
              const isExpanded = expandedTypes.has(type);
              const colorMap: Record<string, { row: string; badge: string; total: string }> = {
                Asset:     { row: "bg-blue-50/40",   badge: "bg-blue-100 text-blue-700",     total: "text-blue-700" },
                Liability: { row: "bg-orange-50/40", badge: "bg-orange-100 text-orange-700", total: "text-orange-700" },
                Equity:    { row: "bg-purple-50/40", badge: "bg-purple-100 text-purple-700", total: "text-purple-700" },
                Revenue:   { row: "bg-green-50/40",  badge: "bg-green-100 text-green-700",   total: "text-green-700" },
                Expense:   { row: "bg-red-50/40",    badge: "bg-red-100 text-red-700",       total: "text-red-700" },
              };
              const colors = colorMap[type] ?? { row: "bg-canvas", badge: "bg-gray-100 text-gray-600", total: "text-ink" };

              return (
                <div key={type} className={typeIdx > 0 ? "border-t border-line" : ""}>
                  {/* Group header row */}
                  <button
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-95 transition ${colors.row}`}
                  >
                    <span className="text-muted" style={{ fontSize: 11 }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}>
                      {type}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-ink">
                      {type === "Asset" ? "Assets"
                        : type === "Liability" ? "Liabilities"
                        : type === "Equity" ? "Equity"
                        : type === "Revenue" ? "Revenue"
                        : "Expenses"}
                    </span>
                    <span className="text-xs text-muted mr-4">
                      {typeAccounts.length} account{typeAccounts.length !== 1 ? "s" : ""}
                    </span>
                    <span className={`font-bold text-sm tabular-nums ${colors.total}`}>
                      {fmt(typeTotal)}
                    </span>
                  </button>

                  {/* Account rows */}
                  {isExpanded && (
                    <div className="divide-y divide-line/60">
                      {typeAccounts.length === 0 ? (
                        <div className="pl-10 pr-4 py-3 text-xs text-muted italic">
                          No accounts in this category.
                        </div>
                      ) : (
                        typeAccounts.map((acc) => {
                          const bal = balances.get(acc.id) ?? 0;
                          return (
                            <div
                              key={acc.id}
                              className="flex items-center gap-3 pl-10 pr-4 py-2.5 hover:bg-canvas/70 transition"
                            >
                              {/* Tree connector */}
                              <span className="shrink-0 text-line text-xs select-none">└</span>
                              <span className="w-14 shrink-0 font-mono text-xs text-muted">
                                {acc.code}
                              </span>
                              <span className="flex-1 text-sm text-ink">
                                {acc.name}
                              </span>
                              <span className="text-xs text-muted mr-6">
                                {acc.currency}
                              </span>
                              <span
                                className={`w-28 text-right text-sm font-semibold tabular-nums ${
                                  bal < 0 ? "text-red-600" : "text-ink"
                                }`}
                              >
                                {fmt(bal, acc.currency)}
                              </span>
                              <span
                                className={`w-16 text-right rounded-full px-2 py-0.5 text-xs font-medium ${
                                  acc.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {acc.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          );
                        })
                      )}
                      {/* Type subtotal row */}
                      {typeAccounts.length > 0 && (
                        <div className={`flex items-center pl-10 pr-4 py-2 ${colors.row}`}>
                          <span className="flex-1 text-xs font-semibold text-muted uppercase tracking-wider">
                            Total {type === "Asset" ? "Assets"
                              : type === "Liability" ? "Liabilities"
                              : type === "Equity" ? "Equity"
                              : type === "Revenue" ? "Revenue"
                              : "Expenses"}
                          </span>
                          <span className={`w-28 text-right text-sm font-bold tabular-nums ${colors.total}`}>
                            {fmt(typeTotal)}
                          </span>
                          <span className="w-16" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Accounting equation footer */}
            <div className="border-t-2 border-line bg-canvas/50 px-4 py-3">
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                <span className="text-muted">
                  <span className="font-semibold text-ink">Assets</span> ={" "}
                  <span className="font-semibold text-ink">Liabilities + Equity</span>
                  <span className="ml-2 text-muted">(Accounting Equation)</span>
                </span>
                <span className="ml-auto font-semibold text-ink">
                  Net Income:{" "}
                  <span className={netIncome >= 0 ? "text-green-700" : "text-red-600"}>
                    {fmt(netIncome)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TRANSACTIONS TAB                                                   */}
      {/* ================================================================= */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-56 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Search description, ref, category…"
              value={txnSearch}
              onChange={(e) => setTxnSearch(e.target.value)}
            />
            <select
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
              value={txnTypeFilter}
              onChange={(e) => setTxnTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {TXN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
              value={txnStatusFilter}
              onChange={(e) => setTxnStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {TXN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted">
              {filteredTxns.length} entr
              {filteredTxns.length !== 1 ? "ies" : "y"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  {[
                    "Date",
                    "Ref",
                    "Description",
                    "Type",
                    "Category",
                    "Dr Account",
                    "Cr Account",
                    "Amount",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredTxns.map((t) => {
                  const drAcc = accounts.find(
                    (a) => a.id === t.debitAccountId,
                  );
                  const crAcc = accounts.find(
                    (a) => a.id === t.creditAccountId,
                  );
                  return (
                    <tr key={t.id} className="hover:bg-canvas/50">
                      <td className="px-4 py-3 text-muted">{t.date}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {t.reference}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {t.description}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${txnTypeBadge(t.type)}`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {t.category}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {drAcc ? `${drAcc.code} ${drAcc.name}` : t.debitAccountId}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {crAcc ? `${crAcc.code} ${crAcc.name}` : t.creditAccountId}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {fmt(t.amount, t.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusDot(t.status)}`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredTxns.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-muted"
                    >
                      No transactions match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredTxns.length > 0 && (
                <tfoot className="border-t-2 border-line bg-canvas/50">
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-3 text-xs font-semibold text-muted"
                    >
                      Total ({filteredTxns.length} entries)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-ink">
                      {fmt(filteredTxns.reduce((s, t) => s + t.amount, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LEDGER TAB                                                         */}
      {/* ================================================================= */}
      {tab === "ledger" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="w-80 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
              value={ledgerAccId}
              onChange={(e) => setLedgerAccId(e.target.value)}
            >
              <option value="">Select an account to view its ledger…</option>
              {[...accounts]
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name} ({a.type})
                  </option>
                ))}
            </select>
            {ledgerAcc && (
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadge(ledgerAcc.type)}`}
                >
                  {ledgerAcc.type}
                </span>
                <span className="text-sm text-muted">
                  {ledgerEntries.length} entries · Closing balance:{" "}
                  <strong
                    className={ledgerEndBal >= 0 ? "text-ink" : "text-red-600"}
                  >
                    {fmt(ledgerEndBal, ledgerAcc.currency)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {!ledgerAccId && (
            <div className="rounded-xl border border-dashed border-line p-16 text-center text-muted">
              Select an account above to view its detailed ledger with running
              balance.
            </div>
          )}

          {ledgerAccId && ledgerAcc && (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <tr>
                    {[
                      "Date",
                      "Reference",
                      "Description",
                      "Category",
                      "Debit (Dr)",
                      "Credit (Cr)",
                      "Balance",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {/* Opening balance row */}
                  <tr className="bg-blue-50/50">
                    <td className="px-4 py-3 text-muted">—</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      OB
                    </td>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-sm italic text-muted"
                    >
                      Opening Balance
                    </td>
                    <td className="px-4 py-3 text-muted">—</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {fmt(ledgerAcc.openingBalance, ledgerAcc.currency)}
                    </td>
                  </tr>

                  {ledgerEntries.map(({ txn, isDr, running }) => (
                    <tr key={txn.id} className="hover:bg-canvas/50">
                      <td className="px-4 py-3 text-muted">{txn.date}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {txn.reference || txn.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {txn.description}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {txn.category}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-700">
                        {isDr ? fmt(txn.amount, txn.currency) : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-red-600">
                        {!isDr ? fmt(txn.amount, txn.currency) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${running >= 0 ? "text-ink" : "text-red-600"}`}
                      >
                        {fmt(running, txn.currency)}
                      </td>
                    </tr>
                  ))}

                  {ledgerEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted"
                      >
                        No transactions posted to this account yet.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Closing balance footer */}
                <tfoot className="border-t-2 border-line bg-canvas/50">
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-3 text-xs font-semibold text-muted"
                    >
                      Closing Balance
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-bold ${ledgerEndBal >= 0 ? "text-ink" : "text-red-600"}`}
                    >
                      {fmt(ledgerEndBal, ledgerAcc.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---- Modals ---- */}
      <AccountModal
        open={showAccModal}
        onClose={() => setShowAccModal(false)}
        onSave={handleAddAccount}
      />
      <TransactionModal
        open={showTxnModal}
        onClose={() => setShowTxnModal(false)}
        onSave={handleAddTransaction}
        accounts={accounts}
      />
    </div>
  );
}
