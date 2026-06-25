"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/store";
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
} from "@/components/ui";
import { BarChart, LineChart, Donut } from "@/components/charts";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Tone = "green" | "amber" | "red" | "purple" | "gray" | "blue";

function conceptionTone(rate: number): Tone {
  if (rate >= 60) return "green";
  if (rate >= 40) return "amber";
  return "red";
}

function resultTone(result: string): Tone {
  switch (result) {
    case "Pregnant":
      return "green";
    case "Open":
      return "red";
    case "Pending PD":
      return "amber";
    case "Repeat Service":
      return "purple";
    case "Aborted":
      return "gray";
    default:
      return "gray";
  }
}

const TABS = [
  "Bull Performance",
  "Cow Fertility",
  "Repeat Services",
  "Monthly Trends",
] as const;
type Tab = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FertilityAnalysisPage() {
  const {
    inseminationEvents,
    farmerCattle,
    farmerCalfBirths,
    pregnancyDiagnoses,
    semenCatalog,
    farms,
  } = useData();

  const [activeTab, setActiveTab] = useState<Tab>("Bull Performance");

  // ---- Summary Stats --------------------------------------------------------

  const stats = useMemo(() => {
    const totalServices = inseminationEvents.length;
    const totalPregnant = inseminationEvents.filter(
      (ie) => ie.result === "Pregnant",
    ).length;
    const pendingPD = inseminationEvents.filter(
      (ie) => ie.result === "Pending PD",
    ).length;
    const liveCalves = farmerCalfBirths.filter(
      (b) => b.outcome === "Live Birth",
    ).length;

    const overallConceptionRate =
      totalServices > 0
        ? Math.round((totalPregnant / totalServices) * 100)
        : 0;

    const servicesPerConception =
      totalPregnant > 0 ? (totalServices / totalPregnant).toFixed(1) : "—";

    // Repeat service rate: cows with 2+ services / total unique cows served
    const uniqueCowIds = new Set(inseminationEvents.map((ie) => ie.farmerCattleId));
    const totalUniqueCows = uniqueCowIds.size;
    const repeatCowIds = new Set<string>();
    uniqueCowIds.forEach((id) => {
      const count = inseminationEvents.filter((ie) => ie.farmerCattleId === id).length;
      if (count >= 2) repeatCowIds.add(id);
    });
    const repeatServiceRate =
      totalUniqueCows > 0
        ? Math.round((repeatCowIds.size / totalUniqueCows) * 100)
        : 0;

    const calvingRate =
      totalServices > 0
        ? Math.round((liveCalves / totalServices) * 100)
        : 0;

    return {
      totalServices,
      totalPregnant,
      pendingPD,
      liveCalves,
      overallConceptionRate,
      servicesPerConception,
      repeatServiceRate,
      calvingRate,
    };
  }, [inseminationEvents, farmerCalfBirths]);

  // ---- Bull Performance -----------------------------------------------------

  const bullPerformance = useMemo(() => {
    return semenCatalog
      .map((bull) => {
        const services = inseminationEvents.filter(
          (ie) => ie.semenCatalogId === bull.id,
        );
        const pregnant = services.filter((ie) => ie.result === "Pregnant").length;
        const open = services.filter((ie) => ie.result === "Open").length;
        const pendingPD = services.filter(
          (ie) => ie.result === "Pending PD",
        ).length;
        const repeat = services.filter(
          (ie) => ie.result === "Repeat Service",
        ).length;
        const calves = farmerCalfBirths.filter(
          (b) => b.semenCatalogId === bull.id && b.outcome === "Live Birth",
        ).length;
        const conceptionRate =
          services.length > 0
            ? Math.round((pregnant / services.length) * 100)
            : 0;
        return {
          bull,
          services: services.length,
          pregnant,
          open,
          pendingPD,
          repeat,
          calves,
          conceptionRate,
        };
      })
      .filter((b) => b.services > 0)
      .sort((a, b) => b.conceptionRate - a.conceptionRate);
  }, [semenCatalog, inseminationEvents, farmerCalfBirths]);

  const topBull = bullPerformance[0] ?? null;

  const bullChartData = bullPerformance.map((b) => ({
    label: b.bull.bullName.split(" ")[0], // shorten for chart
    value: b.conceptionRate,
  }));

  // ---- Cow Fertility --------------------------------------------------------

  const cowFertility = useMemo(() => {
    return farmerCattle
      .map((fc) => {
        const events = inseminationEvents
          .filter((ie) => ie.farmerCattleId === fc.id)
          .sort((a, b) =>
            b.inseminationDate.localeCompare(a.inseminationDate),
          );
        const latestEvent = events[0] ?? null;
        const pds = pregnancyDiagnoses
          .filter((pd) => pd.farmerCattleId === fc.id)
          .sort((a, b) =>
            b.diagnosisDate.localeCompare(a.diagnosisDate),
          );
        const latestPD = pds[0] ?? null;
        const calvesBorn = farmerCalfBirths.filter(
          (b) => b.farmerCattleId === fc.id && b.outcome === "Live Birth",
        ).length;
        const farm = farms.find((f) => f.id === fc.farmId) ?? null;
        return {
          fc,
          events,
          serviceCount: events.length,
          latestEvent,
          latestPD,
          calvesBorn,
          farm,
        };
      })
      .filter((c) => c.serviceCount > 0)
      .sort((a, b) => b.serviceCount - a.serviceCount);
  }, [farmerCattle, inseminationEvents, pregnancyDiagnoses, farmerCalfBirths, farms]);

  // ---- Repeat Services ------------------------------------------------------

  const repeatCows = useMemo(
    () =>
      cowFertility
        .filter((c) => c.serviceCount >= 2)
        .sort((a, b) => b.serviceCount - a.serviceCount),
    [cowFertility],
  );

  const chronicRepeaters = repeatCows.filter((c) => c.serviceCount >= 3).length;
  const pctRepeat =
    cowFertility.length > 0
      ? Math.round((repeatCows.length / cowFertility.length) * 100)
      : 0;

  // ---- Monthly Trends -------------------------------------------------------

  const monthlyData = useMemo(() => {
    const now = new Date("2026-06-25");
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("default", { month: "short" }),
      };
    });

    return months.map((m) => {
      const events = inseminationEvents.filter((ie) =>
        ie.inseminationDate.startsWith(m.key),
      );
      const pregnant = events.filter((ie) => ie.result === "Pregnant").length;
      const open = events.filter((ie) => ie.result === "Open").length;
      const pendingPD = events.filter(
        (ie) => ie.result === "Pending PD",
      ).length;
      const rate =
        events.length > 0
          ? Math.round((pregnant / events.length) * 100)
          : 0;
      return { ...m, total: events.length, pregnant, open, pendingPD, rate };
    });
  }, [inseminationEvents]);

  const donutData = useMemo(() => {
    const total = inseminationEvents.length;
    if (total === 0) return [];
    const pregnant = inseminationEvents.filter(
      (ie) => ie.result === "Pregnant",
    ).length;
    const open = inseminationEvents.filter(
      (ie) => ie.result === "Open",
    ).length;
    const pending = inseminationEvents.filter(
      (ie) => ie.result === "Pending PD",
    ).length;
    const repeat = inseminationEvents.filter(
      (ie) => ie.result === "Repeat Service",
    ).length;
    const aborted = inseminationEvents.filter(
      (ie) => ie.result === "Aborted",
    ).length;
    return [
      { label: "Pregnant", value: pregnant, color: "#16a34a" },
      { label: "Open", value: open, color: "#dc2626" },
      { label: "Pending PD", value: pending, color: "#d97706" },
      { label: "Repeat Service", value: repeat, color: "#7c3aed" },
      { label: "Aborted", value: aborted, color: "#6b7280" },
    ].filter((d) => d.value > 0);
  }, [inseminationEvents]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <PageHeader
        title="Fertility Analysis"
        description="AI service outcomes, conception rates, repeat breeders, and monthly performance trends."
      />

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Overall Conception Rate"
          value={`${stats.overallConceptionRate}%`}
          iconName="percent"
          tone={conceptionTone(stats.overallConceptionRate)}
          sublabel="Pregnant / total services"
        />
        <StatCard
          label="Services Per Conception"
          value={String(stats.servicesPerConception)}
          iconName="syringe"
          tone="blue"
          sublabel="Lower is better"
        />
        <StatCard
          label="Repeat Service Rate"
          value={`${stats.repeatServiceRate}%`}
          iconName="analytics"
          tone={stats.repeatServiceRate >= 30 ? "red" : stats.repeatServiceRate >= 15 ? "amber" : "green"}
          sublabel="Cows with 2+ services"
        />
        <StatCard
          label="Calving Rate"
          value={`${stats.calvingRate}%`}
          iconName="baby"
          tone={stats.calvingRate >= 50 ? "green" : stats.calvingRate >= 30 ? "amber" : "red"}
          sublabel="Live births / total services"
        />
        <StatCard
          label="Pending PD"
          value={String(stats.pendingPD)}
          iconName="bell"
          tone="amber"
          sublabel="Awaiting diagnosis"
        />
        <StatCard
          label="Live Calves Born"
          value={String(stats.liveCalves)}
          iconName="heart"
          tone="green"
          sublabel="Confirmed live births"
        />
      </div>

      {/* ---- Tabs ---- */}
      <div className="mt-6">
        <div className="flex gap-1 rounded-xl border border-line bg-canvas p-1 sm:w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-surface text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {/* ================================================================
              TAB 1 — Bull Performance
          ================================================================ */}
          {activeTab === "Bull Performance" && (
            <div className="space-y-5">
              {/* Top bull highlight */}
              {topBull && (
                <Card className="border-green-200 bg-green-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <Icon.dna width={20} height={20} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                          Top Performing Bull
                        </p>
                        <p className="text-lg font-bold text-green-900">
                          {topBull.bull.bullName}
                        </p>
                        <p className="text-sm text-green-700">
                          {topBull.bull.breed} &middot; {topBull.bull.bullRegNo}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-900">
                          {topBull.conceptionRate}%
                        </p>
                        <p className="text-xs text-green-700">Conception Rate</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-900">
                          {topBull.services}
                        </p>
                        <p className="text-xs text-green-700">Services</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-900">
                          {topBull.calves}
                        </p>
                        <p className="text-xs text-green-700">Calves Born</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Bar chart */}
              {bullChartData.length > 0 && (
                <Card>
                  <CardHeader title="Conception Rate by Bull" />
                  <div className="p-5">
                    <BarChart
                      data={bullChartData}
                      height={160}
                      color="#16a34a"
                      valueFormat={(n) => `${n}%`}
                    />
                  </div>
                </Card>
              )}

              {/* Table */}
              <Card>
                <CardHeader title="Bull Ranking" />
                <Table>
                  <thead>
                    <tr>
                      <Th>Rank</Th>
                      <Th>Bull Name</Th>
                      <Th>Breed</Th>
                      <Th>Services</Th>
                      <Th>Pregnant</Th>
                      <Th>Open</Th>
                      <Th>Pending PD</Th>
                      <Th>Calves Born</Th>
                      <Th>Conception Rate</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {bullPerformance.length === 0 ? (
                      <EmptyRow colSpan={9} label="No bull performance data yet." />
                    ) : (
                      bullPerformance.map((b, i) => (
                        <tr
                          key={b.bull.id}
                          className="transition hover:bg-canvas/60"
                        >
                          <Td>
                            <span className="font-bold text-ink">{i + 1}</span>
                          </Td>
                          <Td className="font-medium">{b.bull.bullName}</Td>
                          <Td className="text-muted">{b.bull.breed}</Td>
                          <Td>{b.services}</Td>
                          <Td className="text-green-700 font-semibold">{b.pregnant}</Td>
                          <Td className="text-red-600">{b.open}</Td>
                          <Td className="text-amber-700">{b.pendingPD}</Td>
                          <Td>{b.calves}</Td>
                          <Td>
                            <Badge tone={conceptionTone(b.conceptionRate)}>
                              {b.conceptionRate}%
                            </Badge>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card>
            </div>
          )}

          {/* ================================================================
              TAB 2 — Cow Fertility
          ================================================================ */}
          {activeTab === "Cow Fertility" && (
            <Card>
              <CardHeader title="Cow Fertility Records" />
              <Table>
                <thead>
                  <tr>
                    <Th>Tag</Th>
                    <Th>Breed</Th>
                    <Th>Services</Th>
                    <Th>Last Service</Th>
                    <Th>PD Result</Th>
                    <Th>Calves Born</Th>
                    <Th>Farm</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {cowFertility.length === 0 ? (
                    <EmptyRow colSpan={8} label="No cow fertility data yet." />
                  ) : (
                    cowFertility.map(({ fc, serviceCount, latestEvent, latestPD, calvesBorn, farm }) => (
                      <tr
                        key={fc.id}
                        className="transition hover:bg-canvas/60"
                      >
                        <Td className="font-semibold">{fc.tagNumber}</Td>
                        <Td className="text-muted">{fc.breed}</Td>
                        <Td>
                          <span
                            className={`font-bold ${
                              serviceCount > 2
                                ? "text-red-600"
                                : serviceCount === 2
                                ? "text-amber-700"
                                : "text-green-700"
                            }`}
                          >
                            {serviceCount}
                          </span>
                        </Td>
                        <Td className="text-muted">
                          {latestEvent
                            ? formatDate(latestEvent.inseminationDate)
                            : "—"}
                        </Td>
                        <Td>
                          {latestPD ? (
                            <Badge
                              tone={
                                latestPD.result === "Pregnant" || latestPD.result === "Twins"
                                  ? "green"
                                  : latestPD.result === "Open"
                                  ? "red"
                                  : latestPD.result === "Aborted"
                                  ? "gray"
                                  : "amber"
                              }
                            >
                              {latestPD.result}
                            </Badge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </Td>
                        <Td>{calvesBorn}</Td>
                        <Td className="text-muted">{farm?.name ?? "—"}</Td>
                        <Td>
                          {latestEvent ? (
                            <Badge tone={resultTone(latestEvent.result)}>
                              {latestEvent.result}
                            </Badge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          )}

          {/* ================================================================
              TAB 3 — Repeat Services
          ================================================================ */}
          {activeTab === "Repeat Services" && (
            <div className="space-y-5">
              {/* Mini stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Repeat Breeders"
                  value={String(repeatCows.length)}
                  iconName="analytics"
                  tone={repeatCows.length > 0 ? "amber" : "green"}
                  sublabel="2+ services"
                />
                <StatCard
                  label="Chronic Repeaters"
                  value={String(chronicRepeaters)}
                  iconName="report"
                  tone={chronicRepeaters > 0 ? "red" : "green"}
                  sublabel="3+ services (ICAR standard)"
                />
                <StatCard
                  label="% of Served Cows"
                  value={`${pctRepeat}%`}
                  iconName="percent"
                  tone={pctRepeat >= 30 ? "red" : pctRepeat >= 15 ? "amber" : "green"}
                  sublabel="Repeat breeders / total served"
                />
              </div>

              {/* Table */}
              <Card>
                <CardHeader title="Repeat Breeder Cows" />
                {repeatCows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Icon.heart width={24} height={24} />
                    </div>
                    <p className="text-sm font-medium text-ink">
                      No repeat service cases
                    </p>
                    <p className="text-sm text-muted">
                      Excellent herd fertility!
                    </p>
                  </div>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Tag</Th>
                        <Th>Breed</Th>
                        <Th>Farm</Th>
                        <Th>Service 1</Th>
                        <Th>Service 2</Th>
                        <Th>Service 3+</Th>
                        <Th>Total Services</Th>
                        <Th>Current Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatCows.map(({ fc, events, serviceCount, latestEvent, farm }) => {
                        // Sort chronologically for display
                        const sorted = [...events].sort((a, b) =>
                          a.inseminationDate.localeCompare(b.inseminationDate),
                        );
                        return (
                          <tr
                            key={fc.id}
                            className="transition hover:bg-canvas/60"
                          >
                            <Td className="font-semibold">{fc.tagNumber}</Td>
                            <Td className="text-muted">{fc.breed}</Td>
                            <Td className="text-muted">{farm?.name ?? "—"}</Td>
                            <Td className="text-muted">
                              {sorted[0]
                                ? formatDate(sorted[0].inseminationDate)
                                : "—"}
                            </Td>
                            <Td className="text-muted">
                              {sorted[1]
                                ? formatDate(sorted[1].inseminationDate)
                                : "—"}
                            </Td>
                            <Td className="text-muted">
                              {sorted[2]
                                ? formatDate(sorted[2].inseminationDate)
                                : "—"}
                            </Td>
                            <Td>
                              <span
                                className={`font-bold ${
                                  serviceCount >= 3
                                    ? "text-red-600"
                                    : "text-amber-700"
                                }`}
                              >
                                {serviceCount}
                              </span>
                            </Td>
                            <Td>
                              {latestEvent ? (
                                <Badge tone={resultTone(latestEvent.result)}>
                                  {latestEvent.result}
                                </Badge>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </Card>
            </div>
          )}

          {/* ================================================================
              TAB 4 — Monthly Trends
          ================================================================ */}
          {activeTab === "Monthly Trends" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Conception rate line chart */}
                <Card>
                  <CardHeader title="Conception Rate (Last 6 Months)" />
                  <div className="p-5">
                    <LineChart
                      data={monthlyData.map((m) => ({
                        label: m.label,
                        value: m.rate,
                      }))}
                      color="#2563eb"
                      valueFormat={(n) => `${n}%`}
                    />
                  </div>
                </Card>

                {/* Services per month bar chart */}
                <Card>
                  <CardHeader title="Services per Month" />
                  <div className="p-5">
                    <BarChart
                      data={monthlyData.map((m) => ({
                        label: m.label,
                        value: m.total,
                      }))}
                      color="#0891b2"
                    />
                  </div>
                </Card>
              </div>

              {/* Donut chart */}
              <Card>
                <CardHeader title="Overall AI Result Distribution" />
                <div className="p-5">
                  {donutData.length > 0 ? (
                    <Donut data={donutData} size={180} />
                  ) : (
                    <p className="py-8 text-center text-sm text-muted">
                      No insemination data to display.
                    </p>
                  )}
                </div>
              </Card>

              {/* Summary table */}
              <Card>
                <CardHeader title="Monthly Summary" />
                <Table>
                  <thead>
                    <tr>
                      <Th>Month</Th>
                      <Th>Services</Th>
                      <Th>Pregnant</Th>
                      <Th>Open</Th>
                      <Th>Pending PD</Th>
                      <Th>Conception Rate</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.every((m) => m.total === 0) ? (
                      <EmptyRow
                        colSpan={6}
                        label="No insemination data in the last 6 months."
                      />
                    ) : (
                      monthlyData.map((m) => (
                        <tr
                          key={m.key}
                          className="transition hover:bg-canvas/60"
                        >
                          <Td className="font-medium">{m.label}</Td>
                          <Td>{m.total}</Td>
                          <Td className="text-green-700 font-semibold">
                            {m.pregnant}
                          </Td>
                          <Td className="text-red-600">{m.open}</Td>
                          <Td className="text-amber-700">{m.pendingPD}</Td>
                          <Td>
                            {m.total > 0 ? (
                              <Badge tone={conceptionTone(m.rate)}>
                                {m.rate}%
                              </Badge>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
