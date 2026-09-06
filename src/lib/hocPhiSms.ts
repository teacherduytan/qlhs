// Dung chung boi CA 2 noi: SupabaseDataSource.ts (tang data - tu sinh dong
// "thong bao" trong noi_dung_tin_nhan ngay luc import hoc phi, C258/C261) VA
// messageContents.ts (tang feature - tu sinh noi dung SMS luc giao vien bam
// "Nhan tin", C262). Tach rieng ra file khong phu thuoc React/Supabase de ca
// 2 tang deu import duoc ma khong pha quy uoc "data layer khong phu thuoc
// feature layer".
//
// LY DO PHAI DUNG CHUNG (khong duoc de 2 noi tu viet cau rieng): thong bao
// hien tren trang phu huynh VA noi dung SMS gui that PHAI la 1 cau duy nhat
// (kem link /ph/:token) - neu khac nhau, `resolveSmsBody()` (uu tien noi
// dung MOI HON) se lay nham cau "thong bao" (sinh truoc, luc import) thay vi
// cau "SMS" (kem link) moi giao vien bam Nhan tin sau do, khien phu huynh
// nhan duoc SMS khong co link xem chi tiet - dung diem nay la loi da phat
// hien khi ra soat luong end-to-end (xem docs/06-cai-tien-sau-trien-khai.md
// C263).
export function boDauTiengViet(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

// Cau chung dung o CA 2 noi: noi_dung mac dinh cua thong bao "hoc_phi" (tao
// luc import) VA noi dung SMS tu sinh (dien san luc bam "Nhan tin" neu chua
// co gi moi hon). token la token_ho_so cua dung hoc sinh do (dinh danh doc
// duoc trang /ph/:token cua rieng em do).
export function buildHocPhiThongBaoText(tenKy: string, tokenHoSo: string): string {
  const link = `${window.location.origin}${window.location.pathname}#/ph/${tokenHoSo}`
  return boDauTiengViet(`${tenKy}. Xem chi tiet va so tien cu the tai: ${link}`)
}
