"use client";

import { useState } from "react";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, Badge, StatusBadge, PrimaryButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Modal, FormGrid, FormButtons, TextField, NumberField, SelectField, RowActions } from "@/components/forms";
import { useData } from "@/lib/store";
import type { FeedRecord } from "@/lib/types";
import { currency, number } from "@/lib/format";

const CATEGORY_OPTIONS = ["Forage", "Grain", "Supplement", "Mineral"];

const emptyForm = {
  feedType: "",
  category: "Forage",
  stockKg: "",
  reorderKg: "",
  dailyUseKg: "",
  costPerKg: "",
  supplier: "",
};

export default function FeedPage() {
  const { feedRecords, addFeed, update, remove } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const lowStock = feedRecords.filter((f) => f.stockKg <= f.reorderKg);
  const dailyCost = feedRecords.reduce((s, f) => s + f.dailyUseKg * f.costPerKg, 0);
  const totalStockValue = feedRecords.reduce((s, f) => s + f.stockKg * f.costPerKg, 0);
  const totalDailyUse = feedRecords.reduce((s, f) => s + f.dailyUseKg, 0);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(f: FeedRecord) {
    setEditingId(f.id);
    setForm({
      feedType: f.feedType,
      category: f.category,
      stockKg: String(f.stockKg),
      reorderKg: String(f.reorderKg),
      dailyUseKg: String(f.dailyUseKg),
      costPerKg: String(f.costPerKg),
      supplier: f.supplier,
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      feedType: form.feedType.trim(),
      category: form.category as FeedRecord["category"],
      stockKg: Number(form.stockKg) || 0,
      reorderKg: Number(form.reorderKg) || 0,
      dailyUseKg: Number(form.dailyUseKg) || 0,
      costPerKg: Number(form.costPerKg) || 0,
      supplier: form.supplier.trim(),
    };
    if (editingId) update("feedRecords", editingId, payload);
    else addFeed(payload);
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Feed Management"
        description="Inventory, consumption rates and reorder alerts for rations."
        action={
          <PrimaryButton onClick={openAdd}>
            <Icon.plus width={16} height={16} />
            Add Feed Item
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Feed Items" value={String(feedRecords.length)} iconName="feed" tone="green" />
        <StatCard label="Low Stock" value={String(lowStock.length)} sublabel="reorder needed" iconName="bell" tone={lowStock.length ? "red" : "green"} />
        <StatCard label="Daily Feed Use" value={`${number(totalDailyUse)} kg`} iconName="analytics" tone="blue" />
        <StatCard label="Daily Feed Cost" value={currency(dailyCost)} sublabel={`${currency(totalStockValue)} on hand`} iconName="report" tone="purple" />
      </div>

      {lowStock.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3 p-5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Icon.bell width={18} height={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Reorder required</p>
              <p className="mt-0.5 text-sm text-muted">
                {lowStock.map((f) => `${f.feedType} (${number(f.stockKg)} kg left)`).join("  •  ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Feed Inventory" />
        <Table>
          <thead>
            <tr>
              <Th>Feed Type</Th>
              <Th>Category</Th>
              <Th>In Stock</Th>
              <Th>Reorder At</Th>
              <Th>Daily Use</Th>
              <Th>Days Left</Th>
              <Th>Cost / kg</Th>
              <Th>Supplier</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {feedRecords.map((f) => {
              const daysLeft = f.dailyUseKg ? Math.floor(f.stockKg / f.dailyUseKg) : 0;
              const low = f.stockKg <= f.reorderKg;
              return (
                <tr key={f.id} className="transition hover:bg-canvas/60">
                  <Td className="font-medium">{f.feedType}</Td>
                  <Td><Badge tone="gray">{f.category}</Badge></Td>
                  <Td className="text-muted">{number(f.stockKg)} kg</Td>
                  <Td className="text-muted">{number(f.reorderKg)} kg</Td>
                  <Td className="text-muted">{f.dailyUseKg} kg</Td>
                  <Td>
                    <span className={daysLeft <= 7 ? "font-semibold text-amber-600" : "text-muted"}>
                      {daysLeft} days
                    </span>
                  </Td>
                  <Td className="text-muted">{currency(f.costPerKg)}</Td>
                  <Td className="text-muted">{f.supplier}</Td>
                  <Td><StatusBadge status={low ? "Overdue" : "Healthy"} /></Td>
                  <Td>
                    <div className="flex justify-end">
                      <RowActions onEdit={() => openEdit(f)} onDelete={() => remove("feedRecords", f.id)} label={f.feedType} />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Feed Item" : "Add Feed Item"}
        description={editingId ? `Update ${editingId}.` : "Add a new feed type to inventory."}
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <TextField label="Feed Type" value={form.feedType} onChange={set("feedType")} required placeholder="e.g. Alfalfa Hay" />
            <SelectField label="Category" value={form.category} onChange={set("category")} options={CATEGORY_OPTIONS} required />
            <NumberField label="In Stock (kg)" value={form.stockKg} onChange={set("stockKg")} required min={0} placeholder="e.g. 8400" />
            <NumberField label="Reorder At (kg)" value={form.reorderKg} onChange={set("reorderKg")} required min={0} placeholder="e.g. 3000" />
            <NumberField label="Daily Use (kg)" value={form.dailyUseKg} onChange={set("dailyUseKg")} required min={0} placeholder="e.g. 320" />
            <NumberField label="Cost / kg (USD)" value={form.costPerKg} onChange={set("costPerKg")} required min={0} step={0.01} placeholder="e.g. 0.28" />
            <TextField label="Supplier" value={form.supplier} onChange={set("supplier")} required placeholder="e.g. GreenValley Feeds" />
          </FormGrid>
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Add Feed Item"} />
        </form>
      </Modal>
    </>
  );
}
