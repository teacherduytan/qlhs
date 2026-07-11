/** Component kiểm thử breakpoint — commit C008 */
export function ResponsiveDemo() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-600">Kiểm thử responsive</p>
      <p className="mt-2 block text-base font-semibold text-blue-600 sm:hidden">
        📱 Di động (&lt; 768px)
      </p>
      <p className="mt-2 hidden text-base font-semibold text-emerald-600 sm:block lg:hidden">
        💻 Tablet (768px – 1279px)
      </p>
      <p className="mt-2 hidden text-base font-semibold text-violet-600 lg:block">
        🖥️ Laptop (≥ 1280px)
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="rounded-lg bg-slate-100 px-3 py-4 text-center text-sm font-medium"
          >
            Ô {n}
          </div>
        ))}
      </div>
    </div>
  )
}
