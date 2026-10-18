"use client";

import { AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { useAdminResource } from "@/lib/admin-live";
import type { ReactNode } from "react";

type Row = Record<string, unknown>;
type Column = { label: string; render: (row: Row) => ReactNode };

export function AdminLiveTable({ eyebrow, title, description, path, columns, rowKey }: {
  eyebrow: string; title: string; description: string; path: string;
  columns: Column[]; rowKey: (row: Row) => string;
}) {
  const { data, error, loading, refresh } = useAdminResource<{ items: Row[] }>(path);
  return <>
    <AdminHeading eyebrow={eyebrow} title={title} description={description}
      actions={<button className="admin-button" onClick={() => void refresh()}>Làm mới</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải dữ liệu...</p>}
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{data.items.length} mục</strong></div>
      {data.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>
        {data.items.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.label}>{column.render(row)}</td>)}</tr>)}
      </tbody></table></div> : <AdminEmpty title="Chưa có dữ liệu" detail="Bản ghi mới sẽ xuất hiện tại đây." />}
    </section>}
  </>;
}
