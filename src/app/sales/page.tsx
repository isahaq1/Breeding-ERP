"use client";

import { useState } from "react";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, StatusBadge, Badge, PrimaryButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, TextField, DateField, SelectField, NumberField } from "@/components/forms";
import { useData } from "@/lib/store";
import type { SaleTransfer } from "@/lib/types";
import { formatDate, currency } from "@/lib/format";

const typeTone: Record<string, "green" | "blue" | "amber" | "purple"> = {
  Sale: "green",
  Purchase: "blue",
  "Transfer In": "purple",
  "Transfer Out": "amber",
};

const TYPE_OPTIONS = ["Sale", "Purchase", "Transfer In", "Transfer Out"];
const STATUS_OPTIONS = ["Completed", "Pending", "Cancelled"];

const emptyForm = {
  cattleId: "",
  type: "Sale",
  counterparty: "",
  date: "2026-06-07",
  amountUsd: "",
  status: "Pending",
};

export default function SalesPage() {
  const { salesTransfers, cattle, cattleLabel, addSale } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const completed = salesTransfers.filter((s) => s.status === "Completed");
  const pending = salesTransfers.filter((s) => s.status === "Pending").length;
  const revenue = completed.filter((s) => s.type === "Sale").reduce((s, r) => s + r.amountUsd, 0);
  const spend = completed.filter((s) => s.type === "Purchase").reduce((s, r) => s + r.amountUsd, 0);

  const sorted = [...salesTransfers].sort((a, b) => b.date.localeCompare(a.date));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addSale({
      cattleId: form.cattleId,
      type: form.type as SaleTransfer["type"],
      counterparty: form.counterparty.trim(),
      date: form.date,
      amountUsd: Number(form.amountUsd) || 0,
      status: form.status as SaleTransfer["status"],
    });
    setForm(emptyForm);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Sales & Transfer"
        description="Animal movements, purchases, sales and inter-farm transfers."
        action={
          <PrimaryButton onClick={() => setOpen(true)}>
            <Icon.plus width={16} height={16} />
            New Transaction
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales Revenue" value={currency(revenue)} delta={7} sublabel="completed" iconName="report" tone="green" />
        <StatCard label="Purchase Spend" value={currency(spend)} iconName="swap" tone="blue" />
        <StatCard label="Net" value={currency(revenue - spend)} sublabel="revenue − spend" iconName="analytics" tone="purple" />
        <StatCard label="Pending" value={String(pending)} sublabel="awaiting close" iconName="bell" tone="amber" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Transaction Ledger" action={<span className="text-xs text-muted">{salesTransfers.length} transactions</span>} />
        <Table>
          <thead>
            <tr>
              <Th>Ref</Th>
              <Th>Date</Th>
              <Th>Animal</Th>
              <Th>Type</Th>
              <Th>Counterparty</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="transition hover:bg-canvas/60">
                <Td className="font-semibold text-muted">{s.id}</Td>
                <Td>{formatDate(s.date)}</Td>
                <Td className="font-medium">{cattleLabel(s.cattleId)}</Td>
                <Td><Badge tone={typeTone[s.type]}>{s.type}</Badge></Td>
                <Td className="text-muted">{s.counterparty}</Td>
                <Td className="text-muted">{s.amountUsd > 0 ? currency(s.amountUsd) : "—"}</Td>
                <Td><StatusBadge status={s.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Transaction" description="Record a sale, purchase or transfer.">
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <SelectField
              label="Animal"
              value={form.cattleId}
              onChange={set("cattleId")}
              options={cattle.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              required
              placeholder="— Select animal —"
            />
            <SelectField label="Type" value={form.type} onChange={set("type")} options={TYPE_OPTIONS} required />
            <TextField label="Counterparty" value={form.counterparty} onChange={set("counterparty")} required placeholder="e.g. Meadowbrook Dairy" />
            <DateField label="Date" value={form.date} onChange={set("date")} required />
            <NumberField label="Amount (USD)" value={form.amountUsd} onChange={set("amountUsd")} min={0} placeholder="0 for transfers" />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={STATUS_OPTIONS} required />
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel="Save Transaction" />
        </form>
      </Modal>
    </>
  );
}
