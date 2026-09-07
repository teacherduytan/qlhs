// The ket qua "Tinh toan kiem tra" (dung chung giua Cs2AdminPage.tsx va
// Cs2TeacherProgressTab.tsx) - trinh bay co cau truc (the so lieu + thanh
// tien do + danh sach chi tiet theo lop) thay vi 1 dong chu thuan.
export interface Cs2CheckResult {
  tongSo: number
  daDien: number
  chuaDienTheoLop: { lop: string; students: { ma_hs: string; ten: string }[] }[]
}

export function Cs2CheckResultCard({ result }: { result: Cs2CheckResult }) {
  const chuaDien = result.tongSo - result.daDien
  const tyLe = result.tongSo > 0 ? Math.round((result.daDien / result.tongSo) * 100) : 0

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-2xl font-bold text-slate-900">{result.tongSo}</p>
          <p className="text-xs font-semibold uppercase text-slate-500">Tổng số HS</p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-2xl font-bold text-emerald-700">{result.daDien}</p>
          <p className="text-xs font-semibold uppercase text-emerald-700">Đã điền đủ</p>
        </div>
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
          <p className="text-2xl font-bold text-rose-700">{chuaDien}</p>
          <p className="text-xs font-semibold uppercase text-rose-700">Chưa điền</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-emerald-600" style={{ width: `${tyLe}%` }} />
        </div>
        <p className="mt-1 text-right text-xs font-semibold text-slate-500">{tyLe}% đã hoàn tất</p>
      </div>

      {result.chuaDienTheoLop.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Chi tiết học sinh chưa điền theo lớp</p>
          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
            {result.chuaDienTheoLop.map((group) => (
              <div key={group.lop} className="border-b border-slate-100 p-2 last:border-b-0">
                <p className="text-xs font-semibold text-slate-700">
                  Lớp {group.lop} ({group.students.length} chưa điền)
                </p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                  {group.students.map((student) => (
                    <li key={student.ma_hs}>
                      {student.ma_hs} - {student.ten}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-emerald-700">🎉 Tất cả học sinh đã điền đủ thông tin!</p>
      )}
    </div>
  )
}
