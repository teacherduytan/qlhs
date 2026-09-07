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
  dia_chi_so_nha: string | null
  dia_chi_tinh_thanh: string | null
  dia_chi_phuong_xa: string | null
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

// Bang doi chieu Windows-1252 rieng cho vung byte 0x80-0x9F (khac Latin-1 o
// vung nay - Latin-1 coi day la ky tu dieu khien khong hien thi, Windows-1252
// (thuong dung boi Excel/cong cu Windows) gan cho cac ky tu in duoc nhu
// "…"/"'"/"–"...). Can dung dung bang nay khi doi nguoc tu ky tu ve byte,
// neu khong se doi sai/bo sot cac chu co dau nam trung vung byte nay (vd
// "ễ" = E1 BB 85 - byte cuoi 0x85 chi dung neu doi qua Windows-1252).
const WIN1252_CHAR_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

// Sua loi mojibake thuong gap trong file JSON xuat tu Excel/cong cu khac:
// chuoi UTF-8 dung bi doc nham thanh Windows-1252 roi luu lai thanh UTF-8
// lan 2, ra chuoi kieu "Huá»³nh Nguyá»n PhÃºc" thay vi "Huỳnh Nguyễn Phúc".
// Cach sua: doi tung ky tu ve lai byte goc (0x00-0x7F va 0xA0-0xFF giu
// nguyen gia tri, rieng 0x80-0x9F tra qua bang Windows-1252 o tren) roi giai
// ma lai bang UTF-8. Neu gap ky tu khong doi duoc ve byte hop le, hoac ket
// qua giai ma chua ky tu loi (U+FFFD), coi nhu chuoi da dung/khong sua duoc,
// tra ve nguyen ban - KHONG doan mo, tranh sinh du lieu sai cho ho ten hoc
// sinh (xem preview truoc khi import de ra soat them).
export function fixMojibake(text: string): string {
  if (!text) return text
  const chars = [...text]
  const bytes: number[] = []
  for (const ch of chars) {
    const codePoint = ch.codePointAt(0) ?? 0
    if (codePoint <= 0xff) {
      bytes.push(codePoint)
      continue
    }
    const mapped = WIN1252_CHAR_TO_BYTE[codePoint]
    if (mapped === undefined) return text
    bytes.push(mapped)
  }
  try {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes))
    return decoded.includes('�') ? text : decoded
  } catch {
    return text
  }
}

// Tach "ho_ten" day du thanh ho/ten (tu cuoi cung = ten, phan con lai = ho) -
// dung khi import hang loat khong co san 2 cot rieng.
export function splitHoTen(hoTen: string): { ho: string; ten: string } {
  const trimmed = hoTen.trim().replace(/\s+/g, ' ')
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace === -1) return { ho: '', ten: trimmed }
  return { ho: trimmed.slice(0, lastSpace), ten: trimmed.slice(lastSpace + 1) }
}
