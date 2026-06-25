"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "./icons";

type NavItem = { label: string; href: string; icon: IconName; badge?: number };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" },
      { label: "Analytics", href: "/analytics", icon: "analytics" },
    ],
  },
  {
    title: "Farm Setup",
    items: [
      { label: "Farmers", href: "/farmers", icon: "farmer" },
      { label: "Farms", href: "/farms", icon: "farm" },
      { label: "Farmer Cattle", href: "/farmer-cattle", icon: "cow" },
    ],
  },
  {
    title: "Herd Management",
    items: [
      { label: "Cattle Registry", href: "/cattle", icon: "cow" },
      { label: "Bull Registry", href: "/bull-registry", icon: "shield" },
      { label: "Breeding Records", href: "/breeding", icon: "heart", badge: 4 },
      { label: "Birth History", href: "/births", icon: "baby" },
      { label: "Genetics & Lineage", href: "/genetics", icon: "dna" },
      { label: "Pregnancy Diagnosis", href: "/pregnancy-diagnosis", icon: "stethoscope" },
      { label: "Fertility Analysis", href: "/fertility", icon: "analytics" },
    ],
  },
  {
    title: "Semen Programme",
    items: [
      { label: "Semen Collections", href: "/semen-supply?tab=collections", icon: "collection" },
      { label: "Semen Catalogue", href: "/semen-supply?tab=catalog", icon: "vial" },
      { label: "Farmer Orders", href: "/semen-supply?tab=orders", icon: "report" },
      { label: "AI Insemination", href: "/insemination", icon: "syringe" },
      { label: "AI Birth Records", href: "/semen-supply?tab=births", icon: "dna" },
      { label: "Farmer Calf Births", href: "/farmer-calves", icon: "baby" },
      { label: "DP Management", href: "/dp-management", icon: "location" },
      { label: "Agent Straw Issues", href: "/agent-straw", icon: "vial" },
      { label: "Sales Agents", href: "/semen-supply?tab=agents", icon: "agent" },
      { label: "Agent Performance", href: "/agent-performance", icon: "analytics" },
      { label: "Incentives", href: "/semen-supply?tab=incentives", icon: "percent" },
      { label: "Distribution", href: "/distribution", icon: "network" },
      { label: "Semen Laboratory", href: "/semen-lab", icon: "vial" },
      { label: "Cryogenic Storage", href: "/cryogenic-storage", icon: "thermometer" },
    ],
  },
  {
    title: "Health & Care",
    items: [
      { label: "Vaccinations", href: "/vaccinations", icon: "syringe", badge: 2 },
      { label: "Health Records", href: "/health", icon: "stethoscope" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Feed Management", href: "/feed", icon: "feed" },
      { label: "Pasture & Lots", href: "/pasture", icon: "field" },
      { label: "Sales & Transfer", href: "/sales", icon: "swap" },
    ],
  },
  {
    title: "Finance & Accounting",
    items: [{ label: "Finance", href: "/finance", icon: "wallet" }],
  },
  {
    title: "Smart Systems",
    items: [
      { label: "IoT Monitoring", href: "/iot-monitoring", icon: "wifi" },
      { label: "Heat Detection", href: "/heat-detection", icon: "flame" },
      { label: "Movement History", href: "/movement-history", icon: "history" },
      { label: "QR / RFID Scanner", href: "/qr-scanner", icon: "qrcode" },
      { label: "Blockchain Registry", href: "/blockchain-registry", icon: "link" },
    ],
  },
  {
    title: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: "report" }],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(path + "/");
}

// Separated into its own component so useSearchParams() gets its own Suspense boundary
function NavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const searchParams = useSearchParams();

  function isActiveItem(href: string): boolean {
    const [path, query] = href.split("?");
    if (!isActivePath(pathname, path)) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    for (const [key, val] of params) {
      if (searchParams.get(key) !== val) return false;
    }
    return true;
  }

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
      {NAV.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActiveItem(item.href);
              const IconCmp = Icon[item.icon];
              return (
                <li key={`${item.href}:${item.label}`}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-muted hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    <IconCmp
                      width={19}
                      height={19}
                      className={
                        active ? "text-brand-600" : "text-muted group-hover:text-ink"
                      }
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
          <Icon.cow width={22} height={22} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-ink">HerdLine</p>
          <p className="text-[11px] text-muted">Cattle Breeding ERP</p>
        </div>
      </div>

      <Suspense fallback={<nav className="flex-1 overflow-y-auto px-3 pb-6" />}>
        <NavContent pathname={pathname} onNavigate={onNavigate} />
      </Suspense>

      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            FM
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">Farm Manager</p>
            <p className="text-[11px] text-muted">Greenfield Ranch</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = NAV.flatMap((g) => g.items).find((i) =>
    isActivePath(pathname, i.href),
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent pathname={pathname} />
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface">
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-canvas lg:hidden"
            aria-label="Open menu"
          >
            <Icon.menu />
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm font-semibold text-ink">
              {current?.label ?? "Dashboard"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 md:flex">
              <Icon.search width={16} height={16} className="text-muted" />
              <input
                placeholder="Search tag, name…"
                className="w-44 bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
            <button
              type="button"
              className="relative grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-canvas"
              aria-label="Notifications"
            >
              <Icon.bell width={19} height={19} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
