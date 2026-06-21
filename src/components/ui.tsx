import type { ReactNode } from "react";
import { Icon } from "./icons";

// ---- Badge ------------------------------------------------------------------

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "purple";

const toneClasses: Record<Tone, string> = {
  green: "bg-brand-100 text-brand-800 ring-brand-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  blue: "bg-sky-100 text-sky-800 ring-sky-200",
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  purple: "bg-violet-100 text-violet-800 ring-violet-200",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

// Map common status strings to a tone so callers stay terse.
export function toneFor(status: string): Tone {
  const s = status.toLowerCase();
  if (/(healthy|completed|resolved|confirmed|live|excellent|active|grazing)/.test(s)) return "green";
  if (/(due|pending|monitoring|ongoing|dry|resting|fair|scheduled|assisted)/.test(s)) return "amber";
  if (/(overdue|critical|deceased|stillborn|cancelled|poor|difficult|aborted|quarantine)/.test(s)) return "red";
  if (/(pregnant|lactating|treatment|maintenance|c-section)/.test(s)) return "blue";
  if (/(calf|good|sold)/.test(s)) return "purple";
  return "gray";
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={toneFor(status)}>{status}</Badge>;
}

// ---- Card -------------------------------------------------------------------

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {action}
    </div>
  );
}

// ---- StatCard ---------------------------------------------------------------

export function StatCard({
  label,
  value,
  delta,
  sublabel,
  iconName,
  tone = "green",
}: {
  label: string;
  value: string;
  delta?: number;
  sublabel?: string;
  iconName?: keyof typeof Icon;
  tone?: Tone;
}) {
  const IconCmp = iconName ? Icon[iconName] : null;
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
        </div>
        {IconCmp && (
          <div className={`rounded-lg p-2 ${toneClasses[tone]} ring-0`}>
            <IconCmp width={22} height={22} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              up ? "text-brand-700" : "text-red-600"
            }`}
          >
            {up ? <Icon.arrowUp width={14} height={14} /> : <Icon.arrowDown width={14} height={14} />}
            {Math.abs(delta)}%
          </span>
        )}
        {sublabel && <span className="text-muted">{sublabel}</span>}
      </div>
    </Card>
  );
}

// ---- PageHeader -------------------------------------------------------------

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
    >
      {children}
    </button>
  );
}

// ---- Table primitives -------------------------------------------------------

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-line bg-canvas/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <td className={`whitespace-nowrap border-b border-line px-5 py-3 text-ink ${className}`}>
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-muted">
        {label}
      </td>
    </tr>
  );
}
