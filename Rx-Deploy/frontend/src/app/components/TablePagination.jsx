import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZE = 10;
const MAX_VISIBLE_PAGES = 5;

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(MAX_VISIBLE_PAGES / 2);
  let startPage = Math.max(1, currentPage - halfWindow);
  let endPage = startPage + MAX_VISIBLE_PAGES - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = endPage - MAX_VISIBLE_PAGES + 1;
  }

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
};

export function TablePagination({
  currentPage,
  onPageChange,
  totalItems,
  itemLabel = "items",
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const safeTotalItems = Math.max(0, totalItems);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, safeTotalItems);
  const visiblePages = getVisiblePages(safeCurrentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 bg-[#F1F5F9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-gray-600">
        Showing {startItem}-{endItem} of {safeTotalItems} {itemLabel}
      </p>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`h-9 min-w-9 rounded-lg px-3 text-sm transition-colors ${
                page === safeCurrentPage
                  ? "bg-[#2563EB] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
