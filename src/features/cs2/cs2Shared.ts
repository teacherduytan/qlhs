// Hang so + kieu du lieu dung chung giua trang public (Cs2LookupPage) va
// trang quan tri (Cs2AdminPage) cua tinh nang thu thap thong tin lien lac/
// CCCD hoc sinh CS2 - xem docs/thuthapthongtincs2/16-...-hs-cs2.md.
//
// Tach rieng khoi DataSource/HocSinh cua app 11C5: day la tinh nang doc lap,
// dung truc tiep Supabase client + cac RPC rieng, khong di qua abstraction
// DataSource (von dung cho cac thao tac gan voi 40 hoc sinh 11C5).

// Chi co CS2 co du lieu hien tai - de day thanh mang de mo rong sau nay
// (vd them CS1) ma khong phai doi logic dropdown.
export const CO_SO_OPTIONS = ['CS2']

// Tai khoan dung chung cho trang quan tri (spec 16, muc 6.1): nguoi dung go
// "admincs2/admincs2", nhung Supabase Auth can dinh dang email - anh xa sang
// 1 email co dinh noi bo, khong hien thi ra ngoai.
export const CS2_ADMIN_LOGIN = 'admincs2'
export const CS2_ADMIN_EMAIL = 'admincs2@qlhs-cs2.local'

export interface Cs2StudentLookup {
  ma_hs: string
  ten_hs: string
  email: string | null
  dia_chi_hien_tai: string | null
  cccd: string | null
  so_lan_sua_lienlac: number
  ngay_cap_nhat_lienlac: string | null
}

export function maskCccd(cccd: string | null): string {
  if (!cccd) return '—'
  if (cccd.length <= 6) return cccd
  return `${cccd.slice(0, 6)}${'*'.repeat(cccd.length - 8)}${cccd.slice(-2)}`
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidCccd(value: string): boolean {
  return /^[0-9]{12}$/.test(value.trim())
}

// Auto-capitalize chu cai dau moi tu (dung khi them nhanh HS moi o trang quan
// tri) - "nguyễn văn a" -> "Nguyễn Văn A".
export function autoCapitalizeName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word[0].toLocaleUpperCase('vi') + word.slice(1).toLocaleLowerCase('vi') : word))
    .join(' ')
}

export function hasDigitOrSpecialChar(value: string): boolean {
  // Cho phep chu cai (co dau tieng Viet) + khoang trang, chan so va ky tu dac biet.
  return /[^A-Za-zÀ-ỹà-ỹĐđ\s]/.test(value)
}
