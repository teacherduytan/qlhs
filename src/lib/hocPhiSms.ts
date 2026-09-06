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

function buildHocPhiLink(tokenHoSo: string): string {
  return `${window.location.origin}${window.location.pathname}#/ph/${tokenHoSo}`
}

// Cau chung dung o CA 2 noi: noi_dung mac dinh cua thong bao "hoc_phi" (tao
// luc import) VA noi dung SMS tu sinh (dien san luc bam "Nhan tin" neu chua
// co gi moi hon). token la token_ho_so cua dung hoc sinh do (dinh danh doc
// duoc trang /ph/:token cua rieng em do).
export function buildHocPhiThongBaoText(tenKy: string, tokenHoSo: string): string {
  return boDauTiengViet(`${tenKy}. Xem chi tiet va so tien cu the tai: ${buildHocPhiLink(tokenHoSo)}`)
}

// Noi them link ca nhan hoa vao CUOI 1 doan van ban da soan san (vd noi_dung
// SMS chi tiet giao vien tu viet tay kem so tai khoan/han dong, truyen qua
// field "noi_dung_thong_bao" trong JSON import hoc phi - xem
// docs/hocphiPHxem/16-nguyen-tac-de-ai-tao-json-hoc-phi.md). Khong ghi de
// toan bo cau nhu truoc (C258/C261) - giu nguyen van ban giao vien da soan,
// chi noi them link o cuoi de phu huynh van bam vao xem duoc chi tiet dong
// (yeu cau nguoi dung: "nội dung như trong json này và + link xem chi tiết
// của mỗi phụ huynh"). Neu van ban da co san 1 link "/ph/" roi (vd giao vien
// tu dien tay tu file mau hocphi_thang9_import_v2_link.json) thi KHONG noi
// them nua, tranh 2 link trung nhau trong cung 1 tin.
export function appendHocPhiLink(text: string, tokenHoSo: string): string {
  const trimmed = text.trim()
  if (trimmed.includes('/ph/')) return boDauTiengViet(trimmed)

  return boDauTiengViet(`${trimmed} Xem chi tiet tai: ${buildHocPhiLink(tokenHoSo)}`)
}
