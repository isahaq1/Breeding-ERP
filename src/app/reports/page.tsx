import Link from "next/link";
import { PageHeader, Card, CardHeader, Table, Th, Td } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import {
  cattle,
  breedingRecords,
  birthRecords,
  healthRecords,
  salesTransfers,
  vaccinations,
} from "@/lib/data";
import { currency, number } from "@/lib/format";

const reports: { title: string; desc: string; icon: IconName; href: string }[] = [
  { title: "Herd Inventory Report", desc: "Full census by breed, sex, age and status.", icon: "cow", href: "/cattle" },
  { title: "Breeding Performance", desc: "Conception rates, methods and calving intervals.", icon: "heart", href: "/breeding" },
  { title: "Calving & Birth Report", desc: "Outcomes, weights and calving-ease analysis.", icon: "baby", href: "/births" },
  { title: "Health & Mortality", desc: "Treatments, vet spend and disease incidence.", icon: "stethoscope", href: "/health" },
  { title: "Vaccination Compliance", desc: "Coverage, overdue animals and schedule.", icon: "syringe", href: "/vaccinations" },
  { title: "Financial Summary", desc: "Sales, purchases and transfer ledger.", icon: "report", href: "/sales" },
];

export default function ReportsPage() {
  const liveBirths = birthRecords.filter((b) => b.outcome === "Live").length;
  const summary: [string, string][] = [
    ["Registered animals", number(cattle.length)],
    ["Active breeding services", number(breedingRecords.length)],
    ["Confirmed pregnancies", number(breedingRecords.filter((b) => b.result === "Confirmed Pregnant").length)],
    ["Births recorded", `${number(birthRecords.length)} (${liveBirths} live)`],
    ["Vaccinations on file", number(vaccinations.length)],
    ["Open health cases", number(healthRecords.filter((h) => h.status !== "Resolved").length)],
    ["Vet spend (YTD)", currency(healthRecords.reduce((s, h) => s + h.costUsd, 0))],
    ["Sales revenue", currency(salesTransfers.filter((s) => s.type === "Sale" && s.status === "Completed").reduce((s, r) => s + r.amountUsd, 0))],
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and export operational and compliance reports."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Available Reports" />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {reports.map((r) => {
              const IconCmp = Icon[r.icon];
              return (
                <Link
                  key={r.title}
                  href={r.href}
                  className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-brand-300 hover:shadow-sm"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
                    <IconCmp width={20} height={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      {r.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{r.desc}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                      <Icon.download width={14} height={14} /> Export
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Farm Snapshot" action={<span className="text-xs text-muted">Jun 7, 2026</span>} />
          <Table>
            <thead>
              <tr>
                <Th>Metric</Th>
                <Th className="text-right">Value</Th>
              </tr>
            </thead>
            <tbody>
              {summary.map(([k, v]) => (
                <tr key={k}>
                  <Td className="text-muted">{k}</Td>
                  <Td className="text-right font-semibold">{v}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
