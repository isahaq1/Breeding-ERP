"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./icons";

// ---- Modal ------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 my-8 w-full ${size === "lg" ? "max-w-2xl" : "max-w-lg"} rounded-xl border border-line bg-surface shadow-xl`}
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas"
          >
            <Icon.close width={18} height={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- Field primitives -------------------------------------------------------

const inputClass =
  "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url" | "password";
}) {
  return (
    <Field label={label} required={required}>
      <input
        type={type}
        className={inputClass}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  required,
  min,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} required={required}>
      <input
        type="number"
        className={inputClass}
        value={value}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <Field label={label} required={required}>
      <input
        type="date"
        className={inputClass}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export type Option = string | { value: string; label: string };

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <Field label={label} required={required}>
      <select
        className={inputClass}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lbl = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  required,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Field label={label} required={required}>
      <textarea
        className={inputClass}
        value={value}
        required={required}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
}

// ---- Row actions (edit / delete) -------------------------------------------

export function RowActions({
  onEdit,
  onDelete,
  label,
}: {
  onEdit: () => void;
  onDelete: () => void;
  /** Human-readable name of the record, used in the delete confirmation. */
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        title="Edit"
        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-brand-700"
      >
        <Icon.edit width={16} height={16} />
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Delete ${label}? This cannot be undone.`))
            onDelete();
        }}
        aria-label={`Delete ${label}`}
        title="Delete"
        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
      >
        <Icon.trash width={16} height={16} />
      </button>
    </div>
  );
}

export function FormButtons({
  onCancel,
  submitLabel = "Save",
}: {
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="mt-2 flex items-center justify-end gap-2 border-t border-line pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
      >
        {submitLabel}
      </button>
    </div>
  );
}
