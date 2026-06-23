"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Card, Table, Th, Td, StatusBadge, PrimaryButton, EmptyRow, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  Modal,
  FormGrid,
  FormButtons,
  TextField,
  NumberField,
  DateField,
  SelectField,
  TextAreaField,
  RowActions,
} from "@/components/forms";
import { useData } from "@/lib/store";
import { CATTLE_CLASSES, canBeDam, canBeSire, classTone } from "@/lib/data";
import type { Cattle, Farm } from "@/lib/types";
import { ageFrom, number } from "@/lib/format";
type CattleType = Cattle;
type FarmType = Farm;

// ── GPS Farm Map ─────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  Lactating: "#16a34a", Pregnant: "#2563eb", Active: "#16a34a",
  Dry: "#d97706", Calf: "#9333ea", Sold: "#6b7280",
};
function dotColor(status: string, health: string) {
  if (health === "Quarantine" || health === "Critical") return "#dc2626";
  return STATUS_DOT[status] ?? "#6b7280";
}

const ZONE_PALETTE = [
  { fill: "#f0fdf4", stroke: "#4ade80", dark: "#15803d" },
  { fill: "#eff6ff", stroke: "#60a5fa", dark: "#1d4ed8" },
  { fill: "#fef9c3", stroke: "#fbbf24", dark: "#b45309" },
  { fill: "#fdf4ff", stroke: "#c084fc", dark: "#7e22ce" },
];

const STATUS_LEGEND = [
  { label: "Active / Lactating", short: "Active",   color: "#16a34a", statuses: ["Active", "Lactating"] },
  { label: "Pregnant",           short: "Pregnant", color: "#2563eb", statuses: ["Pregnant"] },
  { label: "Dry",                short: "Dry",      color: "#d97706", statuses: ["Dry"] },
  { label: "Calf",               short: "Calf",     color: "#9333ea", statuses: ["Calf"] },
  { label: "Quarantine/Critical",short: "Critical", color: "#dc2626", statuses: ["Quarantine", "Critical"] },
];

function GpsMapView({ cattle, farms }: { cattle: CattleType[]; farms: FarmType[] }) {
  const router = useRouter();
  const svgRef  = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const vbRef   = useRef({ x: 0, y: 0, z: 1 });

  const [vb, setVbState]       = useState({ x: 0, y: 0, z: 1 });
  const [dragging, setDragging] = useState(false);
  const [selFarm, setSelFarm]   = useState<string | null>(null);
  const [hiddenSt, setHiddenSt] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip]   = useState<{ c: CattleType; sx: number; sy: number } | null>(null);
  const [cursor, setCursor]     = useState<{ lat: number; lng: number } | null>(null);
  const [hovFarm, setHovFarm]   = useState<string | null>(null);

  const W = 800, H = 520;

  const located     = cattle.filter(c => c.gpsLat != null && c.gpsLng != null);
  const activeFarms = farms.filter(f => f.location?.latitude != null && f.location?.longitude != null);

  // Live BBOX from farm centres + cattle positions
  const PAD = 0.015;
  const allLats = [...activeFarms.map(f => f.location.latitude), ...located.map(c => c.gpsLat!)];
  const allLngs = [...activeFarms.map(f => f.location.longitude), ...located.map(c => c.gpsLng!)];
  const BBOX = allLats.length
    ? { minLat: Math.min(...allLats) - PAD, maxLat: Math.max(...allLats) + PAD,
        minLng: Math.min(...allLngs) - PAD, maxLng: Math.max(...allLngs) + PAD }
    : { minLat: -18.06, maxLat: -17.81, minLng: 31.01, maxLng: 31.16 };

  const toX   = (v: number) => ((v - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * W;
  const toY   = (v: number) => ((BBOX.maxLat - v)  / (BBOX.maxLat - BBOX.minLat)) * H;
  const toLng = (x: number) => BBOX.minLng + (x / W) * (BBOX.maxLng - BBOX.minLng);
  const toLat = (y: number) => BBOX.maxLat - (y / H) * (BBOX.maxLat - BBOX.minLat);

  function zoneRect(farm: FarmType) {
    const { latitude: lat, longitude: lng } = farm.location;
    const side    = Math.sqrt(farm.totalAreaHa * 10_000);
    const halfLat = side / 2 / 111_000;
    const halfLng = side / 2 / (111_000 * Math.cos(lat * Math.PI / 180));
    const x = toX(lng - halfLng), y = toY(lat + halfLat);
    return { x, y, w: toX(lng + halfLng) - x, h: toY(lat - halfLat) - y };
  }

  // Filtered / dimmed animals
  const visibleIds = new Set(
    located
      .filter(c => (!selFarm || c.farmId === selFarm) && !hiddenSt.has(c.status) && !hiddenSt.has(c.health))
      .map(c => c.id)
  );

  // Update both the ref (for the non-passive wheel handler) and the state (for rendering)
  function setVb(next: typeof vb) { vbRef.current = next; setVbState(next); }

  // Non-passive wheel listener for zoom-toward-cursor
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.25 : 0.8;
      const rect   = el!.getBoundingClientRect();
      const px = (e.clientX - rect.left)  / rect.width;   // 0–1 relative to SVG element
      const py = (e.clientY - rect.top)   / rect.height;
      const v  = vbRef.current;
      const newZ   = Math.max(1, Math.min(10, v.z * factor));
      const vbW    = W / v.z,   vbH    = H / v.z;
      const newVbW = W / newZ,  newVbH = H / newZ;
      const cx = v.x + px * vbW;   // cursor in SVG space
      const cy = v.y + py * vbH;
      const newX = Math.max(0, Math.min(W - newVbW, cx - px * newVbW));
      const newY = Math.max(0, Math.min(H - newVbH, cy - py * newVbH));
      setVb({ x: newX, y: newY, z: newZ });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: vb.x, oy: vb.y };
    setDragging(true);
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    // Pan while dragging
    if (dragRef.current && svgRef.current) {
      const rect   = svgRef.current.getBoundingClientRect();
      const vbW    = W / vb.z, vbH = H / vb.z;
      const dx     = (dragRef.current.sx - e.clientX) / rect.width  * vbW;
      const dy     = (dragRef.current.sy - e.clientY) / rect.height * vbH;
      setVb({
        ...vb,
        x: Math.max(0, Math.min(W - vbW, dragRef.current.ox + dx)),
        y: Math.max(0, Math.min(H - vbH, dragRef.current.oy + dy)),
      });
    }
    // Track cursor coords for the coordinate readout
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const vbW  = W / vb.z, vbH = H / vb.z;
      const svgX = vb.x + ((e.clientX - rect.left) / rect.width)  * vbW;
      const svgY = vb.y + ((e.clientY - rect.top)  / rect.height) * vbH;
      setCursor({ lat: toLat(svgY), lng: toLng(svgX) });
    }
  }
  function onMouseUp()    { dragRef.current = null; setDragging(false); }
  function onMouseLeave() { dragRef.current = null; setDragging(false); setTooltip(null); setCursor(null); }

  // Convert SVG point → screen px for HTML tooltip
  function svgPtToScreen(svgX: number, svgY: number) {
    if (!svgRef.current) return { sx: 0, sy: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const vbW  = W / vb.z, vbH = H / vb.z;
    return {
      sx: rect.left + ((svgX - vb.x) / vbW) * rect.width,
      sy: rect.top  + ((svgY - vb.y) / vbH) * rect.height,
    };
  }

  // Scale bar: target ~80 px wide, snap to clean km
  const avgLat    = (BBOX.minLat + BBOX.maxLat) / 2;
  const mPerSvgPx = ((BBOX.maxLng - BBOX.minLng) / W) * 111_000 * Math.cos(avgLat * Math.PI / 180);
  const rawKm     = (80 * mPerSvgPx) / (1000 * vb.z);
  const niceKm    = rawKm < 0.5 ? 0.5 : rawKm < 1 ? 1 : rawKm < 2 ? 2 : rawKm < 5 ? 5 : Math.round(rawKm / 5) * 5;
  const barSvgW   = (niceKm * 1000) / mPerSvgPx;  // in SVG user units

  const vbW = W / vb.z, vbH = H / vb.z;

  function toggleStatus(statuses: string[]) {
    setHiddenSt(prev => {
      const next = new Set(prev);
      statuses.some(s => !next.has(s)) ? statuses.forEach(s => next.add(s)) : statuses.forEach(s => next.delete(s));
      return next;
    });
  }

  function zoomAt(factor: number) {
    const v = vbRef.current;
    const newZ   = Math.max(1, Math.min(10, v.z * factor));
    const vbWOld = W / v.z, vbHOld = H / v.z;
    const newVbW = W / newZ, newVbH = H / newZ;
    setVb({ z: newZ,
      x: Math.max(0, Math.min(W - newVbW, v.x + vbWOld/2 - newVbW/2)),
      y: Math.max(0, Math.min(H - newVbH, v.y + vbHOld/2 - newVbH/2)),
    });
  }

  // Per-status counts among visible animals
  const stCounts: Record<string, number> = {};
  located.filter(c => visibleIds.has(c.id)).forEach(c => { stCounts[c.status] = (stCounts[c.status] ?? 0) + 1; });

  return (
    <Card className="overflow-hidden shadow-md">

      {/* ── Top: farm filter tabs ──────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-xs">
        <button onClick={() => setSelFarm(null)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-all ${
            !selFarm ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
          <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70"/>
          All Farms
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${!selFarm ? "bg-white/25" : "bg-slate-100"}`}>
            {located.length}
          </span>
        </button>

        {activeFarms.map((f, i) => {
          const pal   = ZONE_PALETTE[i % ZONE_PALETTE.length];
          const isSel = selFarm === f.id;
          const cnt   = located.filter(c => c.farmId === f.id).length;
          return (
            <button key={f.id}
              onClick={() => setSelFarm(s => s === f.id ? null : f.id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-all"
              style={{
                background: isSel ? pal.dark : undefined,
                color:      isSel ? "white"  : pal.dark,
                boxShadow:  isSel ? "0 1px 4px #0002" : undefined,
                border:     `1.5px solid ${isSel ? pal.dark : pal.stroke}`,
              }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: isSel ? "white" : pal.dark, opacity: 0.8 }}/>
              {f.name}
              <span className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ background: isSel ? "rgba(255,255,255,0.2)" : pal.fill }}>
                {cnt}
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2 text-muted">
          {vb.z > 1 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
              {vb.z.toFixed(1)}×
            </span>
          )}
          {vb.z > 1 && (
            <button onClick={() => setVb({ x: 0, y: 0, z: 1 })}
              className="rounded-lg border border-line px-2 py-1 text-[10px] hover:bg-line">Reset</button>
          )}
        </div>
      </div>

      {/* ── Status count chips ─────────────────────────────────── */}
      {located.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-line/50 bg-slate-50/60 px-3 py-1.5 text-[10px]">
          <span className="shrink-0 font-semibold uppercase tracking-widest text-slate-400">Live</span>
          <span className="inline-block h-3.5 w-px bg-slate-200"/>
          {STATUS_LEGEND.map(({ short, color, statuses }) => {
            const n = statuses.reduce((s, k) => s + (stCounts[k] ?? 0), 0);
            const off = statuses.every(s => hiddenSt.has(s));
            return (
              <button key={short} onClick={() => toggleStatus(statuses)}
                className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-all"
                style={{
                  background: off ? "#f1f5f9" : color + "18",
                  color:      off ? "#94a3b8"  : color,
                  opacity:    n === 0 ? 0.4 : 1,
                  textDecoration: off ? "line-through" : undefined,
                }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: off ? "#94a3b8" : color }}/>
                {n} {short}
              </button>
            );
          })}
          <span className="ml-auto shrink-0 text-slate-400">
            {visibleIds.size}/{located.length} shown
          </span>
        </div>
      )}

      {/* ── Map container ──────────────────────────────────────── */}
      <div className="relative" onMouseLeave={onMouseLeave}>
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vbW} ${vbH}`}
          className="w-full select-none"
          style={{ height: "clamp(320px, 56vw, 540px)", cursor: dragging ? "grabbing" : "crosshair", display: "block" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <defs>
            <style>{`@keyframes dashflow { to { stroke-dashoffset: -28; } }`}</style>

            {/* Map background gradient */}
            <linearGradient id="bg-grad" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%"   stopColor="#cffafe" stopOpacity="0.55"/>
              <stop offset="40%"  stopColor="#dcfce7" stopOpacity="0.75"/>
              <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.9"/>
            </linearGradient>

            {/* Dot-grid texture */}
            <pattern id="tex-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="0.9" fill="#94a3b8" opacity="0.18"/>
            </pattern>

            {/* Zone fill gradients */}
            {ZONE_PALETTE.map((p, i) => (
              <linearGradient key={i} id={`zg${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={p.stroke} stopOpacity="0.22"/>
                <stop offset="100%" stopColor={p.stroke} stopOpacity="0.07"/>
              </linearGradient>
            ))}

            {/* Drop-shadow filters */}
            <filter id="fs-zone" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#00000014"/>
            </filter>
            <filter id="fs-dot" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="3" floodColor="#00000045"/>
            </filter>
            <filter id="fs-sel" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="7" result="blur"/>
              <feComposite in="blur" in2="SourceGraphic" operator="over"/>
            </filter>
          </defs>

          {/* ── Background ─────────────────────────────────────── */}
          <rect width={W} height={H} fill="url(#bg-grad)"/>
          <rect width={W} height={H} fill="url(#tex-dots)"/>

          {/* ── Dashed coordinate grid ──────────────────────────── */}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i*(W/8)} y1={0} x2={i*(W/8)} y2={H}
              stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.45"/>
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i*(H/6)} x2={W} y2={i*(H/6)}
              stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.45"/>
          ))}

          {/* ── Lat/Lng graticule edge labels ───────────────────── */}
          {Array.from({ length: 4 }, (_, i) => {
            const lat = BBOX.minLat + ((i+1)/5) * (BBOX.maxLat - BBOX.minLat);
            const y   = toY(lat);
            const lng = BBOX.minLng + ((i+1)/5) * (BBOX.maxLng - BBOX.minLng);
            const x   = toX(lng);
            return (
              <g key={i}>
                <text x={vb.x + 4/vb.z} y={y} fontSize={6/vb.z} fill="#64748b"
                  fontFamily="monospace" dominantBaseline="middle" opacity="0.7">
                  {lat.toFixed(3)}°
                </text>
                <text x={x} y={vb.y + vbH - 3/vb.z} fontSize={6/vb.z} fill="#64748b"
                  fontFamily="monospace" textAnchor="middle" opacity="0.7">
                  {lng.toFixed(3)}°
                </text>
              </g>
            );
          })}

          {/* ── Farm zones ─────────────────────────────────────── */}
          {activeFarms.map((farm, i) => {
            const { x, y, w, h } = zoneRect(farm);
            const pal     = ZONE_PALETTE[i % ZONE_PALETTE.length];
            const isSel   = selFarm === farm.id;
            const isHov   = hovFarm === farm.id;
            const isDim   = selFarm != null && !isSel;
            const count   = located.filter(c => c.farmId === farm.id).length;
            const visible = located.filter(c => c.farmId === farm.id && visibleIds.has(c.id)).length;
            return (
              <g key={farm.id}
                onClick={() => setSelFarm(s => s === farm.id ? null : farm.id)}
                onMouseEnter={() => setHovFarm(farm.id)}
                onMouseLeave={() => setHovFarm(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Outer glow when selected */}
                {isSel && (
                  <rect x={x-8} y={y-8} width={w+16} height={h+16} rx="18"
                    fill={pal.stroke} opacity="0.18" filter="url(#fs-sel)"/>
                )}
                {/* Main zone rect – gradient fill + shadow */}
                <rect x={x} y={y} width={w} height={h} rx="12"
                  fill={`url(#zg${i % 4})`}
                  stroke={pal.stroke}
                  strokeWidth={isSel ? 2.5 : isHov ? 2 : 1.5}
                  filter="url(#fs-zone)"
                  opacity={isDim ? 0.22 : 1}
                />
                {/* Animated dashed border when selected */}
                {isSel && (
                  <rect x={x} y={y} width={w} height={h} rx="12"
                    fill="none" stroke={pal.dark} strokeWidth="1.8"
                    strokeDasharray="10 6" opacity="0.55"
                    style={{ animation: "dashflow 1.6s linear infinite" }}/>
                )}
                {/* Zone label block */}
                {!isDim && (
                  <g>
                    <rect x={x + w/2 - 52} y={y + h/2 - 30} width="104" height="52" rx="8"
                      fill="white" opacity="0.65"/>
                    <text x={x+w/2} y={y+h/2 - 12} textAnchor="middle" fontSize="13" fontWeight="700"
                      fill={pal.dark} fontFamily="system-ui, sans-serif">{farm.name}</text>
                    <text x={x+w/2} y={y+h/2 + 2} textAnchor="middle" fontSize="9.5"
                      fill="#475569" fontFamily="sans-serif">{farm.facilityType} · {farm.totalAreaHa} ha</text>
                    <text x={x+w/2} y={y+h/2 + 16} textAnchor="middle" fontSize="9"
                      fill="#64748b" fontFamily="sans-serif">{visible}/{count} animals</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Ghost dots (hidden by filter) ──────────────────── */}
          {located.filter(c => !visibleIds.has(c.id)).map(c => (
            <circle key={`g-${c.id}`}
              cx={toX(c.gpsLng!)} cy={toY(c.gpsLat!)}
              r="3.5" fill="#94a3b8" opacity="0.18"/>
          ))}

          {/* ── Visible animal pins ─────────────────────────────── */}
          {located.filter(c => visibleIds.has(c.id)).map(c => {
            const cx    = toX(c.gpsLng!), cy = toY(c.gpsLat!);
            const color = dotColor(c.status, c.health);
            const hov   = tooltip?.c.id === c.id;
            const nameW = c.name.length * 5.2 + 8;
            return (
              <g key={c.id} style={{ cursor: "pointer" }}
                onClick={e => { if (!dragRef.current) { e.stopPropagation(); router.push(`/cattle/${c.id}`); }}}
                onMouseEnter={() => { if (!dragging) { const s = svgPtToScreen(cx, cy); setTooltip({ c, ...s }); }}}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Hover ring */}
                {hov && <>
                  <circle cx={cx} cy={cy} r="22" fill={color} opacity="0.07"/>
                  <circle cx={cx} cy={cy} r="14" fill={color} opacity="0.12"/>
                </>}
                {/* Soft glow halo */}
                <circle cx={cx} cy={cy} r="10" fill={color} opacity="0.2"/>
                {/* Main dot with shadow */}
                <circle cx={cx} cy={cy} r="6.5" fill={color} filter="url(#fs-dot)"/>
                {/* Shine highlight (3-D effect) */}
                <circle cx={cx-2} cy={cy-2} r="2" fill="white" opacity="0.75"/>
                {/* Name pill label at zoom ≥ 2.5 */}
                {vb.z >= 2.5 && (
                  <g>
                    <rect x={cx - nameW/2} y={cy - 23} width={nameW} height={13} rx="4"
                      fill={color} opacity="0.92" filter="url(#fs-dot)"/>
                    <text x={cx} y={cy - 13.5} textAnchor="middle" fontSize="7.5"
                      fill="white" fontFamily="system-ui, sans-serif" fontWeight="700">{c.name}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Scale bar ─────────────────────────────────────────── */}
          <g transform={`translate(${vb.x + 14/vb.z}, ${vb.y + vbH - 20/vb.z})`}>
            <rect x={-4/vb.z} y={-16/vb.z} width={(barSvgW/vb.z) + 8/vb.z} height={20/vb.z}
              rx={3/vb.z} fill="white" opacity="0.82"/>
            {/* Ruler line */}
            <line x1={0} y1={0} x2={barSvgW/vb.z} y2={0} stroke="#334155" strokeWidth={1.5/vb.z}/>
            {/* End ticks */}
            <line x1={0} y1={-5/vb.z} x2={0} y2={3/vb.z} stroke="#334155" strokeWidth={1.5/vb.z}/>
            <line x1={barSvgW/vb.z} y1={-5/vb.z} x2={barSvgW/vb.z} y2={3/vb.z} stroke="#334155" strokeWidth={1.5/vb.z}/>
            {/* Mid tick */}
            <line x1={barSvgW/vb.z/2} y1={-3/vb.z} x2={barSvgW/vb.z/2} y2={2/vb.z} stroke="#334155" strokeWidth={1/vb.z}/>
            <text x={barSvgW/vb.z/2} y={-8/vb.z} textAnchor="middle" fontSize={7/vb.z}
              fill="#334155" fontFamily="system-ui, sans-serif" fontWeight="600">{niceKm} km</text>
          </g>

          {/* ── Compass rose ─────────────────────────────────────── */}
          <g transform={`translate(${vb.x + vbW - 28/vb.z}, ${vb.y + 28/vb.z})`}>
            <circle r={18/vb.z} fill="white" opacity="0.92" stroke="#e2e8f0" strokeWidth={0.8/vb.z}
              filter="url(#fs-zone)"/>
            {/* N arrow (filled green) */}
            <polygon
              points={`0,${-13/vb.z} ${5/vb.z},${0} 0,${-4/vb.z} ${-5/vb.z},${0}`}
              fill="#16a34a"/>
            {/* S arrow (light) */}
            <polygon
              points={`0,${13/vb.z} ${5/vb.z},${0} 0,${4/vb.z} ${-5/vb.z},${0}`}
              fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.3/vb.z}/>
            {/* E/W ticks */}
            <line x1={9/vb.z} y1={0} x2={13/vb.z} y2={0} stroke="#94a3b8" strokeWidth={1/vb.z}/>
            <line x1={-9/vb.z} y1={0} x2={-13/vb.z} y2={0} stroke="#94a3b8" strokeWidth={1/vb.z}/>
            {/* N label */}
            <text textAnchor="middle" y={-16/vb.z} fontSize={6/vb.z} fontWeight="800"
              fill="#15803d" fontFamily="system-ui, sans-serif">N</text>
          </g>

          {/* ── WGS-84 attribution ────────────────────────────────── */}
          <text x={vb.x + vbW - 5/vb.z} y={vb.y + vbH - 5/vb.z} textAnchor="end"
            fontSize={6/vb.z} fill="#94a3b8" fontFamily="monospace" opacity="0.7">WGS-84 · Live</text>
        </svg>

        {/* ── Zoom +/- controls ─────────────────────────────────── */}
        <div className="absolute right-3 top-4 flex flex-col gap-1">
          <button onClick={() => zoomAt(1.4)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/95 text-xl font-light text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95">+</button>
          <button onClick={() => zoomAt(1/1.4)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/95 text-xl font-light text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95">−</button>
        </div>

        {/* ── Live indicator ──────────────────────────────────────── */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"/>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/>
          </span>
          LIVE
        </div>

        {/* ── Status legend panel ─────────────────────────────────── */}
        <div className="absolute bottom-8 left-3 overflow-hidden rounded-xl border border-slate-200 bg-white/96 shadow-md text-[11px]">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
            <p className="font-bold uppercase tracking-widest text-[9px] text-slate-400">Status Filter</p>
          </div>
          <div className="space-y-0.5 p-2">
            {STATUS_LEGEND.map(({ label, color, statuses }) => {
              const n   = statuses.reduce((s, k) => s + (stCounts[k] ?? 0), 0);
              const off = statuses.every(s => hiddenSt.has(s));
              return (
                <button key={label} onClick={() => toggleStatus(statuses)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-all hover:bg-slate-50"
                  style={{ opacity: off ? 0.4 : 1 }}>
                  <span className="h-3 w-3 shrink-0 rounded-full shadow-sm" style={{ background: color }}/>
                  <span className={`flex-1 ${off ? "line-through text-slate-400" : "text-slate-700"}`}>{label}</span>
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: color + "1a", color }}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Rich HTML tooltip ───────────────────────────────────── */}
        {tooltip && (() => {
          const c     = tooltip.c;
          const color = dotColor(c.status, c.health);
          const farm  = farms.find(f => f.id === c.farmId);
          return (
            <div className="pointer-events-none fixed z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl text-xs"
              style={{ left: tooltip.sx + 16, top: tooltip.sy - 60 }}>
              {/* Coloured header bar */}
              <div className="flex items-center justify-between px-3 py-2"
                style={{ background: color + "18", borderBottom: `2px solid ${color}30` }}>
                <div>
                  <p className="font-bold text-[13px]" style={{ color }}>{c.name}</p>
                  <p className="font-mono text-[10px] text-slate-400">{c.id}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: color + "22", color }}>{c.status}</span>
              </div>
              {/* Body */}
              <div className="space-y-1.5 px-3 py-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Breed</span>
                  <span className="font-medium text-slate-700">{c.breed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class</span>
                  <span className="font-medium text-slate-700">{c.class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Health</span>
                  <span className="font-medium" style={{ color: c.health === "Healthy" ? "#16a34a" : "#dc2626" }}>{c.health}</span>
                </div>
                {c.weightKg > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weight</span>
                    <span className="font-medium text-slate-700">{c.weightKg} kg</span>
                  </div>
                )}
                {farm && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Farm</span>
                    <span className="font-medium text-slate-700">{farm.name}</span>
                  </div>
                )}
                {c.rfidTag && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">RFID</span>
                    <span className="font-mono text-[10px] text-slate-500">{c.rfidTag}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">GPS</span>
                  <span className="font-mono text-slate-500">{c.gpsLat?.toFixed(4)}° {c.gpsLng?.toFixed(4)}°</span>
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-600">
                Click to open full profile →
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Footer status bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-line bg-slate-50/80 px-5 py-2 text-xs text-muted">
        <span className="font-medium">
          {visibleIds.size} of {located.length} animals
          {selFarm ? <span className="ml-1 text-emerald-600">· {activeFarms.find(f=>f.id===selFarm)?.name}</span> : ""}
        </span>
        <span className="font-mono text-[10px]">
          {cursor
            ? <span className="text-slate-500">{cursor.lat.toFixed(5)}°, {cursor.lng.toFixed(5)}°</span>
            : <span className="text-slate-400">Scroll to zoom · Drag to pan · Click farm to filter</span>}
        </span>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const STATUSES = ["All", "Active", "Pregnant", "Lactating", "Dry", "Calf", "Sold"] as const;
const CLASSES = ["All", "Cow", "Bull", "Heifer", "Steer", "Calf"] as const;
const STATUS_OPTIONS = ["Active", "Pregnant", "Lactating", "Dry", "Calf", "Sold", "Deceased"];
const HEALTH_OPTIONS = ["Healthy", "Under Treatment", "Quarantine", "Critical"];
const ACQUISITION_OPTIONS = ["Born on farm", "Purchased"];

const emptyForm = {
  name: "",
  breed: "",
  class: "Cow",
  dob: "2026-06-07",
  status: "Active",
  health: "Healthy",
  weightKg: "",
  damId: "",
  sireId: "",
  pasture: "",
  farmId: "",
  rfidTag: "",
  gpsLat: "",
  gpsLng: "",
  acquisition: "Purchased",
  notes: "",
};

export default function CattleRegistryPage() {
  const { cattle, farms, pastures, addCattle, update, remove } = useData();
  const [view, setView] = useState<"list" | "map">("list");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [cls, setCls] = useState<(typeof CLASSES)[number]>("All");
  const [farmFilter, setFarmFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Cattle) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      breed: c.breed,
      class: c.class,
      dob: c.dob,
      status: c.status,
      health: c.health,
      weightKg: String(c.weightKg),
      damId: c.damId ?? "",
      sireId: c.sireId ?? "",
      pasture: c.pasture === "—" ? "" : c.pasture,
      farmId: c.farmId ?? "",
      rfidTag: c.rfidTag ?? "",
      gpsLat: c.gpsLat != null ? String(c.gpsLat) : "",
      gpsLng: c.gpsLng != null ? String(c.gpsLng) : "",
      acquisition: c.acquisition,
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  const dams = useMemo(() => cattle.filter((c) => canBeDam(c.class)), [cattle]);
  const sires = useMemo(() => cattle.filter((c) => canBeSire(c.class)), [cattle]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cattle.filter((c) => {
      if (status !== "All" && c.status !== status) return false;
      if (cls !== "All" && c.class !== cls) return false;
      if (farmFilter && c.farmId !== farmFilter) return false;
      if (q && !(`${c.id} ${c.name} ${c.breed}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [cattle, query, status, cls, farmFilter]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      breed: form.breed.trim(),
      class: form.class as Cattle["class"],
      dob: form.dob,
      status: form.status as Cattle["status"],
      health: form.health as Cattle["health"],
      weightKg: Number(form.weightKg) || 0,
      damId: form.damId || undefined,
      sireId: form.sireId || undefined,
      pasture: form.pasture.trim() || "—",
      farmId: form.farmId || undefined,
      rfidTag: form.rfidTag.trim() || undefined,
      gpsLat: form.gpsLat ? Number(form.gpsLat) : undefined,
      gpsLng: form.gpsLng ? Number(form.gpsLng) : undefined,
      acquisition: form.acquisition as Cattle["acquisition"],
      notes: form.notes.trim() || undefined,
    };
    if (editingId) update("cattle", editingId, payload);
    else addCattle(payload);
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Cattle Registry"
        description={`${number(cattle.length)} animals on record — search, filter and drill into any individual.`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-line">
              {(["list", "map"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                    view === v ? "bg-brand-600 text-white" : "bg-surface text-muted hover:bg-canvas"
                  }`}
                >
                  {v === "list" ? <Icon.report width={15} height={15} /> : <Icon.field width={15} height={15} />}
                  {v === "list" ? "List" : "Map"}
                </button>
              ))}
            </div>
            <PrimaryButton onClick={openAdd}>
              <Icon.plus width={16} height={16} />
              Add Animal
            </PrimaryButton>
          </div>
        }
      />

      {view === "map" && <GpsMapView cattle={cattle} farms={farms} />}

      {view === "list" && <>
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
            <Icon.search width={16} height={16} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tag, name or breed…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={farmFilter}
              onChange={(e) => setFarmFilter(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            >
              <option value="">All Farms</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={cls}
              onChange={(e) => setCls(e.target.value as (typeof CLASSES)[number])}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            >
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Tag</Th>
              <Th>Name</Th>
              <Th>Breed</Th>
              <Th>Class</Th>
              <Th>Age</Th>
              <Th>Weight</Th>
              <Th>RFID</Th>
              <Th>Status</Th>
              <Th>Health</Th>
              <Th>Farm</Th>
              <Th>Pasture</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={12} label="No animals match your filters." />}
            {rows.map((c) => (
              <tr key={c.id} className="transition hover:bg-canvas/60">
                <Td>
                  <Link href={`/cattle/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                    {c.id}
                  </Link>
                </Td>
                <Td className="font-medium">{c.name}</Td>
                <Td className="text-muted">{c.breed}</Td>
                <Td>
                  <Badge tone={classTone(c.class)}>{c.class}</Badge>
                </Td>
                <Td className="text-muted">{ageFrom(c.dob)}</Td>
                <Td className="text-muted">{c.weightKg} kg</Td>
                <Td>
                  {c.rfidTag
                    ? <span className="font-mono text-xs text-muted">{c.rfidTag}</span>
                    : <span className="text-muted/40">—</span>
                  }
                </Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td><StatusBadge status={c.health} /></Td>
                <Td className="text-muted">
                  {farms.find((f) => f.id === c.farmId)?.name ?? <span className="text-muted/50">—</span>}
                </Td>
                <Td className="text-muted">{c.pasture}</Td>
                <Td>
                  <div className="flex justify-end">
                    <RowActions onEdit={() => openEdit(c)} onDelete={() => remove("cattle", c.id)} label={`${c.name} (${c.id})`} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <p className="mt-3 text-xs text-muted">
        Showing {rows.length} of {cattle.length} animals.
      </p>
      </>
      }

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Animal" : "Add Animal"}
        description={editingId ? `Update ${editingId}.` : "Register a new animal in the herd."}
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <FormGrid>
            <TextField label="Name" value={form.name} onChange={set("name")} required placeholder="e.g. Bluebell" />
            <TextField label="Breed" value={form.breed} onChange={set("breed")} required placeholder="e.g. Holstein" />
            <SelectField label="Class" value={form.class} onChange={set("class")} options={CATTLE_CLASSES} required />
            <DateField label="Date of Birth" value={form.dob} onChange={set("dob")} required />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={STATUS_OPTIONS} required />
            <SelectField label="Health" value={form.health} onChange={set("health")} options={HEALTH_OPTIONS} required />
            <NumberField label="Weight (kg)" value={form.weightKg} onChange={set("weightKg")} required min={0} placeholder="e.g. 480" />
            <SelectField
              label="Farm"
              value={form.farmId}
              onChange={set("farmId")}
              options={farms.map((f) => ({ value: f.id, label: f.name }))}
              placeholder="— Select —"
            />
            <SelectField
              label="Pasture"
              value={form.pasture}
              onChange={set("pasture")}
              options={pastures.map((p) => p.name)}
              placeholder="— Select —"
            />
            <SelectField
              label="Dam (mother)"
              value={form.damId}
              onChange={set("damId")}
              options={dams.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              placeholder="— None —"
            />
            <SelectField
              label="Sire (father)"
              value={form.sireId}
              onChange={set("sireId")}
              options={sires.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              placeholder="— None —"
            />
            <SelectField label="Acquisition" value={form.acquisition} onChange={set("acquisition")} options={ACQUISITION_OPTIONS} required />
            <TextField label="RFID Ear Tag" value={form.rfidTag} onChange={set("rfidTag")} placeholder="e.g. 716001100101001" />
            <NumberField label="GPS Latitude" value={form.gpsLat} onChange={set("gpsLat")} placeholder="e.g. -17.848" step={0.0001} />
            <NumberField label="GPS Longitude" value={form.gpsLng} onChange={set("gpsLng")} placeholder="e.g. 31.047" step={0.0001} />
          </FormGrid>
          <TextAreaField label="Notes" value={form.notes} onChange={set("notes")} placeholder="Optional notes…" />
          <FormButtons onCancel={() => setOpen(false)} submitLabel={editingId ? "Save Changes" : "Add Animal"} />
        </form>
      </Modal>
    </>
  );
}
