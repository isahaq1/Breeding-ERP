import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const Icon = {
  dashboard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  analytics: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-4 3 3 4-6" />
    </svg>
  ),
  cow: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 5c-1.5 0-2 1.5-2 3 0 1.2.8 2 2 2" />
      <path d="M19 5c1.5 0 2 1.5 2 3 0 1.2-.8 2-2 2" />
      <path d="M6 9c0-2 2-4 6-4s6 2 6 4v3a6 6 0 0 1-12 0z" />
      <path d="M9.5 13h.01M14.5 13h.01" />
      <path d="M9 17c.8.7 1.8 1 3 1s2.2-.3 3-1" />
    </svg>
  ),
  heart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 22l8.8-8.3a5 5 0 0 0 0-7.1z" />
    </svg>
  ),
  baby: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="6" r="3" />
      <path d="M9 6h.01M15 6h.01" />
      <path d="M6 14a6 6 0 0 1 12 0v1a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" />
    </svg>
  ),
  dna: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 3c0 4 10 6 10 10S7 19 7 21" />
      <path d="M17 3c0 4-10 6-10 10s10 4 10 8" />
      <path d="M8 6h8M9 10h6M9 14h6M8 18h8" />
    </svg>
  ),
  syringe: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M18 2l4 4" />
      <path d="M15 5l4 4" />
      <path d="M17 7L7 17l-3 1 1-3L15 5" />
      <path d="M9 11l2 2" />
      <path d="M2 22l3-3" />
    </svg>
  ),
  stethoscope: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 3v5a4 4 0 0 0 8 0V3" />
      <path d="M5 3H4M13 3h1" />
      <path d="M9 16v1a4 4 0 0 0 8 0v-2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  ),
  feed: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 8l8-4 8 4-8 4-8-4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </svg>
  ),
  field: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 20h18" />
      <path d="M6 20V8M6 8l3 2M6 11l3 2M6 8L3 10" />
      <path d="M14 20v-7M14 13l3-2M14 16l3-2M14 13l-3-2" />
    </svg>
  ),
  swap: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h14" />
      <path d="m17 20 4-4-4-4" />
      <path d="M21 16H7" />
    </svg>
  ),
  report: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  menu: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  close: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  edit: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  trash: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  arrowUp: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  arrowDown: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  ),
  download: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  ),
  farmer: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 14c0-2 3-4 6-4s6 2 6 4v2h1v4h-2v2h-2v-2H9v2H7v-4H6z" />
      <path d="M6 14h12" />
    </svg>
  ),
  farm: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 20h18" />
      <path d="M12 20V8l7-2v14" />
      <path d="M5 20V10l7-2v12" />
      <path d="M5 10h14" />
    </svg>
  ),
  vial: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 3h6" />
      <path d="M10 3v9.5L6 18a2 2 0 0 0 1.8 3h8.4A2 2 0 0 0 18 18l-4-5.5V3" />
      <path d="M8.5 16h7" />
    </svg>
  ),
  location: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  ),
  map: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2c3 0 5.5 2 5.5 5s-2.5 5-5.5 5-5.5-2-5.5-5S9 2 12 2z" />
      <path d="M12 7v8M9 20h6" />
      <path d="M4 20h16" />
    </svg>
  ),
  users: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M4 12c0-1.5 2-2.5 3-2.5s2.5.5 2.5 1.5S9 14 12 14s3 .5 4.5 1.5 2.5 0 2.5-1.5 2 1 3 2.5" />
    </svg>
  ),
  agent: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      <path d="M16 5l1.5 1.5L20 4" />
    </svg>
  ),
  percent: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
      <path d="M19 5 5 19" />
    </svg>
  ),
  wallet: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 12h2" />
      <path d="M2 10h20" />
    </svg>
  ),
  ledger: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 2h16a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  ),
  wifi: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  thermometer: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  ),
  activity: (p: IconProps) => (
    <svg {...base(p)}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  zap: (p: IconProps) => (
    <svg {...base(p)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  battery: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 11h4" />
    </svg>
  ),
  history: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  link: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  qrcode: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
    </svg>
  ),
  flame: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  network: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M12 11l-5 6M12 11l5 6" />
    </svg>
  ),
  shield: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  collection: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
      <path d="M3 14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
    </svg>
  ),
};

export type IconName = keyof typeof Icon;
