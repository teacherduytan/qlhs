import type { LoaiGhiNhan } from '../../data/types'

// Danh sach ly do hop co the chon (khong gom 'khen_thuong' - thu moi hop la
// de trao doi van de, khong phai bao tin vui) - nhan chu thuong de ghep tu
// nhien vao cau "V/v: Trao doi tinh hinh ... cua hoc sinh".
export const MEETING_REASON_OPTIONS: { value: LoaiGhiNhan; label: string; lowerLabel: string }[] = [
  { value: 'chuyen_can', label: 'Chuyên cần', lowerLabel: 'chuyên cần' },
  { value: 've_sinh', label: 'Vệ sinh', lowerLabel: 'vệ sinh' },
  { value: 'ne_nep', label: 'Nề nếp', lowerLabel: 'nề nếp' },
  { value: 'trat_tu_ky_luat', label: 'Trật tự - kỷ luật', lowerLabel: 'trật tự, kỷ luật' },
  { value: 'hoc_tap', label: 'Học tập', lowerLabel: 'học tập' },
]

export interface InvitationViolationRow {
  ngay: string
  tiet: string | null
  monHoc: string | null
  noiDung: string
}

/** 1 bo du lieu day du de xuat 1 la thu moi hop cho DUNG 1 hoc sinh/gia dinh. */
export interface InvitationData {
  hoTenHocSinh: string
  maHs: string
  to: number | null
  lyDoHop: string // cau "tinh hinh ..." da ghep san, vd "chuyên cần, nề nếp"
  tuNgay: string
  denNgay: string
  ngayHop: string
  gioHop: string
  diaDiemHop: string
  noiDungKhac: string
  violations: InvitationViolationRow[]
}
