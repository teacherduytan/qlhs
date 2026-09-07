import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { CO_SO_OPTIONS, isValidCccd, isValidEmail, type Cs2StudentLookup } from './cs2Shared'
import { loadVnAddressData, wardLabel, wardsByProvince, type VnProvince, type VnWard } from './vnAddressData'

type Step = 'dinh-danh' | 'dien' | 'thanh-cong'

function formatDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

/** Trang cong khai (khong dang nhap) de hoc sinh CS2 tu tra cuu + dien Email/
 * Dia chi/CCCD. Xem quy trinh day du o docs/thuthapthongtincs2/16-...-hs-cs2.md. */
export function Cs2LookupPage() {
  const [step, setStep] = useState<Step>('dinh-danh')

  const [coSo, setCoSo] = useState(CO_SO_OPTIONS[0])
  const [lopOptions, setLopOptions] = useState<string[]>([])
  const [lopLoading, setLopLoading] = useState(false)
  const [lop, setLop] = useState('')
  const [maHs, setMaHs] = useState('')

  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [student, setStudent] = useState<Cs2StudentLookup | null>(null)

  const [email, setEmail] = useState('')
  const [soNha, setSoNha] = useState('')
  const [provinceCode, setProvinceCode] = useState('')
  const [wardCode, setWardCode] = useState('')
  const [cccd, setCccd] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const [addressData, setAddressData] = useState<{ provinces: VnProvince[]; wards: VnWard[] } | null>(null)

  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [soLanSauKhiGui, setSoLanSauKhiGui] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setLopLoading(true)
    setLop('')
    void getSupabaseClient()
      .rpc('danh_sach_lop_theo_co_so', { p_co_so: coSo })
      .then(({ data, error }) => {
        if (!active) return
        if (!error) setLopOptions((data as string[]) || [])
        setLopLoading(false)
      })
    return () => {
      active = false
    }
  }, [coSo])

  async function handleLookup() {
    setLookupError(null)
    if (!lop) {
      setLookupError('Vui lòng chọn lớp.')
      return
    }
    if (!maHs.trim()) {
      setLookupError('Vui lòng nhập mã học sinh.')
      return
    }
    setLookupLoading(true)
    try {
      const [{ data, error }, address] = await Promise.all([
        getSupabaseClient().rpc('tra_cuu_hoc_sinh', {
          p_ma_hs: maHs.trim(),
          p_lop: lop,
          p_co_so: coSo,
        }),
        loadVnAddressData(),
      ])
      if (error) throw error
      const found = data as Cs2StudentLookup
      setStudent(found)
      setEmail(found.email || '')
      setCccd(found.cccd || '')
      setAddressData(address)

      // Pre-fill lai dropdown Tinh/Xa tu ten da luu truoc do (khong luu code)
      // - khop dung ten hien thi voi danh sach dang tai, neu khong khop duoc
      // (vd du lieu hanh chinh sau nay thay doi) thi de trong, bat chon lai.
      const matchedProvince = found.dia_chi_tinh_thanh
        ? address.provinces.find((province) => province.fullName === found.dia_chi_tinh_thanh)
        : undefined
      setProvinceCode(matchedProvince?.code || '')
      const matchedWard =
        matchedProvince && found.dia_chi_phuong_xa
          ? wardsByProvince(address.wards, matchedProvince.code).find((ward) => wardLabel(ward) === found.dia_chi_phuong_xa)
          : undefined
      setWardCode(matchedWard?.code || '')
      setSoNha(found.dia_chi_so_nha || '')

      setStep('dien')
    } catch (error) {
      setLookupError(
        error instanceof Error && error.message
          ? error.message
          : 'Không tìm thấy học sinh với thông tin đã nhập, vui lòng kiểm tra lại.',
      )
    } finally {
      setLookupLoading(false)
    }
  }

  function validateFields(): boolean {
    if (!isValidEmail(email)) {
      setFieldError('Email không đúng định dạng.')
      return false
    }
    if (!soNha.trim()) {
      setFieldError('Vui lòng nhập số nhà, tên đường.')
      return false
    }
    if (!provinceCode) {
      setFieldError('Vui lòng chọn Tỉnh/Thành phố.')
      return false
    }
    if (!wardCode) {
      setFieldError('Vui lòng chọn Phường/Xã.')
      return false
    }
    if (!isValidCccd(cccd)) {
      setFieldError('Số CCCD/mã định danh phải gồm đúng 12 chữ số.')
      return false
    }
    setFieldError(null)
    return true
  }

  function openConfirm() {
    if (!validateFields()) return
    setShowConfirm(true)
  }

  const selectedProvince = addressData?.provinces.find((province) => province.code === provinceCode) || null
  const wardOptions = addressData ? wardsByProvince(addressData.wards, provinceCode) : []
  const selectedWard = wardOptions.find((ward) => ward.code === wardCode) || null

  async function handleConfirmSubmit() {
    if (!student || !selectedProvince || !selectedWard) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data, error } = await getSupabaseClient().rpc('cap_nhat_thongtin_hs', {
        p_ma_hs: student.ma_hs,
        p_lop: lop,
        p_co_so: coSo,
        p_email: email.trim(),
        p_dia_chi_so_nha: soNha.trim(),
        p_dia_chi_tinh_thanh: selectedProvince.fullName,
        p_dia_chi_phuong_xa: wardLabel(selectedWard),
        p_cccd: cccd.trim(),
      })
      if (error) throw error
      setSoLanSauKhiGui((data as { so_lan_sua_lienlac: number }).so_lan_sua_lienlac)
      setShowConfirm(false)
      setStep('thanh-cong')
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : 'Không gửi được thông tin, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 bg-slate-50 p-4">
      <div className="rounded-lg border border-indigo-200 bg-indigo-100 p-4">
        <h1 className="text-lg font-bold text-slate-900">Cập nhật thông tin liên lạc học sinh</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vui lòng tự tra cứu bằng Mã học sinh + Lớp, sau đó điền Email, Địa chỉ và Số CCCD (hoặc mã định danh cá nhân trên
          giấy khai sinh nếu chưa có CCCD).
        </p>
      </div>

      {step === 'dinh-danh' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Cơ sở
            <select
              value={coSo}
              onChange={(event) => setCoSo(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {CO_SO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Lớp
            <select
              value={lop}
              onChange={(event) => setLop(event.target.value)}
              disabled={lopLoading}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">{lopLoading ? 'Đang tải...' : '— Chọn lớp —'}</option>
              {lopOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Mã học sinh
            <input
              type="text"
              value={maHs}
              onChange={(event) => setMaHs(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {lookupError ? <p className="text-sm font-semibold text-red-700">{lookupError}</p> : null}

          <button
            type="button"
            onClick={() => void handleLookup()}
            disabled={lookupLoading}
            className="h-11 rounded-md bg-indigo-700 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {lookupLoading ? 'Đang tra cứu...' : 'Tra cứu'}
          </button>
        </div>
      ) : null}

      {step === 'dien' && student ? (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-semibold text-emerald-900">Xin chào, {student.ten_hs}</p>
            <p className="text-slate-600">
              Lớp {lop} · Mã HS {student.ma_hs}
            </p>
            {student.so_lan_sua_lienlac > 0 ? (
              <p className="mt-1 text-xs text-emerald-800">
                Đã cập nhật lần gần nhất: {formatDateTime(student.ngay_cap_nhat_lienlac)}, đã sửa {student.so_lan_sua_lienlac} lần.
              </p>
            ) : null}
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700">Địa chỉ nhà đang sinh sống</p>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Số nhà, tên đường
              <input
                type="text"
                value={soNha}
                onChange={(event) => setSoNha(event.target.value)}
                placeholder="VD: 12 Nguyễn Trãi"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Tỉnh/Thành phố
              <select
                value={provinceCode}
                onChange={(event) => {
                  setProvinceCode(event.target.value)
                  setWardCode('')
                }}
                disabled={!addressData}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{addressData ? '— Chọn Tỉnh/Thành phố —' : 'Đang tải danh sách...'}</option>
                {addressData?.provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Phường/Xã
              <select
                value={wardCode}
                onChange={(event) => setWardCode(event.target.value)}
                disabled={!provinceCode}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{provinceCode ? '— Chọn Phường/Xã —' : 'Chọn Tỉnh/Thành phố trước'}</option>
                {wardOptions.map((ward) => (
                  <option key={ward.code} value={ward.code}>
                    {wardLabel(ward)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Số CCCD (hoặc mã định danh cá nhân trên giấy khai sinh nếu chưa có CCCD)
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={cccd}
              onChange={(event) => setCccd(event.target.value.replace(/\D/g, ''))}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {fieldError ? <p className="text-sm font-semibold text-red-700">{fieldError}</p> : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('dinh-danh')}
              className="h-11 flex-1 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={openConfirm}
              className="h-11 flex-1 rounded-md bg-indigo-700 text-sm font-semibold text-white hover:bg-indigo-800"
            >
              Gửi
            </button>
          </div>
        </div>
      ) : null}

      {step === 'thanh-cong' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-3xl">✅</p>
          <p className="mt-2 text-base font-semibold text-emerald-900">Đã ghi nhận thông tin, cảm ơn em!</p>
          {soLanSauKhiGui !== null ? (
            <p className="mt-1 text-xs text-emerald-800">Đã sửa tổng cộng {soLanSauKhiGui} lần.</p>
          ) : null}
        </div>
      ) : null}

      {showConfirm && student ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">Xác nhận thông tin trước khi gửi</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Tên:</span> {student.ten_hs}
              </p>
              <p>
                <span className="font-semibold">Lớp:</span> {lop}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {email}
              </p>
              <p>
                <span className="font-semibold">Địa chỉ:</span> {soNha}
                {selectedWard ? `, ${wardLabel(selectedWard)}` : ''}
                {selectedProvince ? `, ${selectedProvince.fullName}` : ''}
              </p>
              <p>
                <span className="font-semibold">CCCD:</span> {cccd}
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">Bạn đã chắc chắn thông tin trên là chính xác chưa?</p>
            {submitError ? <p className="mt-2 text-sm font-semibold text-red-700">{submitError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="h-10 flex-1 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSubmit()}
                disabled={submitting}
                className="h-10 flex-1 rounded-md bg-indigo-700 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {submitting ? 'Đang gửi...' : 'Xác nhận gửi'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
