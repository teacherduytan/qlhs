import type { HocPhiKyThamChieu, NoiDungTinNhan } from '../../data/types'
import { buildHocPhiThongBaoText } from '../../lib/hocPhiSms'

// "Hien tai" = ban ghi da_duyet=true co created_at MOI NHAT - moi lan import
// la 1 ban ghi moi (khong upsert), lich su hinh thanh tu nhien qua nhieu lan
// import ma khong can khai bao "day la ky nao".
export function findCurrentMessage(messages: NoiDungTinNhan[]): NoiDungTinNhan | null {
  const approved = messages.filter((message) => message.da_duyet)
  if (approved.length === 0) return null

  return [...approved].sort((left, right) => (left.created_at < right.created_at ? 1 : -1))[0]
}

// Ky hoc phi MOI NHAT (theo created_at cua chinh hoc_phi_ky) ma 1 hoc sinh co
// mat (qua hoc_phi_tong) - dung lam nguon du phong sinh SMS khi giao vien
// chua tu soan noi_dung_tin_nhan nao moi hon (docs/hocphiPHxem/17-...md).
export function findLatestHocPhiKy(list: HocPhiKyThamChieu[], maHs: string): HocPhiKyThamChieu | null {
  const matched = list.filter((item) => item.ma_hs === maHs)
  if (matched.length === 0) return null

  return [...matched].sort((left, right) => (left.created_at < right.created_at ? 1 : -1))[0]
}

// Sinh noi dung SMS tu 1 ky hoc phi - dung chung 1 khuon cau voi thong bao
// tu tao luc import (xem src/lib/hocPhiSms.ts giai thich ly do BAT BUOC dung
// chung, khong duoc de 2 noi tu viet cau rieng).
export function buildSmsFromHocPhiKy(tenKy: string, tokenHoSo: string): string {
  return buildHocPhiThongBaoText(tenKy, tokenHoSo)
}

// Quy tac uu tien noi dung SMS dien san khi bam "Nhan tin" (muc 3.3 tai lieu
// 17): (1) noi_dung_tin_nhan da_duyet=true MOI HON ky hoc phi gan nhat - giao
// vien tu soan tay sau khi import van duoc uu tien; (2) khong co hoac cu hon
// thi dung cau tu sinh tu ky hoc phi gan nhat; (3) khong co ca hai (vd hoc
// sinh dang "can ra soat", chua khop ma_hs khi import hoc phi) - tra ve rong,
// giu nguyen hanh vi cu (khong loi).
export function resolveSmsBody(
  messages: NoiDungTinNhan[],
  hocPhiKyList: HocPhiKyThamChieu[],
  maHs: string,
  tokenHoSo: string,
): string {
  const current = findCurrentMessage(messages)
  const latestKy = findLatestHocPhiKy(hocPhiKyList, maHs)

  if (current && (!latestKy || current.created_at >= latestKy.created_at)) {
    return current.noi_dung
  }
  if (latestKy) {
    return buildSmsFromHocPhiKy(latestKy.ten_ky, tokenHoSo)
  }
  return current?.noi_dung || ''
}

export function formatMessageTimestamp(message: NoiDungTinNhan): string {
  const date = new Date(message.created_at)
  if (Number.isNaN(date.getTime())) return message.created_at

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
