import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
  RefreshCw,
} from 'lucide-react';

interface CoretaxIconToolbarProps {
  onRefresh?: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  onPrintPdf?: () => void;
  onToggleFilter?: () => void;
  filterActive?: boolean;
  rightContent?: React.ReactNode;
}

/**
 * Authentic Coretax DJP table utility toolbar:
 * Refresh (outline) · CSV/Copy (slate) · Excel (emerald) · PDF (crimson) · Filter (soft blue)
 */
export const CoretaxIconToolbar: React.FC<CoretaxIconToolbarProps> = ({
  onRefresh,
  onExportCsv,
  onExportExcel,
  onPrintPdf,
  onToggleFilter,
  filterActive = false,
  rightContent,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onRefresh}
          title="Muat ulang & reset filter"
          className="w-7 h-7 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#1E2C5E] inline-flex items-center justify-center transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          title="Ekspor CSV"
          className="w-7 h-7 rounded-[6px] bg-[#5B6472] hover:bg-[#47505E] text-white inline-flex items-center justify-center transition cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onExportExcel || onExportCsv}
          title="Ekspor Excel (.csv)"
          className="w-7 h-7 rounded-[6px] bg-[#2F7D4A] hover:bg-[#25663C] text-white inline-flex items-center justify-center transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onPrintPdf || (() => window.print())}
          title="Cetak / Simpan PDF"
          className="w-7 h-7 rounded-[6px] bg-[#C83737] hover:bg-[#AA2B2B] text-white inline-flex items-center justify-center transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleFilter}
          title="Tampilkan / Sembunyikan Filter Kolom"
          className={`w-7 h-7 rounded-[6px] border inline-flex items-center justify-center transition cursor-pointer ${
            filterActive
              ? 'bg-[#E6F2FA] border-[#9EC5E6] text-[#1E2C5E]'
              : 'bg-[#E6F2FA] border-[#BBD9EE] text-[#1E2C5E] hover:bg-[#D5E9F8]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
      </div>

      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </div>
  );
};

interface CoretaxPaginationProps {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  showEntriesText?: boolean;
}

/**
 * Authentic Coretax DJP centered pagination bar:
 * Menampilkan X sampai Y dari Z entri  [<<] [<] [1] [>] [>>] [10 v]
 */
export const CoretaxPagination: React.FC<CoretaxPaginationProps> = ({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  showEntriesText = true,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startEntry = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="px-4 py-2.5 border-t border-[#E5EAF2] bg-white flex flex-wrap items-center justify-center gap-3 text-[11.5px] text-slate-600">
      {showEntriesText && (
        <span className="text-slate-500">
          Menampilkan {startEntry} sampai {endEntry} dari {totalItems} entri
        </span>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          className="w-7 h-7 rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          aria-label="Halaman pertama"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="w-7 h-7 rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {totalItems > 0 && (
          <span className="min-w-[28px] h-7 px-2 rounded-[4px] border border-[#CBD5E1] bg-white text-[#1E2C5E] font-bold font-mono-num inline-flex items-center justify-center">
            {safePage}
          </span>
        )}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="w-7 h-7 rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="w-7 h-7 rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          aria-label="Halaman terakhir"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <select
        value={pageSize}
        onChange={(e) => {
          onPageSizeChange(Number(e.target.value));
          onPageChange(1);
        }}
        className="h-7 px-2 border border-[#CBD5E1] rounded-[4px] bg-white text-[11.5px] font-mono-num text-slate-700 focus:outline-none focus:border-[#1E2C5E]"
        aria-label="Jumlah baris per halaman"
      >
        {pageSizeOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

/** Helper to trigger real CSV download from any table dataset */
export function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

