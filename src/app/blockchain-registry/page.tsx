"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  StatCard,
  Table,
  Th,
  Td,
  EmptyRow,
  Badge,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import type { BlockchainEntityType, BlockchainNetwork } from "@/lib/types";

const ENTITY_TONE: Record<BlockchainEntityType, "green"|"blue"|"purple"|"amber"|"gray"> = {
  "Pedigree Certificate": "green",
  "Health Record":         "blue",
  "Ownership Transfer":   "gray",
  "Bull Registration":     "purple",
  "Vaccination Record":   "amber",
};

const NET_TONE: Record<BlockchainNetwork, "green"|"blue"|"purple"> = {
  AgriChain:       "green",
  LivestockLedger: "blue",
  HerdChain:       "purple",
};

function shortHash(h: string) {
  return h.slice(0, 10) + "…" + h.slice(-6);
}

export default function BlockchainRegistryPage() {
  const { cattle, bullRegistrations, blockchainRecords, update } = useData();
  const [entityFilter, setEntityFilter] = useState<BlockchainEntityType | "">("");
  const [netFilter, setNetFilter] = useState<BlockchainNetwork | "">("");
  const [verifiedFilter, setVerifiedFilter] = useState<"" | "verified" | "unverified">("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = [...blockchainRecords].sort((a, b) => b.blockNumber - a.blockNumber);
    if (entityFilter) list = list.filter(r => r.entityType === entityFilter);
    if (netFilter) list = list.filter(r => r.network === netFilter);
    if (verifiedFilter === "verified") list = list.filter(r => r.isVerified);
    if (verifiedFilter === "unverified") list = list.filter(r => !r.isVerified);
    return list;
  }, [blockchainRecords, entityFilter, netFilter, verifiedFilter]);

  const stats = useMemo(() => ({
    total: blockchainRecords.length,
    verified: blockchainRecords.filter(r => r.isVerified).length,
    chains: new Set(blockchainRecords.map(r => r.network)).size,
    pedigree: blockchainRecords.filter(r => r.entityType === "Pedigree Certificate").length,
  }), [blockchainRecords]);

  function resolveEntityName(entityType: BlockchainEntityType, entityId: string) {
    if (entityType === "Pedigree Certificate" || entityType === "Health Record" || entityType === "Ownership Transfer" || entityType === "Vaccination Record") {
      const c = cattle.find(x => x.id === entityId);
      return c ? `${c.name} (${entityId})` : entityId;
    }
    if (entityType === "Bull Registration") {
      const br = bullRegistrations.find(x => x.id === entityId);
      return br ? `${br.regNo} (${br.bullId})` : entityId;
    }
    return entityId;
  }

  function simulateVerify(id: string) {
    setVerifyingId(id);
    setTimeout(() => {
      update("blockchainRecords", id, { isVerified: true, verifiedAt: "2026-06-23T07:30:00" });
      setVerifyingId(null);
    }, 1800);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blockchain Pedigree Registry"
        description="Immutable on-chain records for pedigrees, registrations, ownership transfers, and health certificates"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Records" value={String(stats.total)} iconName="link" tone="blue" />
        <StatCard label="Verified On-Chain" value={String(stats.verified)} sublabel={`${stats.total - stats.verified} pending`} iconName="shield" tone="green" />
        <StatCard label="Active Networks" value={String(stats.chains)} sublabel="blockchain nodes" iconName="wifi" tone="purple" />
        <StatCard label="Pedigree Certs" value={String(stats.pedigree)} iconName="dna" tone="green" />
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <Icon.link width={18} height={18} className="mt-0.5 shrink-0 text-sky-600" />
          <div>
            <p className="text-sm font-semibold text-sky-900">Tamper-proof livestock records</p>
            <p className="mt-0.5 text-xs text-sky-700">
              Each record is hashed and anchored to a blockchain block. The chain hash links every record to its predecessor,
              making retroactive tampering cryptographically detectable. Pedigree certificates, bull registrations, and
              ownership transfers can be independently verified by third parties using the transaction ID.
            </p>
          </div>
        </div>
      </div>

      {/* Network status strip */}
      <div className="grid grid-cols-3 gap-3">
        {(["AgriChain", "LivestockLedger", "HerdChain"] as BlockchainNetwork[]).map(net => {
          const count = blockchainRecords.filter(r => r.network === net).length;
          const latest = blockchainRecords.filter(r => r.network === net).sort((a, b) => b.blockNumber - a.blockNumber)[0];
          return (
            <Card key={net} className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{net}</span>
                <Badge tone={NET_TONE[net]}>Connected</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                {count} records · Latest block #{latest?.blockNumber.toLocaleString() ?? "—"}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value as BlockchainEntityType | "")}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
          <option value="">All Types</option>
          {(["Pedigree Certificate","Health Record","Ownership Transfer","Bull Registration","Vaccination Record"] as BlockchainEntityType[]).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={netFilter} onChange={e => setNetFilter(e.target.value as BlockchainNetwork | "")}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
          <option value="">All Networks</option>
          {(["AgriChain","LivestockLedger","HerdChain"] as BlockchainNetwork[]).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value as typeof verifiedFilter)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
          <option value="">All Status</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <span className="ml-auto text-xs text-muted">{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Entity</Th>
              <Th>Block #</Th>
              <Th>Network</Th>
              <Th>Block Hash</Th>
              <Th>Data Hash</Th>
              <Th>Timestamp</Th>
              <Th>Verified</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={9} label="No blockchain records match the selected filter." />}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-canvas/60 transition">
                <Td><Badge tone={ENTITY_TONE[r.entityType]}>{r.entityType}</Badge></Td>
                <Td>
                  <span className="text-sm font-medium">{resolveEntityName(r.entityType, r.entityId)}</span>
                </Td>
                <Td><span className="font-mono text-sm font-semibold text-brand-700">#{r.blockNumber.toLocaleString()}</span></Td>
                <Td><Badge tone={NET_TONE[r.network]}>{r.network}</Badge></Td>
                <Td>
                  <span className="font-mono text-xs text-muted" title={r.blockHash}>{shortHash(r.blockHash)}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-muted" title={r.dataHash}>{shortHash(r.dataHash)}</span>
                </Td>
                <Td className="text-xs text-muted">{r.timestamp.replace("T", " ").slice(0, 16)}</Td>
                <Td>
                  {r.isVerified
                    ? <Badge tone="green">✓ Verified</Badge>
                    : <Badge tone="amber">Pending</Badge>}
                </Td>
                <Td className="text-right">
                  {!r.isVerified && (
                    <button
                      onClick={() => simulateVerify(r.id)}
                      disabled={verifyingId === r.id}
                      className="rounded px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50">
                      {verifyingId === r.id ? "Verifying…" : "Verify"}
                    </button>
                  )}
                  {r.isVerified && r.verifiedAt && (
                    <span className="text-[11px] text-muted">
                      {r.verifiedAt.slice(0, 10)}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
