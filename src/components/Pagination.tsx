import { useEffect, useState } from 'react'

const DEFAULT_PAGE_SIZE = 5

export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [items.length])

  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return { page: safePage, setPage, totalPages, pageItems, pageSize, startIndex: start, total: items.length }
}

export function Pagination({
  onChange,
  page,
  totalPages,
}: {
  onChange: (page: number) => void
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(1)}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          title="Trang đầu"
        >
          «
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          ← Trước
        </button>
      </div>
      <p className="text-xs font-semibold text-slate-500">
        Trang {page}/{totalPages}
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          Sau →
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(totalPages)}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          title="Trang cuối"
        >
          »
        </button>
      </div>
    </div>
  )
}
