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
} from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import { formatDate, currency, number } from "@/lib/format";
import type { SaleAgent, SettlementStatus } from "@/lib/types";

// ---- Tone helpers ------------------------------------------------------------

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "purple";

function settlementTone(status: SettlementStatus): Tone {
  if (status === "Paid") return "green";
  if (status === "Approved") return "blue";
  if (status === "Draft") return "amber";
  if (status === "Disputed") return "red";
  return "gray";
}

function conceptionTone(rate: number): string {
  if (rate >= 65) return "bg-green-500";
  if (rate >= 50) return "bg-amber-400";
  return "bg-red-500";
}

function conceptionTextTone(rate: number): string {
  if (rate >= 65) return "text-green-700";
  if (rate >= 50) return "text-amber-700";
  return "text-red-600";
}

// ---- Per-agent computation ---------------------------------------------------

interface AgentStats {
  agent: SaleAgent;
  totalServices: number;
  pregnantCount: number;
  openCount: number;
  pendingPD: number;
  conceptionRate: number;
  totalFeeEarned: number;
  strawsIssued: number;
  strawsUsed: number;
  strawsWasted: number;
  calves: number;
  commissions: number;
}

// ---- Main page ---------------------------------------------------------------

export default function AgentPerformancePage() {
  const {
    saleAgents,
    inseminationEvents,
    agentStrawIssues,
    farmerCalfBirths,
    saleIncentives,
    incentiveSettlements,
  } = useData();

  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // Compute per-agent stats
  const agentStats = useMemo<AgentStats[]>(() => {
    return saleAgents.map((agent) => {
      const agentEvents = inseminationEvents.filter((ie) => ie.agentId === agent.id);
      const totalServices = agentEvents.length;
      const pregnantCount = agentEvents.filter((e) => e.result === "Pregnant").length;
      const openCount = agentEvents.filter((e) => e.result === "Open").length;
      const pendingPD = agentEvents.filter((e) => e.result === "Pending PD").length;
      const conceptionRate =
        totalServices > 0 ? Math.round((pregnantCount / totalServices) * 100) : 0;
      const totalFeeEarned = agentEvents.reduce((s, e) => s + e.serviceFeeUsd, 0);

      const agentIssues = agentStrawIssues.filter((i) => i.agentId === agent.id);
      const strawsIssued = agentIssues.reduce((s, i) => s + i.quantityIssued, 0);
      const strawsUsed = agentIssues.reduce((s, i) => s + i.quantityUsed, 0);
      const strawsWasted = agentIssues.reduce((s, i) => s + i.quantityWasted, 0);

      const calves = farmerCalfBirths.filter((b) => b.agentId === agent.id).length;
      const commissions = saleIncentives
        .filter((i) => i.agentId === agent.id)
        .reduce((s, i) => s + i.commissionAmount, 0);

      return {
        agent,
        totalServices,
        pregnantCount,
        openCount,
        pendingPD,
        conceptionRate,
        totalFeeEarned,
        strawsIssued,
        strawsUsed,
        strawsWasted,
        calves,
        commissions,
      };
    });
  }, [saleAgents, inseminationEvents, agentStrawIssues, farmerCalfBirths, saleIncentives]);

  // Overall stats
  const totalActiveAgents = useMemo(
    () => saleAgents.filter((a) => a.isActive).length,
    [saleAgents],
  );
  const totalServices = inseminationEvents.length;
  const overallPregnant = inseminationEvents.filter((e) => e.result === "Pregnant").length;
  const overallConceptionRate =
    totalServices > 0 ? Math.round((overallPregnant / totalServices) * 100) : 0;
  const totalStrawsIssued = agentStrawIssues.reduce((s, i) => s + i.quantityIssued, 0);
  const totalCommissions = saleIncentives.reduce((s, i) => s + i.commissionAmount, 0);

  // Bar chart data — agents sorted by conception rate descending
  const barChartData = useMemo(
    () =>
      [...agentStats]
        .sort((a, b) => b.conceptionRate - a.conceptionRate)
        .map((s) => ({
          label: s.agent.firstName,
          value: s.conceptionRate,
        })),
    [agentStats],
  );

  // Overall result donut
  const donutData = useMemo(() => {
    const pregnant = inseminationEvents.filter((e) => e.result === "Pregnant").length;
    const open = inseminationEvents.filter((e) => e.result === "Open").length;
    const pending = inseminationEvents.filter((e) => e.result === "Pending PD").length;
    const repeat = inseminationEvents.filter((e) => e.result === "Repeat Service").length;
    return [
      { label: "Pregnant", value: pregnant, color: "#22c55e" },
      { label: "Open", value: open, color: "#ef4444" },
      { label: "Pending PD", value: pending, color: "#f59e0b" },
      { label: "Repeat Service", value: repeat, color: "#8b5cf6" },
    ];
  }, [inseminationEvents]);

  // Lookup helpers
  const agentName = (id: string) => {
    const a = saleAgents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : id;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agent Performance Dashboard"
        description="Track AI technician productivity, conception rates, straw utilisation, and commission settlements."
      />

      {/* ---- Top Stats ---- */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Active Agents"
          value={String(totalActiveAgents)}
          iconName="agent"
          tone="green"
        />
        <StatCard
          label="Total AI Services"
          value={number(totalServices)}
          iconName="syringe"
          tone="blue"
        />
        <StatCard
          label="Overall Conception Rate"
          value={`${overallConceptionRate}%`}
          iconName="percent"
          tone="green"
        />
        <StatCard
          label="Total Straws Issued"
          value={number(totalStrawsIssued)}
          iconName="vial"
          tone="purple"
        />
        <StatCard
          label="Total Commissions Earned"
          value={currency(totalCommissions)}
          iconName="report"
          tone="amber"
        />
      </div>

      {/* ---- Overall Result Distribution ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Overall AI Result Distribution" />
          <div className="p-6">
            <Donut data={donutData} size={160} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Conception Rate by Agent (%)" />
          <div className="p-6">
            {barChartData.length === 0 ? (
              <p className="text-sm text-muted">No data available.</p>
            ) : (
              <BarChart
                data={barChartData}
                height={200}
                color="var(--color-brand-500)"
                valueFormat={(n) => `${n}%`}
              />
            )}
          </div>
        </Card>
      </div>

      {/* ---- Agent Leaderboard Cards ---- */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-ink">Agent Leaderboard</h2>
        {agentStats.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">No agents found.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...agentStats]
              .sort((a, b) => b.conceptionRate - a.conceptionRate)
              .map((s) => {
                const expanded = expandedAgentId === s.agent.id;
                const agentEvents = inseminationEvents.filter(
                  (ie) => ie.agentId === s.agent.id,
                );

                return (
                  <Card key={s.agent.id} className="overflow-hidden">
                    {/* Card header row */}
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Icon.agent width={18} height={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {s.agent.firstName} {s.agent.lastName}
                          </p>
                          <p className="text-xs text-muted">{s.agent.phone}</p>
                        </div>
                      </div>
                      <Badge tone={s.agent.isActive ? "green" : "gray"}>
                        {s.agent.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Key metrics row */}
                    <div className="grid grid-cols-3 border-t border-line">
                      <div className="border-r border-line px-4 py-3 text-center">
                        <p className="text-xs text-muted">Services</p>
                        <p className="mt-0.5 text-lg font-bold text-ink">{s.totalServices}</p>
                      </div>
                      <div className="border-r border-line px-4 py-3 text-center">
                        <p className="text-xs text-muted">Conception</p>
                        <p
                          className={`mt-0.5 text-lg font-bold ${conceptionTextTone(s.conceptionRate)}`}
                        >
                          {s.conceptionRate}%
                        </p>
                      </div>
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs text-muted">Calves Born</p>
                        <p className="mt-0.5 text-lg font-bold text-ink">{s.calves}</p>
                      </div>
                    </div>

                    {/* Conception rate bar */}
                    <div className="px-5 pt-3 pb-1">
                      <div className="flex items-center justify-between text-xs text-muted mb-1">
                        <span>Conception rate</span>
                        <span className={conceptionTextTone(s.conceptionRate)}>
                          {s.conceptionRate}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${conceptionTone(s.conceptionRate)}`}
                          style={{ width: `${Math.min(s.conceptionRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Straws row */}
                    <div className="px-5 pt-3 pb-2 text-xs text-muted space-y-1">
                      <div className="flex justify-between">
                        <span>Straws issued</span>
                        <span className="font-medium text-ink">{s.strawsIssued}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Straws used</span>
                        <span className="font-medium text-ink">{s.strawsUsed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Straws wasted</span>
                        <span className="font-medium text-red-600">{s.strawsWasted}</span>
                      </div>
                    </div>

                    {/* Commission row */}
                    <div className="border-t border-line px-5 py-3 flex items-center justify-between">
                      <span className="text-xs text-muted">Commission earned</span>
                      <span className="text-sm font-semibold text-ink">
                        {currency(s.commissions)}
                      </span>
                    </div>

                    {/* View details toggle */}
                    <div className="border-t border-line px-5 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAgentId(expanded ? null : s.agent.id)
                        }
                        className="w-full text-center text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors py-1"
                      >
                        {expanded ? "Hide details" : "View details"}
                      </button>
                    </div>

                    {/* Expanded services list */}
                    {expanded && (
                      <div className="border-t border-line bg-canvas/40">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-muted">
                                  Date
                                </th>
                                <th className="px-4 py-2 text-left font-semibold text-muted">
                                  Result
                                </th>
                                <th className="px-4 py-2 text-right font-semibold text-muted">
                                  Fee
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {agentEvents.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="px-4 py-4 text-center text-muted"
                                  >
                                    No services recorded.
                                  </td>
                                </tr>
                              ) : (
                                agentEvents.slice(0, 8).map((ev) => (
                                  <tr
                                    key={ev.id}
                                    className="border-t border-line hover:bg-canvas/60"
                                  >
                                    <td className="px-4 py-2 text-muted">
                                      {formatDate(ev.inseminationDate)}
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge
                                        tone={
                                          ev.result === "Pregnant"
                                            ? "green"
                                            : ev.result === "Open"
                                              ? "red"
                                              : ev.result === "Pending PD"
                                                ? "amber"
                                                : "gray"
                                        }
                                      >
                                        {ev.result}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-ink">
                                      {currency(ev.serviceFeeUsd)}
                                    </td>
                                  </tr>
                                ))
                              )}
                              {agentEvents.length > 8 && (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="px-4 py-2 text-center text-muted"
                                  >
                                    +{agentEvents.length - 8} more services
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* ---- Performance Table ---- */}
      <Card>
        <CardHeader title="Agent Performance Summary" />
        <Table>
          <thead>
            <tr>
              <Th>Agent</Th>
              <Th>Services</Th>
              <Th>Pregnant</Th>
              <Th>Open</Th>
              <Th>Pending PD</Th>
              <Th>Conception %</Th>
              <Th>Straws Used</Th>
              <Th>Calves Born</Th>
              <Th>Revenue</Th>
              <Th>Commission</Th>
            </tr>
          </thead>
          <tbody>
            {agentStats.length === 0 ? (
              <EmptyRow colSpan={10} label="No agents found." />
            ) : (
              [...agentStats]
                .sort((a, b) => b.totalServices - a.totalServices)
                .map((s) => (
                  <tr key={s.agent.id} className="hover:bg-canvas/60 transition-colors">
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">
                          {s.agent.firstName} {s.agent.lastName}
                        </span>
                        <span className="text-xs text-muted">{s.agent.id}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="font-semibold">{s.totalServices}</span>
                    </Td>
                    <Td>
                      <span className="font-medium text-green-700">{s.pregnantCount}</span>
                    </Td>
                    <Td>
                      <span className="font-medium text-red-600">{s.openCount}</span>
                    </Td>
                    <Td>
                      <span className="font-medium text-amber-700">{s.pendingPD}</span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${conceptionTone(s.conceptionRate)}`}
                            style={{ width: `${Math.min(s.conceptionRate, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-semibold ${conceptionTextTone(s.conceptionRate)}`}
                        >
                          {s.conceptionRate}%
                        </span>
                      </div>
                    </Td>
                    <Td>{s.strawsUsed}</Td>
                    <Td>{s.calves}</Td>
                    <Td>{currency(s.totalFeeEarned)}</Td>
                    <Td>{currency(s.commissions)}</Td>
                  </tr>
                ))
            )}
          </tbody>
        </Table>
      </Card>

      {/* ---- Settlement Status Table ---- */}
      <Card>
        <CardHeader title="Incentive Settlement Status" />
        <Table>
          <thead>
            <tr>
              <Th>Agent</Th>
              <Th>Period</Th>
              <Th>Total Earned</Th>
              <Th>Deductions</Th>
              <Th>Net Payable</Th>
              <Th>Status</Th>
              <Th>Paid Date</Th>
            </tr>
          </thead>
          <tbody>
            {incentiveSettlements.length === 0 ? (
              <EmptyRow colSpan={7} label="No settlements found." />
            ) : (
              [...incentiveSettlements]
                .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
                .map((s) => (
                  <tr key={s.id} className="hover:bg-canvas/60 transition-colors">
                    <Td>
                      <span className="font-medium">{agentName(s.agentId)}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-muted">
                        {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                      </span>
                    </Td>
                    <Td>{currency(s.totalEarnedUsd)}</Td>
                    <Td>
                      <span className="text-red-600">
                        {s.totalDeductionsUsd > 0 ? `- ${currency(s.totalDeductionsUsd)}` : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold text-ink">
                        {currency(s.netPayableUsd)}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={settlementTone(s.status)}>{s.status}</Badge>
                    </Td>
                    <Td>
                      {s.paidDate ? formatDate(s.paidDate) : <span className="text-muted">—</span>}
                    </Td>
                  </tr>
                ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
