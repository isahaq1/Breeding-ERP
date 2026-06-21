"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, Card, CardHeader, Table, Th, Td, StatusBadge, PrimaryButton } from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import { monthlyBirths, breedDistribution } from "@/lib/data";
import { formatDate, daysUntil, number } from "@/lib/format";

const donutColors = ["#16a34a", "#22c55e", "#86efac", "#bbf7d0"];

export default function DashboardPage() {
  const router = useRouter();
  const { cattle, breedingRecords, birthRecords, vaccinations, cattleLabel } = useData();

  const activeHerd = cattle.filter((c) => c.status !== "Sold" && c.status !== "Deceased");
  const pregnant = cattle.filter((c) => c.status === "Pregnant").length;
  const calves = cattle.filter((c) => c.status === "Calf").length;
  const dueAlerts = vaccinations.filter((v) => v.status === "Overdue" || v.status === "Due").length;

  // Upcoming calvings sorted by soonest expected date.
  const upcoming = breedingRecords
    .filter((b) => b.result === "Confirmed Pregnant")
    .sort((a, b) => daysUntil(a.expectedCalving) - daysUntil(b.expectedCalving))
    .slice(0, 5);

  const recentBirths = [...birthRecords]
    .sort((a, b) => b.birthDate.localeCompare(a.birthDate))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Herd overview for Greenfield Ranch — as of June 7, 2026."
        action={
          <PrimaryButton onClick={() => router.push("/cattle")}>
            <Icon.plus width={16} height={16} />
            Register Cattle
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Herd" value={number(activeHerd.length)} delta={4} sublabel="vs last month" iconName="cow" tone="green" />
        <StatCard label="Pregnant Cows" value={number(pregnant)} delta={12} sublabel="confirmed" iconName="heart" tone="blue" />
        <StatCard label="Calves (under 1yr)" value={number(calves)} delta={8} sublabel="on farm" iconName="baby" tone="purple" />
        <StatCard label="Health Alerts" value={number(dueAlerts)} delta={-2} sublabel="need attention" iconName="syringe" tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Births — last 12 months" action={<span className="text-xs text-muted">{birthRecords.length} total records</span>} />
          <div className="p-5">
            <BarChart data={monthlyBirths.map((m) => ({ label: m.month, value: m.count }))} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Herd by Breed" />
          <div className="grid place-items-center p-5">
            <Donut
              data={breedDistribution.map((b, i) => ({
                label: b.breed,
                value: b.count,
                color: donutColors[i % donutColors.length],
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Upcoming Calvings"
            action={<Link href="/breeding" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}
          />
          <Table>
            <thead>
              <tr>
                <Th>Dam</Th>
                <Th>Expected</Th>
                <Th>Countdown</Th>
                <Th>Method</Th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((b) => {
                const d = daysUntil(b.expectedCalving);
                return (
                  <tr key={b.id}>
                    <Td className="font-medium">{cattleLabel(b.damId)}</Td>
                    <Td>{formatDate(b.expectedCalving)}</Td>
                    <Td>
                      <span className={d <= 7 ? "font-semibold text-amber-600" : "text-muted"}>
                        {d < 0 ? "Overdue" : `in ${d} days`}
                      </span>
                    </Td>
                    <Td className="text-muted">{b.method}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Recent Births"
            action={<Link href="/births" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>}
          />
          <Table>
            <thead>
              <tr>
                <Th>Calf</Th>
                <Th>Date</Th>
                <Th>Class</Th>
                <Th>Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {recentBirths.map((b) => (
                <tr key={b.id}>
                  <Td className="font-medium">{b.calfId === "—" ? "—" : cattleLabel(b.calfId)}</Td>
                  <Td>{formatDate(b.birthDate)}</Td>
                  <Td className="text-muted">{b.class}</Td>
                  <Td><StatusBadge status={b.outcome} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
