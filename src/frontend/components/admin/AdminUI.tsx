"use client";

import type { ReactNode } from "react";

export function AdminHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="admin-page-heading"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="admin-heading-actions">{actions}</div>}</div>;
}

export function AdminStat({ label, value, note, tone }: { label: string; value: ReactNode; note: string; tone?: "accent" | "alert" }) {
  return <div className={`admin-panel admin-stat ${tone ?? ""}`}><div className="admin-stat-label">{label}</div><div className="admin-stat-value">{value}</div><div className="admin-stat-note">{note}</div></div>;
}

export function AdminEmpty({ title, detail }: { title: string; detail: string }) {
  return <div className="admin-empty"><strong>{title}</strong><p>{detail}</p></div>;
}

export function AdminDialog({ title, description, children, onClose, onSubmit, submitLabel, submitDisabled, danger = false, error }: {
  title: string; description: string; children: ReactNode; onClose: () => void; onSubmit: () => void;
  submitLabel: string; submitDisabled?: boolean; danger?: boolean; error?: string;
}) {
  return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-shared-dialog-title">
      <h2 id="admin-shared-dialog-title">{title}</h2><p>{description}</p>{children}
      {error && <span role="alert" className="admin-modal-error">{error}</span>}
      <div className="admin-modal-actions"><button type="button" className="admin-button" onClick={onClose}>Đóng</button><button type="button" className={`admin-button ${danger ? "danger" : "primary"}`} disabled={submitDisabled} onClick={onSubmit}>{submitLabel}</button></div>
    </div>
  </div>;
}

export function adminActivity(title: string, detail: string) {
  return { id: crypto.randomUUID(), title, detail, at: new Date().toISOString() };
}
