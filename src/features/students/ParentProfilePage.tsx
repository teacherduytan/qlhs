import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { ChiTietHocPhi, PublicParentProfile } from '../../data/types'

export function parentLoginStorageKey(token: string): string {
  return `qlhs_ph_login_${token}`
}

const SDT_PATTERN = /^0\d{9}$/

type ParentState =
  | { status: 'login' }
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'success'; profile: PublicParentProfile }

// Trang rieng cho PHU HUYNH xem (khac han StudentProfilePage.tsx - trang cua
// chinh hoc sinh) - dang nhap bang so dien thoai da luu san o ho so (sdt_1
// HOAC sdt_2 deu duoc), mat khau mac dinh "123", tu doi duoc qua RPC rieng.
// Noi dung: dong thoi gian thong bao (tai su dung noi_dung_tin_nhan - cung
// nguon voi tinh nang "Nhan tin PH theo dot" cho giao vien), thong bao loai
// hoc_phi co kem chi tiet phieu thu. 2 khoi "Ghi nhan cua con"/"Bao cao" o
// cuoi la CHO SAN cho tinh nang sau nay (chua co du lieu thuc), khong phai
// loi thieu code.
export function ParentProfilePage() {
  const { token } = useParams()
  const [state, setState] = useState<ParentState>({ status: 'login' })
  const [sdt, setSdt] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [showDoiMatKhau, setShowDoiMatKhau] = useState(false)
  const [matKhauCu, setMatKhauCu] = useState('')
  const [matKhauMoi, setMatKhauMoi] = useState('')
  const [matKhauXacNhan, setMatKhauXacNhan] = useState('')
  const [doiMatKhauLoi, setDoiMatKhauLoi] = useState<string | null>(null)
  const [doiMatKhauThanhCong, setDoiMatKhauThanhCong] = useState(false)
  const [doiMatKhauDangLuu, setDoiMatKhauDangLuu] = useState(false)
  const [openMaKy, setOpenMaKy] = useState<string | null>(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function loadProfile(sdtValue: string, matKhauValue: string, silent = false) {
    if (!token) {
      setState({ status: 'not_found' })
      return
    }

    if (!silent) {
      setLoggingIn(true)
      setLoginError(null)
    }

    dataSource
      .getParentThongBao(token, sdtValue, matKhauValue)
      .then((profile) => {
        if (!mountedRef.current) return

        if (!profile) {
          window.sessionStorage.removeItem(parentLoginStorageKey(token))
          setState({ status: 'login' })
          setLoginError('Số điện thoại hoặc mật khẩu không đúng.')
          return
        }

        window.sessionStorage.setItem(
          parentLoginStorageKey(token),
          JSON.stringify({ sdt: sdtValue, matKhau: matKhauValue }),
        )
        setState({ status: 'success', profile })
      })
      .catch((error: unknown) => {
        if (mountedRef.current) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được thông báo.',
          })
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoggingIn(false)
      })
  }

  useEffect(() => {
    if (!token) {
      setState({ status: 'not_found' })
      return
    }

    const saved = window.sessionStorage.getItem(parentLoginStorageKey(token))
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { sdt: string; matKhau: string }
        setSdt(parsed.sdt)
        setMatKhau(parsed.matKhau)
        setState({ status: 'loading' })
        loadProfile(parsed.sdt, parsed.matKhau, true)
        return
      } catch {
        window.sessionStorage.removeItem(parentLoginStorageKey(token))
      }
    }

    setState({ status: 'login' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const sdtTrimmed = sdt.trim()
    const matKhauTrimmed = matKhau.trim()

    if (!SDT_PATTERN.test(sdtTrimmed)) {
      setLoginError('Số điện thoại phải gồm đúng 10 chữ số, bắt đầu bằng số 0.')
      return
    }
    if (!matKhauTrimmed) {
      setLoginError('Vui lòng nhập mật khẩu.')
      return
    }

    loadProfile(sdtTrimmed, matKhauTrimmed)
  }

  function handleLogout() {
    if (token) window.sessionStorage.removeItem(parentLoginStorageKey(token))
    setSdt('')
    setMatKhau('')
    setLoginError(null)
    setState({ status: 'login' })
  }

  async function handleDoiMatKhauSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDoiMatKhauLoi(null)
    setDoiMatKhauThanhCong(false)

    if (!token || state.status !== 'success') return
    if (!matKhauMoi.trim()) {
      setDoiMatKhauLoi('Vui lòng nhập mật khẩu mới.')
      return
    }
    if (matKhauMoi.trim() !== matKhauXacNhan.trim()) {
      setDoiMatKhauLoi('Mật khẩu mới nhập lại không khớp.')
      return
    }

    setDoiMatKhauDangLuu(true)
    try {
      const ok = await dataSource.changeParentPassword(token, sdt, matKhauCu.trim(), matKhauMoi.trim())
      if (!ok) {
        setDoiMatKhauLoi('Mật khẩu hiện tại không đúng.')
        return
      }

      window.sessionStorage.setItem(
        parentLoginStorageKey(token),
        JSON.stringify({ sdt, matKhau: matKhauMoi.trim() }),
      )
      setMatKhau(matKhauMoi.trim())
      setMatKhauCu('')
      setMatKhauMoi('')
      setMatKhauXacNhan('')
      setDoiMatKhauThanhCong(true)
    } catch (error) {
      setDoiMatKhauLoi(error instanceof Error ? error.message : 'Không đổi được mật khẩu.')
    } finally {
      setDoiMatKhauDangLuu(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-200 pb-10">
      <div className="sticky top-0 z-40 border-b border-slate-300 bg-slate-100 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5</p>
            <h1 className="text-xl font-bold text-slate-900">Thông báo phụ huynh</h1>
          </div>
          {state.status === 'success' ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Đăng xuất
            </button>
          ) : null}
        </div>
      </div>

      <section className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
        {state.status === 'loading' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            Đang tải...
          </div>
        ) : null}

        {state.status === 'not_found' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Không tìm thấy trang</h2>
            <p className="mt-2 text-sm text-slate-600">Link không hợp lệ hoặc đã bị thay đổi.</p>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 text-sm text-amber-900">
            {state.message}
          </div>
        ) : null}

        {state.status === 'login' ? (
          <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-blue-600">Đăng nhập phụ huynh</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Xem thông báo của con</h2>
            <p className="mt-1 text-xs text-slate-500">
              Dùng đúng số điện thoại đã đăng ký với lớp (SĐT 1 hoặc SĐT 2). Mật khẩu mặc định là <b>123</b> nếu
              chưa từng đổi.
            </p>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Số điện thoại
                <input
                  autoFocus
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={sdt}
                  onChange={(event) => {
                    setSdt(event.target.value.replace(/\D/g, ''))
                    setLoginError(null)
                  }}
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Mật khẩu
                <input
                  type="password"
                  value={matKhau}
                  onChange={(event) => {
                    setMatKhau(event.target.value)
                    setLoginError(null)
                  }}
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {loginError ? (
                <p className="rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{loginError}</p>
              ) : null}

              <button
                type="submit"
                disabled={loggingIn}
                className="h-11 w-full rounded-md bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-100 p-4">
              <p className="text-xs font-semibold uppercase text-blue-700">Học sinh</p>
              <h2 className="text-xl font-bold text-slate-900">
                {state.profile.student.ho} {state.profile.student.ten}
              </h2>
              {state.profile.student.to ? (
                <p className="text-sm text-slate-600">Tổ {state.profile.student.to}</p>
              ) : null}
              {!state.profile.coMatKhauRieng ? (
                <p className="mt-2 rounded-md bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
                  Bạn đang dùng mật khẩu mặc định — nên đổi mật khẩu riêng để bảo mật hơn.
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setShowDoiMatKhau((value) => !value)
                  setDoiMatKhauLoi(null)
                  setDoiMatKhauThanhCong(false)
                }}
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                {showDoiMatKhau ? '▾ Đóng đổi mật khẩu' : '▸ Đổi mật khẩu'}
              </button>

              {showDoiMatKhau ? (
                <form onSubmit={handleDoiMatKhauSubmit} className="mt-3 space-y-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Mật khẩu hiện tại
                    <input
                      type="password"
                      value={matKhauCu}
                      onChange={(event) => setMatKhauCu(event.target.value)}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Mật khẩu mới
                    <input
                      type="password"
                      value={matKhauMoi}
                      onChange={(event) => setMatKhauMoi(event.target.value)}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Nhập lại mật khẩu mới
                    <input
                      type="password"
                      value={matKhauXacNhan}
                      onChange={(event) => setMatKhauXacNhan(event.target.value)}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  {doiMatKhauLoi ? (
                    <p className="rounded-md bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{doiMatKhauLoi}</p>
                  ) : null}
                  {doiMatKhauThanhCong ? (
                    <p className="rounded-md bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
                      Đã đổi mật khẩu thành công.
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={doiMatKhauDangLuu}
                    className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {doiMatKhauDangLuu ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                  </button>
                </form>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <h3 className="text-lg font-bold text-slate-900">Thông báo</h3>
                <p className="text-sm text-slate-600">Các thông báo từ giáo viên chủ nhiệm, mới nhất trước.</p>
              </div>

              {state.profile.thongBao.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Chưa có thông báo nào.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {state.profile.thongBao.map((thongBao) => (
                    <ThongBaoItem key={thongBao.id} thongBao={thongBao} onOpenChiTiet={setOpenMaKy} />
                  ))}
                </div>
              )}
            </div>

            <PlaceholderCard
              icon="📝"
              title="Ghi nhận của con"
              description="Sắp tới sẽ hiện được lịch sử vi phạm/khen thưởng của con ngay tại đây — tính năng đang xây dựng."
            />
            <PlaceholderCard
              icon="📊"
              title="Báo cáo tuần / tháng"
              description="Sắp tới sẽ hiện được báo cáo điểm rèn luyện, chuyên cần của con theo tuần/tháng — tính năng đang xây dựng."
            />

            {openMaKy && token ? (
              <ChiTietHocPhiModal
                token={token}
                sdt={sdt}
                matKhau={matKhau}
                maKy={openMaKy}
                onClose={() => setOpenMaKy(null)}
              />
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}

function ThongBaoItem({
  thongBao,
  onOpenChiTiet,
}: {
  thongBao: PublicParentProfile['thongBao'][number]
  onOpenChiTiet: (maKy: string) => void
}) {
  const isHocPhi = thongBao.loai_thong_bao === 'hoc_phi'
  const coTheXemChiTiet = isHocPhi && Boolean(thongBao.ma_ky)

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            isHocPhi ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {isHocPhi ? '💰 Học phí' : '📢 Thông báo'}
        </span>
        <span className="text-xs text-slate-400">{formatThoiGian(thongBao.created_at)}</span>
      </div>
      {thongBao.ghi_chu ? <p className="mt-1.5 text-xs font-semibold text-slate-500">{thongBao.ghi_chu}</p> : null}
      <p className="mt-1 wrap-break-word text-sm text-slate-800">{thongBao.noi_dung}</p>

      {coTheXemChiTiet ? (
        <button
          type="button"
          onClick={() => onOpenChiTiet(thongBao.ma_ky as string)}
          className="mt-2 text-xs font-semibold text-amber-700 hover:underline"
        >
          ▸ Xem chi tiết học phí
        </button>
      ) : null}
    </div>
  )
}

function ChiTietHocPhiModal({
  token,
  sdt,
  matKhau,
  maKy,
  onClose,
}: {
  token: string
  sdt: string
  matKhau: string
  maKy: string
  onClose: () => void
}) {
  const [chiTiet, setChiTiet] = useState<ChiTietHocPhi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    dataSource
      .getChiTietHocPhi(token, sdt, matKhau, maKy)
      .then((data) => {
        if (!active) return
        if (!data) {
          setError('Không tìm thấy chi tiết học phí cho kỳ này.')
          return
        }
        setChiTiet(data)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được chi tiết học phí.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, sdt, matKhau, maKy])

  const dongHienThi = chiTiet
    ? chiTiet.cot_hoc_phi
        .slice()
        .sort((left, right) => left.thu_tu - right.thu_tu)
        .map((cot) => ({ cot, giaTri: chiTiet.chi_tiet[cot.ma_cot] ?? 0 }))
        .filter(({ cot, giaTri }) => giaTri !== 0 || cot.an_neu_bang_khong === false)
    : []

  const coDongNo = dongHienThi.some(({ cot, giaTri }) => cot.loai === 'no' && giaTri !== 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase text-amber-700">Chi tiết học phí</p>
            <h3 className="text-lg font-bold text-slate-900">{chiTiet?.ten_ky || '...'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Đóng
          </button>
        </div>

        <div className="p-4">
          {loading ? <p className="text-sm text-slate-500">Đang tải...</p> : null}
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

          {chiTiet && !loading ? (
            <>
              {dongHienThi.length === 0 ? (
                <p className="text-sm text-slate-500">Không có khoản thu nào phát sinh trong kỳ này.</p>
              ) : (
                <div className="space-y-1.5">
                  {dongHienThi.map(({ cot, giaTri }) => (
                    <div key={cot.ma_cot} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 wrap-break-word text-slate-700">
                        {cot.loai === 'no'
                          ? giaTri > 0
                            ? `${cot.ten_cot} (Nợ kỳ trước)`
                            : giaTri < 0
                              ? `${cot.ten_cot} (Dư kỳ trước)`
                              : cot.ten_cot
                          : cot.ten_cot}
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${
                          (cot.loai === 'giam_tru' || cot.loai === 'no') && giaTri < 0
                            ? 'text-emerald-700'
                            : cot.loai === 'no' && giaTri > 0
                              ? 'text-red-700'
                              : cot.loai === 'giam_tru'
                                ? 'text-red-700'
                                : 'text-slate-900'
                        }`}
                      >
                        {cot.loai === 'giam_tru' && giaTri > 0 ? `-${formatTien(giaTri)}` : formatTien(giaTri)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                <span>Tổng cộng</span>
                <span>{formatTien(chiTiet.tong_thu)}</span>
              </div>

              {coDongNo ? (
                <p className="mt-2 text-xs italic text-slate-500">Đã bao gồm nợ/dư kỳ trước.</p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PlaceholderCard({
  description,
  icon,
  title,
}: {
  description: string
  icon: string
  title: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-4">
      <p className="text-sm font-bold text-slate-500">
        <span aria-hidden="true">{icon}</span> {title}
      </p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  )
}

function formatTien(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`
}

function formatThoiGian(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
