"use client";

import { useState, useMemo } from "react";
import { PageHeader, Card, Badge, CardHeader, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useData } from "@/lib/store";
import { muzzlePrints as allMuzzlePrints } from "@/lib/data";
import { formatDate } from "@/lib/format";

type ScanMode = "qr" | "rfid" | "tag";

function MuzzleSvg({ seed, size = 80 }: { seed: string; size?: number }) {
  const hash = seed.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const dots: { cx: number; cy: number; r: number }[] = [];
  for (let i = 0; i < 28; i++) {
    const h = Math.abs((hash * (i + 1) * 2654435761) | 0);
    dots.push({ cx: 8 + (h % 64), cy: 8 + ((h >> 8) % 44), r: 1 + (h % 3) });
  }
  return (
    <svg width={size} height={size} viewBox="0 0 80 60" className="rounded-lg border border-line bg-canvas">
      <ellipse cx="40" cy="30" rx="32" ry="24" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
      <ellipse cx="28" cy="26" rx="8" ry="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
      <ellipse cx="52" cy="26" rx="8" ry="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
      {dots.map((d, i) => <circle key={i} {...d} fill="#475569" opacity={0.6 + (i % 4) * 0.1} />)}
    </svg>
  );
}

function QrSvg({ value, size = 96 }: { value: string; size?: number }) {
  const cells = 17;
  const hash = value.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (__, c) => {
      if (r < 3 && c < 3) return true;
      if (r < 3 && c >= cells - 3) return true;
      if (r >= cells - 3 && c < 3) return true;
      const h = Math.abs((hash * (r * cells + c + 1) * 2654435761) | 0);
      return !!(h & 1);
    })
  );
  const cell = size / cells;
  return (
    <svg width={size} height={size} className="rounded border border-line bg-white">
      {grid.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0f172a" /> : null
        )
      )}
    </svg>
  );
}

export default function QrScannerPage() {
  const { cattle, collarReadings } = useData();
  const muzzlePrints = allMuzzlePrints;
  const [mode, setMode] = useState<ScanMode>("qr");
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const animal = useMemo(() => {
    if (!result) return null;
    return cattle.find(c =>
      c.id === result ||
      c.rfidTag === result ||
      c.name.toLowerCase() === result.toLowerCase()
    ) ?? null;
  }, [result, cattle]);

  const muzzlePrint = useMemo(() => animal ? muzzlePrints.find((m: typeof muzzlePrints[number]) => m.cattleId === animal.id) : null, [animal, muzzlePrints]);
  const collar = useMemo(() => animal ? collarReadings.find(cr => cr.cattleId === animal.id) : null, [animal, collarReadings]);

  function simulateScan() {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      const active = cattle.filter(c => c.rfidTag);
      const pick = active[Math.abs(("scan" + Date.now()).split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)) % active.length];
      setResult(pick?.id ?? "");
      setScanning(false);
    }, 2200);
  }

  function lookup() {
    const q = query.trim();
    if (!q) return;
    setResult(q);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="QR Code & RFID Scanner" description="Identify animals by QR code scan, RFID tag read, or cattle tag lookup" />

      {/* Mode selector */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface p-1 w-fit">
        {([["qr", "QR Code Camera"], ["rfid", "RFID Reader"], ["tag", "Tag / Name Lookup"]] as [ScanMode, string][]).map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setResult(null); setQuery(""); }}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${mode === m ? "bg-brand-600 text-white" : "text-muted hover:bg-canvas"}`}>
            {m === "qr" && <Icon.qrcode width={15} height={15} />}
            {m === "rfid" && <Icon.wifi width={15} height={15} />}
            {m === "tag" && <Icon.search width={15} height={15} />}
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner panel */}
        <Card>
          <CardHeader title={mode === "qr" ? "Camera QR Scan" : mode === "rfid" ? "RFID Reader" : "Tag / Name Lookup"} />
          <div className="p-5 space-y-4">
            {(mode === "qr" || mode === "rfid") && (
              <>
                {/* Simulated viewfinder */}
                <div className="relative mx-auto h-56 w-full max-w-xs overflow-hidden rounded-xl bg-slate-900">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {scanning ? (
                      <div className="flex flex-col items-center gap-2 text-white">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-400 border-t-transparent" />
                        <p className="text-sm">{mode === "qr" ? "Scanning QR code…" : "Reading RFID tag…"}</p>
                      </div>
                    ) : result && animal ? (
                      <div className="flex flex-col items-center gap-1 text-white">
                        <div className="text-3xl">✓</div>
                        <p className="text-sm font-semibold">{animal.name}</p>
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center">
                        {/* Scanner crosshair */}
                        <div className="h-36 w-36 rounded border-2 border-brand-400">
                          <div className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-brand-400 rounded-tl" />
                          <div className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-brand-400 rounded-tr" />
                          <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-brand-400 rounded-bl" />
                          <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-brand-400 rounded-br" />
                          <div className="absolute left-0 right-0 top-1/2 h-px bg-red-400 opacity-70" />
                        </div>
                        <p className="absolute bottom-2 text-xs text-slate-400">
                          {mode === "qr" ? "Position QR code in frame" : "Bring RFID tag close to reader"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={simulateScan} disabled={scanning}
                  className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition">
                  {scanning ? "Scanning…" : mode === "qr" ? "Simulate QR Scan" : "Simulate RFID Read"}
                </button>
              </>
            )}

            {mode === "tag" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && lookup()}
                    placeholder="Enter tag ID (C-1001), RFID, or name…"
                    className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                  />
                  <button onClick={lookup} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                    Lookup
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-line">
                  {cattle.filter(c => !query || c.id.toLowerCase().includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase()) || (c.rfidTag ?? "").includes(query)).slice(0, 8).map(c => (
                    <button key={c.id} onClick={() => setResult(c.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-canvas transition border-b border-line last:border-0">
                      <div>
                        <p className="text-sm font-medium text-ink">{c.name}</p>
                        <p className="font-mono text-xs text-muted">{c.id} · {c.rfidTag ?? "No RFID"}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Result panel */}
        <div className="space-y-4">
          {!animal && !result && (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <Icon.qrcode width={40} height={40} className="mb-3 text-muted/40" />
              <p className="text-sm text-muted">Scan or look up an animal to see its profile here.</p>
            </Card>
          )}

          {result && !animal && (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-red-600">No animal found for &quot;{result}&quot;</p>
              <p className="mt-1 text-xs text-muted">Check the tag ID, RFID, or name and try again.</p>
            </Card>
          )}

          {animal && (
            <>
              <Card>
                <CardHeader title="Animal Profile" />
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <MuzzleSvg seed={animal.id} size={80} />
                    <div>
                      <h2 className="text-xl font-bold text-ink">{animal.name}</h2>
                      <p className="font-mono text-sm text-muted">{animal.id}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusBadge status={animal.status} />
                        <Badge tone="gray">{animal.class}</Badge>
                        <Badge tone="blue">{animal.breed}</Badge>
                      </div>
                    </div>
                    <div className="ml-auto">
                      <QrSvg value={animal.id} size={80} />
                      <p className="mt-1 text-center text-[10px] text-muted">QR Code</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-canvas p-3">
                      <p className="text-xs text-muted">Date of Birth</p>
                      <p className="font-medium">{formatDate(animal.dob)}</p>
                    </div>
                    <div className="rounded-lg bg-canvas p-3">
                      <p className="text-xs text-muted">Weight</p>
                      <p className="font-medium">{animal.weightKg} kg</p>
                    </div>
                    <div className="rounded-lg bg-canvas p-3">
                      <p className="text-xs text-muted">Pasture</p>
                      <p className="font-medium">{animal.pasture}</p>
                    </div>
                    <div className="rounded-lg bg-canvas p-3">
                      <p className="text-xs text-muted">Health</p>
                      <StatusBadge status={animal.health} />
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Identification Tags" />
                <div className="divide-y divide-line">
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs font-medium text-muted uppercase tracking-wider">Ear Tag</span>
                    <span className="font-mono text-sm font-semibold text-ink">{animal.id}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs font-medium text-muted uppercase tracking-wider">RFID (ISO 11784 EID)</span>
                    <span className="font-mono text-sm text-ink">{animal.rfidTag ?? <span className="text-muted/40">Not fitted</span>}</span>
                  </div>
                  {muzzlePrint && (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs font-medium text-muted uppercase tracking-wider">Muzzle Print Hash</span>
                      <span className="font-mono text-xs text-ink">{muzzlePrint.printHash}</span>
                    </div>
                  )}
                  {animal.gpsLat && (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs font-medium text-muted uppercase tracking-wider">GPS Location</span>
                      <span className="font-mono text-xs text-ink">{animal.gpsLat.toFixed(4)}, {animal.gpsLng?.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {collar && (
                <Card>
                  <CardHeader title="Live Collar Sensor Data" />
                  <div className="grid grid-cols-3 gap-px bg-line">
                    {[
                      { label: "Temperature", value: `${collar.temperature.toFixed(1)} °C` },
                      { label: "Activity", value: `${collar.activityIndex}/100` },
                      { label: "Battery", value: `${collar.batteryPct}%` },
                      ...(collar.heartRate ? [{ label: "Heart Rate", value: `${collar.heartRate} bpm` }] : []),
                      ...(collar.ruminationMinPh !== undefined ? [{ label: "Rumination", value: `${collar.ruminationMinPh} min/h` }] : []),
                      { label: "Status", value: collar.isOnline ? "Online ●" : "Offline ○" },
                    ].map(item => (
                      <div key={item.label} className="bg-surface px-4 py-3 text-center">
                        <p className="text-[10px] text-muted">{item.label}</p>
                        <p className={`text-sm font-semibold ${item.label === "Status" ? (collar.isOnline ? "text-emerald-600" : "text-slate-400") : "text-ink"}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
