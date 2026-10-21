"use client";

import { useState } from "react";

const PAGE_SIZE = 20;
const normalize = (value: string) => value.toLocaleLowerCase("vi-VN").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

export function useAdminTable<T>(items: T[], searchable: (item: T) => string) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const needle = normalize(query.trim());
  const filtered = needle ? items.filter((item) => normalize(searchable(item)).includes(needle)) : items;
  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  return {
    query,
    setQuery: (value: string) => { setQuery(value); setPage(0); },
    page: currentPage,
    setPage,
    total: filtered.length,
    rows: filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
  };
}

export function AdminTableControls({ label, query, onQuery, page, onPage, total }: {
  label: string; query: string; onQuery: (value: string) => void;
  page: number; onPage: (page: number) => void; total: number;
}) {
  return <div className="admin-table-controls">
    <label className="admin-field"><span>Tìm {label}</span><input type="search" value={query}
      onChange={(event) => onQuery(event.target.value)} placeholder={`Tìm ${label}...`} /></label>
    <div className="admin-inline-actions"><span>{total} kết quả · Trang {page + 1}/{Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
      <button className="admin-button" disabled={page === 0} onClick={() => onPage(page - 1)}>Trước</button>
      <button className="admin-button" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => onPage(page + 1)}>Sau</button>
    </div>
  </div>;
}
