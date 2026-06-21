import { PageHeader, StatCard, Card, CardHeader } from "@/components/ui";
import { LineChart, BarChart, Donut } from "@/components/charts";
import {
  milkYield,
  monthlyBirths,
  breedDistribution,
  breedingRecords,
  birthRecords,
} from "@/lib/data";
import { number } from "@/lib/format";

const donutColors = ["#16a34a", "#22c55e", "#86efac", "#bbf7d0"];

export default function AnalyticsPage() {
  const confirmed = breedingRecords.filter((b) => b.result === "Confirmed Pregnant").length;
  const conception = Math.round((confirmed / breedingRecords.length) * 100);
  const liveBirths = birthRecords.filter((b) => b.outcome === "Live").length;
  const calvingSuccess = Math.round((liveBirths / birthRecords.length) * 100);
  const avgBirthWeight = (
    birthRecords.reduce((s, b) => s + b.birthWeightKg, 0) / birthRecords.length
  ).toFixed(1);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Production, reproduction and herd performance trends."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conception Rate" value={`${conception}%`} delta={6} sublabel="last 12 mo" iconName="heart" tone="blue" />
        <StatCard label="Calving Success" value={`${calvingSuccess}%`} delta={3} sublabel="live births" iconName="baby" tone="green" />
        <StatCard label="Avg Birth Weight" value={`${avgBirthWeight} kg`} delta={1} sublabel="per calf" iconName="analytics" tone="purple" />
        <StatCard label="Milk (June)" value={`${number(milkYield[milkYield.length - 1].liters)} L`} delta={9} sublabel="monthly total" iconName="feed" tone="green" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Milk Yield Trend (Liters / month)" />
          <div className="p-5">
            <LineChart
              data={milkYield.map((m) => ({ label: m.month, value: m.liters }))}
              valueFormat={(n) => `${number(n)} L`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Herd Composition" />
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
          <CardHeader title="Births per Month" />
          <div className="p-5">
            <BarChart
              data={monthlyBirths.map((m) => ({ label: m.month, value: m.count }))}
              color="var(--color-brand-600)"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Breeding Method Mix" />
          <div className="p-5">
            <BarChart
              data={["Natural", "Artificial Insemination", "Embryo Transfer"].map((m) => ({
                label: m === "Artificial Insemination" ? "AI" : m === "Embryo Transfer" ? "ET" : "Natural",
                value: breedingRecords.filter((b) => b.method === m).length,
              }))}
              color="#22c55e"
            />
          </div>
        </Card>
      </div>
    </>
  );
}
