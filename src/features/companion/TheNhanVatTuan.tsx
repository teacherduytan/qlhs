import type { BacTinhTu, KetQuaRank } from '../../data/types'

export interface HuyHieuTuan {
  ma: string
  ten: string
  icon?: string
}

const MAU_THEO_BAC: Record<number, { vien: string; nen: string; chu: string; thanh: string }> = {
  1: { vien: 'border-slate-300', nen: 'bg-slate-100', chu: 'text-slate-700', thanh: 'bg-slate-400' },
  2: { vien: 'border-sky-300', nen: 'bg-sky-100', chu: 'text-sky-700', thanh: 'bg-sky-400' },
  3: { vien: 'border-teal-300', nen: 'bg-teal-100', chu: 'text-teal-700', thanh: 'bg-teal-400' },
  4: { vien: 'border-indigo-300', nen: 'bg-indigo-100', chu: 'text-indigo-700', thanh: 'bg-indigo-400' },
  5: { vien: 'border-amber-300', nen: 'bg-amber-100', chu: 'text-amber-700', thanh: 'bg-amber-400' },
  6: { vien: 'border-violet-300', nen: 'bg-violet-100', chu: 'text-violet-700', thanh: 'bg-violet-500' },
  7: { vien: 'border-fuchsia-300', nen: 'bg-fuchsia-100', chu: 'text-fuchsia-700', thanh: 'bg-fuchsia-500' },
}

// The nhan vat phong cach game hien bac tinh tu tuan hien tai. Nhan du lieu da
// tinh san qua props (tinhRankTuan() trong rankTinhTu.ts), khong tu query -
// xem docs/thethanghang/12-dac-ta-rank-tinh-tu.md.
export function TheNhanVatTuan({
  bacTuanTruoc,
  hoTen,
  huyHieu,
  rank,
  thangBac,
  tuanLabel,
  vietTat,
}: {
  bacTuanTruoc?: BacTinhTu | null
  hoTen: string
  huyHieu: HuyHieuTuan[]
  rank: KetQuaRank
  thangBac: BacTinhTu[]
  tuanLabel: string
  vietTat: string
}) {
  const { bacHienTai, bacKeTiep, diemTuan, conThieu, phanTramToiKeTiep, diemThuong } = rank
  const mau = MAU_THEO_BAC[bacHienTai.bac] ?? MAU_THEO_BAC[1]

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`flex flex-wrap items-center gap-3.5 p-4 ${mau.nen}`}>
          <div
            className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold ${mau.chu} border-[3px] ${mau.vien}`}
          >
            {vietTat}
            <span
              className={`absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-sm ${mau.vien}`}
              aria-hidden="true"
            >
              {bacHienTai.icon}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <span className={`inline-block rounded-full bg-white px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${mau.chu}`}>
              Bậc {bacHienTai.bac} · {bacHienTai.ten}
            </span>
            <p className="mt-1.5 wrap-break-word text-lg font-bold text-slate-800">{hoTen}</p>
            <p className={`mt-0.5 text-xs font-semibold ${mau.chu}`}>{tuanLabel}</p>
          </div>

          <div className="rounded-xl bg-white px-4 py-2 text-center shadow-sm">
            <p className={`text-2xl font-extrabold leading-none ${mau.chu}`}>{diemTuan}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">điểm tuần</p>
          </div>
        </div>

        <div className="p-4">
          {bacKeTiep ? (
            <>
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                <span>Tiến độ lên bậc kế tiếp</span>
                <span>
                  còn <b className="text-slate-700">{conThieu}</b> điểm → {bacKeTiep.icon}{' '}
                  <b className="text-slate-700">{bacKeTiep.ten}</b>
                </span>
              </div>
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${mau.thanh}`} style={{ width: `${phanTramToiKeTiep}%` }} />
              </div>
            </>
          ) : (
            <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-600">
              🌌 Đã đạt bậc cao nhất tuần này — tuyệt vời!
            </div>
          )}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Huy hiệu tuần này</p>
          {huyHieu.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {huyHieu.map((h) => (
                <span
                  key={h.ma}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  <span aria-hidden="true">{h.icon ?? '🏅'}</span>
                  {h.ten}
                </span>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-slate-400">Chưa có huy hiệu nào tuần này — tuần tới cố lên nhé!</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-400">
              Bậc reset mỗi tuần · {huyHieu.length} huy hiệu × {huyHieu.length > 0 ? diemThuong / huyHieu.length : 0}đ = +
              {diemThuong}đ thưởng
            </span>
            {bacTuanTruoc ? (
              <span className="text-slate-500">
                Tuần trước: {bacTuanTruoc.icon} {bacTuanTruoc.ten}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
        <span className="text-slate-400">Thang bậc:</span>
        {thangBac.map((b, i) => (
          <span key={b.ma} className="flex items-center gap-1.5">
            <span className={b.bac === bacHienTai.bac ? `font-bold ${mau.chu}` : ''}>
              {b.icon} {b.ten}
            </span>
            {i < thangBac.length - 1 ? <span className="text-slate-300">›</span> : null}
          </span>
        ))}
      </div>
    </div>
  )
}
