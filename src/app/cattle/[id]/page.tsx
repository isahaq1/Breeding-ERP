"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Table, Th, Td, StatusBadge, Badge, EmptyRow } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LineChart } from "@/components/charts";
import {
  Modal,
  FormGrid,
  FormButtons,
  NumberField,
  DateField,
  TextField,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { formatDate, ageFrom } from "@/lib/format";
import { classTone, cattleLabel as staticCattleLabel, muzzlePrints as seedMuzzlePrints } from "@/lib/data";
import type { Farm } from "@/lib/types";

// ── QR Code SVG (deterministic, realistic-looking) ──────────────────────────

function QRCode({ value, size = 140 }: { value: string; size?: number }) {
  const DIM = 21;
  const QUIET = 2; // quiet-zone modules each side
  const TOTAL = DIM + QUIET * 2;
  const M = size / TOTAL;

  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;

  const grid: boolean[][] = Array.from({ length: DIM }, () => Array(DIM).fill(false));

  function finder(tr: number, tc: number) {
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const outer = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (tr + r < DIM && tc + c < DIM) grid[tr + r][tc + c] = outer || inner;
      }
  }
  finder(0, 0); finder(0, 14); finder(14, 0);

  for (let i = 8; i <= 12; i++) { grid[6][i] = i % 2 === 0; grid[i][6] = i % 2 === 0; }

  function reserved(r: number, c: number) {
    if (r < 8 && c < 8) return true;
    if (r < 8 && c >= 13) return true;
    if (r >= 13 && c < 8) return true;
    if (r === 6 || c === 6) return true;
    return false;
  }

  let seed = h;
  for (let r = 0; r < DIM; r++)
    for (let c = 0; c < DIM; c++) {
      if (reserved(r, c)) continue;
      seed = ((seed * 1664525) + 1013904223) >>> 0;
      grid[r][c] = ((seed >>> 16) & 1) === 1;
    }

  const rects: { x: number; y: number }[] = [];
  for (let r = 0; r < DIM; r++)
    for (let c = 0; c < DIM; c++)
      if (grid[r][c]) rects.push({ x: (c + QUIET) * M, y: (r + QUIET) * M });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" />
      {rects.map(({ x, y }, i) => (
        <rect key={i} x={x} y={y} width={M} height={M} fill="black" />
      ))}
    </svg>
  );
}

// ── Muzzle Print SVG ─────────────────────────────────────────────────────────

function MuzzleSVG({ printHash, size = 130 }: { printHash?: string; size?: number }) {
  const seed = printHash
    ? printHash.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
    : 42;
  const r = (i: number, range: number, base: number) =>
    base + ((seed * (i + 3)) % range) - range / 2;

  return (
    <svg viewBox="0 0 200 162" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <pattern id={`gp${seed}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0L0 0 0 10" fill="none" stroke="#dcfce7" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="162" rx="10" fill={`url(#gp${seed})`} />
      {["M12 12 h18 M12 12 v18","M188 12 h-18 M188 12 v18","M12 150 h18 M12 150 v-18","M188 150 h-18 M188 150 v-18"].map((d,i)=>(
        <path key={i} d={d} stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
      ))}
      <ellipse cx="100" cy="90" rx="74" ry="56" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2"/>
      <ellipse cx="72" cy="87" rx="19" ry="14" fill="white" stroke="#15803d" strokeWidth="1.5"/>
      <ellipse cx="72" cy="89" rx="13" ry="9" fill="#dcfce7"/>
      <ellipse cx="128" cy="87" rx="19" ry="14" fill="white" stroke="#15803d" strokeWidth="1.5"/>
      <ellipse cx="128" cy="89" rx="13" ry="9" fill="#dcfce7"/>
      {[68,77,86,95,104].map((y,i)=>(
        <path key={`l${i}`} d={`M${28+r(i,6,0)} ${y+r(i,4,0)} Q${42+r(i,5,0)} ${y-5+r(i,4,0)} ${53+r(i,4,0)} ${y+r(i,3,0)}`}
          stroke="#15803d" strokeWidth="1.1" fill="none" opacity="0.65"/>
      ))}
      {[68,77,86,95,104].map((y,i)=>(
        <path key={`r${i}`} d={`M${147+r(i+5,4,0)} ${y+r(i+5,4,0)} Q${158+r(i+5,5,0)} ${y-5+r(i+5,3,0)} ${172+r(i+5,4,0)} ${y+r(i+5,3,0)}`}
          stroke="#15803d" strokeWidth="1.1" fill="none" opacity="0.65"/>
      ))}
      {[116,126,135].map((y,i)=>(
        <path key={`b${i}`} d={`M${58+r(i+10,4,0)} ${y} Q100 ${y+8+r(i+10,5,0)} ${142+r(i+10,4,0)} ${y}`}
          stroke="#15803d" strokeWidth="1.1" fill="none" opacity="0.65"/>
      ))}
      {[84,91].map((y,i)=>(
        <path key={`m${i}`} d={`M${91+r(i+15,3,0)} ${y} Q100 ${y-4} ${109+r(i+15,3,0)} ${y}`}
          stroke="#15803d" strokeWidth="0.9" fill="none" opacity="0.6"/>
      ))}
      {[[38,74],[32,86],[39,100],[162,74],[168,86],[161,100],[100,72]].map(([cx,cy],i)=>(
        <circle key={`d${i}`} cx={cx+r(i+20,4,0)} cy={cy} r="2.2" fill="#15803d" opacity="0.6"/>
      ))}
      <line x1="12" y1="90" x2="188" y2="90" stroke="#4ade80" strokeWidth="0.8" opacity="0.45" strokeDasharray="4 4"/>
      {printHash && (
        <text x="100" y="154" textAnchor="middle" fontSize="8.5" fill="#15803d" fontFamily="monospace" letterSpacing="0.5">
          {printHash}
        </text>
      )}
    </svg>
  );
}

// ── GPS Map (shows animal dot relative to farm bbox) ─────────────────────────

const ZONE_PALETTE = [
  { fill: "#f0fdf4", stroke: "#86efac", tc: "#15803d" },
  { fill: "#eff6ff", stroke: "#93c5fd", tc: "#1d4ed8" },
  { fill: "#fefce8", stroke: "#fde047", tc: "#92400e" },
  { fill: "#fdf4ff", stroke: "#e9d5ff", tc: "#7c3aed" },
];

function GPSMapCard({ lat, lng, name, farms }: { lat: number; lng: number; name: string; farms: Farm[] }) {
  const W = 300, H = 160;
  const activeFarms = farms.filter(f => f.location?.latitude != null && f.location?.longitude != null);

  // BBOX derived from farm centres + this animal's position
  const PAD = 0.015;
  const allLats = [...activeFarms.map(f => f.location.latitude), lat];
  const allLngs = [...activeFarms.map(f => f.location.longitude), lng];
  const BBOX = {
    minLat: Math.min(...allLats) - PAD,
    maxLat: Math.max(...allLats) + PAD,
    minLng: Math.min(...allLngs) - PAD,
    maxLng: Math.max(...allLngs) + PAD,
  };
  const toX = (v: number) => ((v - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * W;
  const toY = (v: number) => ((BBOX.maxLat - v) / (BBOX.maxLat - BBOX.minLat)) * H;

  // Zone rect: square centred on farm.location, sized from totalAreaHa
  function zoneRect(farm: Farm) {
    const { latitude: flat, longitude: flng } = farm.location;
    const side = Math.sqrt(farm.totalAreaHa * 10_000);
    const halfLat = side / 2 / 111_000;
    const halfLng = side / 2 / (111_000 * Math.cos(flat * Math.PI / 180));
    const x = toX(flng - halfLng), y = toY(flat + halfLat);
    return { x, y, w: toX(flng + halfLng) - x, h: toY(flat - halfLat) - y };
  }

  const ax = toX(lng), ay = toY(lat);

  return (
    <div className="p-5">
      <div className="overflow-hidden rounded-lg border border-line bg-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
          <rect width={W} height={H} fill="#f8fafc" />
          {activeFarms.map((farm, i) => {
            const { x, y, w, h } = zoneRect(farm);
            const pal = ZONE_PALETTE[i % ZONE_PALETTE.length];
            return (
              <g key={farm.id}>
                <rect x={x} y={y} width={w} height={h} rx="3" fill={pal.fill} stroke={pal.stroke} strokeWidth="1.5" />
                <text x={x + w / 2} y={y + h / 2 + 3} fontSize="7" fill={pal.tc} textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">{farm.name}</text>
              </g>
            );
          })}
          <circle cx={ax} cy={ay} r="10" fill="#16a34a" opacity="0.15" />
          <circle cx={ax} cy={ay} r="5"  fill="#16a34a" />
          <text x={ax} y={ay - 12} fontSize="8.5" fill="#15803d" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">{name}</text>
          <text x={W - 6} y={H - 4} fontSize="7" fill="#9ca3af" textAnchor="end" fontFamily="monospace">WGS-84</text>
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-line bg-canvas px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Latitude</p>
          <p className="font-mono font-semibold text-ink">{lat.toFixed(4)}°</p>
        </div>
        <div className="rounded-lg border border-line bg-canvas px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Longitude</p>
          <p className="font-mono font-semibold text-ink">{lng.toFixed(4)}°</p>
        </div>
      </div>
    </div>
  );
}

// ── Weight Log section (uses store for user-added records) ────────────────────

const WEIGHT_MONTHS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];

function WeightSection({ cattleId }: { cattleId: string }) {
  const { weightRecords, addWeightRecord } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "2026-06-07", weightKg: "", recordedBy: "", notes: "" });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const records = useMemo(
    () => [...weightRecords.filter(w => w.cattleId === cattleId)]
      .sort((a, b) => a.date.localeCompare(b.date)),
    [weightRecords, cattleId],
  );

  const chartData = useMemo(() => {
    if (records.length === 0) return [];
    const last12 = records.slice(-12);
    return last12.map((w, i) => ({
      label: WEIGHT_MONTHS[i % 12],
      value: w.weightKg,
    }));
  }, [records]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addWeightRecord({
      cattleId,
      date: form.date,
      weightKg: Number(form.weightKg),
      recordedBy: form.recordedBy.trim(),
      notes: form.notes.trim() || undefined,
    });
    setForm({ date: "2026-06-07", weightKg: "", recordedBy: "", notes: "" });
    setOpen(false);
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Weight History"
          action={
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Icon.plus width={13} height={13} /> Log Weight
            </button>
          }
        />
        {chartData.length > 0 ? (
          <div className="p-5">
            <LineChart
              data={chartData}
              valueFormat={n => `${n} kg`}
              height={160}
            />
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">No weight records yet.</p>
        )}
        {records.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Weight (kg)</Th>
                <Th>Recorded By</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {[...records].reverse().slice(0, 6).map(w => (
                <tr key={w.id}>
                  <Td>{formatDate(w.date)}</Td>
                  <Td className="font-semibold text-ink">{w.weightKg} kg</Td>
                  <Td className="text-muted">{w.recordedBy}</Td>
                  <Td className="text-muted">{w.notes ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Weight" description="Record a new weight measurement.">
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <DateField label="Date" value={form.date} onChange={set("date")} required />
            <NumberField label="Weight (kg)" value={form.weightKg} onChange={set("weightKg")} required min={0} placeholder="e.g. 640" />
            <TextField label="Recorded By" value={form.recordedBy} onChange={set("recordedBy")} required placeholder="Name" />
          </FormGrid>
          <TextField label="Notes" value={form.notes} onChange={set("notes")} placeholder="Optional…" />
          <FormButtons onCancel={() => setOpen(false)} submitLabel="Save Weight" />
        </form>
      </Modal>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CattleDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const router = useRouter();
  const { cattle, farms, breedingRecords, birthRecords, vaccinations, healthRecords, remove } = useData();

  const animal = cattle.find(c => c.id === id);

  if (!animal) {
    router.replace("/cattle");
    return null;
  }

  const farm = farms.find(f => f.id === animal.farmId);
  const muzzlePrint = seedMuzzlePrints.find(p => p.cattleId === id);
  const offspring = cattle.filter(c => c.damId === id || c.sireId === id);
  const fullSiblings = animal.damId && animal.sireId
    ? cattle.filter(c => c.id !== id && c.damId === animal.damId && c.sireId === animal.sireId)
    : [];
  const maternalHalf = animal.damId
    ? cattle.filter(c => c.id !== id && c.damId === animal.damId && c.sireId !== animal.sireId)
    : [];
  const paternalHalf = animal.sireId
    ? cattle.filter(c => c.id !== id && c.sireId === animal.sireId && c.damId !== animal.damId)
    : [];
  const animalBirths   = birthRecords.filter(b => b.calfId === id);
  const animalBreedings= breedingRecords.filter(b => b.damId === id || b.sireId === id);
  const animalVax      = vaccinations.filter(v => v.cattleId === id);
  const animalHealth   = healthRecords.filter(h => h.cattleId === id);

  return (
    <>
      {/* Back */}
      <Link href="/cattle" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon.swap width={16} height={16} /> Back to Registry
      </Link>

      {/* Hero */}
      <div className="mb-6 rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <Icon.cow width={34} height={34} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">{animal.name}</h1>
              <p className="mt-0.5 text-sm text-muted">
                {animal.breed} · <Badge tone={classTone(animal.class)}>{animal.class}</Badge>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={animal.status} />
                <StatusBadge status={animal.health} />
                {farm && <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line">{farm.name}</span>}
              </div>
            </div>
          </div>

          {/* RFID + QR + Muzzle */}
          <div className="flex flex-wrap items-start gap-5">
            {/* RFID */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">RFID Ear Tag</p>
              {animal.rfidTag ? (
                <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                  <span className="font-mono text-sm font-semibold tracking-widest text-brand-800">{animal.rfidTag}</span>
                </div>
              ) : (
                <span className="text-sm text-muted">Not tagged</span>
              )}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">ERP Tag</p>
              <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
                <span className="font-mono text-sm font-semibold text-ink">{animal.id}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">QR Tag</p>
              <div className="overflow-hidden rounded-lg border border-line bg-white p-1.5 shadow-sm">
                <QRCode value={`herdline:cattle:${animal.id}`} size={120} />
              </div>
              <p className="text-[10px] text-muted">Scan to open profile</p>
            </div>

            {/* Muzzle Print */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Muzzle Print</p>
              {muzzlePrint ? (
                <>
                  <div className="overflow-hidden rounded-lg border border-line shadow-sm">
                    <MuzzleSVG printHash={muzzlePrint.printHash} size={120} />
                  </div>
                  <Badge tone={muzzlePrint.quality === "High" ? "green" : muzzlePrint.quality === "Medium" ? "amber" : "red"}>
                    {muzzlePrint.quality} Quality
                  </Badge>
                </>
              ) : (
                <div className="grid h-[120px] w-[120px] place-items-center rounded-lg border border-dashed border-line bg-canvas">
                  <p className="text-center text-[10px] text-muted">Not registered</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile + GPS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Profile" />
          <dl className="divide-y divide-line">
            {([
              ["Breed",       animal.breed],
              ["Class",       animal.class],
              ["Date of Birth", formatDate(animal.dob)],
              ["Age",         ageFrom(animal.dob)],
              ["Current Weight", `${animal.weightKg} kg`],
              ["Pasture",     animal.pasture],
              ["Farm",        farm?.name ?? "—"],
              ["Acquisition", animal.acquisition],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-2.5">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-sm font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="GPS Location" />
          {animal.gpsLat && animal.gpsLng ? (
            <GPSMapCard lat={animal.gpsLat} lng={animal.gpsLng} name={animal.name} farms={farms} />
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">No GPS data recorded.</p>
          )}
        </Card>
      </div>

      {/* Weight history */}
      <div className="mt-6">
        <WeightSection cattleId={id} />
      </div>

      {/* Lineage */}
      <div className="mt-6">
        <Card>
          <CardHeader title="Lineage & Genetics" />
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-canvas px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">Dam (Mother)</p>
                {animal.damId ? (
                  <Link href={`/cattle/${animal.damId}`} className="text-sm font-semibold text-brand-700 hover:underline">
                    {staticCattleLabel(animal.damId)}
                  </Link>
                ) : <span className="text-sm text-muted">Unknown</span>}
              </div>
              <div className="rounded-lg border border-line bg-canvas px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">Sire (Father)</p>
                {animal.sireId ? (
                  <Link href={`/cattle/${animal.sireId}`} className="text-sm font-semibold text-brand-700 hover:underline">
                    {staticCattleLabel(animal.sireId)}
                  </Link>
                ) : <span className="text-sm text-muted">Unknown</span>}
              </div>
            </div>

            {offspring.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Offspring ({offspring.length})</p>
                <div className="flex flex-wrap gap-2">
                  {offspring.map(o => (
                    <Link key={o.id} href={`/cattle/${o.id}`}
                      className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:border-brand-300 hover:text-brand-700">
                      {o.name} ({o.id})
                    </Link>
                  ))}
                </div>
              </>
            )}

            {(fullSiblings.length > 0 || maternalHalf.length > 0 || paternalHalf.length > 0) && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Siblings</p>
                {fullSiblings.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-muted">Full siblings — same dam &amp; sire</p>
                    <div className="flex flex-wrap gap-2">
                      {fullSiblings.map(s => (
                        <Link key={s.id} href={`/cattle/${s.id}`}
                          className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:border-brand-400">
                          {s.name} ({s.id})
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {maternalHalf.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-muted">Maternal half-siblings</p>
                    <div className="flex flex-wrap gap-2">
                      {maternalHalf.map(s => (
                        <Link key={s.id} href={`/cattle/${s.id}`}
                          className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:text-brand-700">
                          {s.name} ({s.id})
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {paternalHalf.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-muted">Paternal half-siblings</p>
                    <div className="flex flex-wrap gap-2">
                      {paternalHalf.map(s => (
                        <Link key={s.id} href={`/cattle/${s.id}`}
                          className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:text-brand-700">
                          {s.name} ({s.id})
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Records grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Breeding History" />
          <Table>
            <thead><tr><Th>Date</Th><Th>Partner</Th><Th>Method</Th><Th>Result</Th></tr></thead>
            <tbody>
              {animalBreedings.length === 0 && <EmptyRow colSpan={4} label="No breeding records." />}
              {animalBreedings.map(b => (
                <tr key={b.id}>
                  <Td>{formatDate(b.serviceDate)}</Td>
                  <Td className="text-muted">{staticCattleLabel(b.damId === id ? b.sireId : b.damId)}</Td>
                  <Td className="text-muted">{b.method}</Td>
                  <Td><StatusBadge status={b.result} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Birth Record" />
          <Table>
            <thead><tr><Th>Born</Th><Th>Weight</Th><Th>Calving</Th><Th>Outcome</Th></tr></thead>
            <tbody>
              {animalBirths.length === 0 && <EmptyRow colSpan={4} label="No birth record on file." />}
              {animalBirths.map(b => (
                <tr key={b.id}>
                  <Td>{formatDate(b.birthDate)}</Td>
                  <Td className="text-muted">{b.birthWeightKg} kg</Td>
                  <Td><Badge tone="gray">{b.calvingEase}</Badge></Td>
                  <Td><StatusBadge status={b.outcome} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Vaccinations" />
          <Table>
            <thead><tr><Th>Vaccine</Th><Th>Date</Th><Th>Next Due</Th><Th>Status</Th></tr></thead>
            <tbody>
              {animalVax.length === 0 && <EmptyRow colSpan={4} label="No vaccinations recorded." />}
              {animalVax.map(v => (
                <tr key={v.id}>
                  <Td className="font-medium">{v.vaccine}</Td>
                  <Td>{formatDate(v.date)}</Td>
                  <Td className="text-muted">{formatDate(v.nextDue)}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Health Events" />
          <Table>
            <thead><tr><Th>Date</Th><Th>Type</Th><Th>Diagnosis</Th><Th>Status</Th></tr></thead>
            <tbody>
              {animalHealth.length === 0 && <EmptyRow colSpan={4} label="No health events recorded." />}
              {animalHealth.map(h => (
                <tr key={h.id}>
                  <Td>{formatDate(h.date)}</Td>
                  <Td><Badge tone="gray">{h.type}</Badge></Td>
                  <Td className="text-muted">{h.diagnosis}</Td>
                  <Td><StatusBadge status={h.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      {/* Danger zone */}
      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="mb-2 text-sm font-semibold text-red-700">Danger Zone</p>
        <p className="mb-4 text-sm text-red-600">Permanently remove this animal from the registry. This cannot be undone.</p>
        <button
          onClick={() => { remove("cattle", id); router.push("/cattle"); }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete Animal
        </button>
      </div>
    </>
  );
}
