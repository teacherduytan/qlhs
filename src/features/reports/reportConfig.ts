// Hang so dung chung cho moi bao cao (Tuan/Thang/Hoc ky/Nam hoc sau nay),
// tranh hardcode rai rac trong tung file export.
export const REPORT_CONFIG = {
  tenTruong: 'TRƯỜNG THCS VÀ THPT LẠC HỒNG',
  tenLop: '11C5',
  namHoc: '2025 - 2026',
  tenGvcn: 'Nguyễn Duy Tân',
  diaDiemKy: 'TP. Hồ Chí Minh', // dùng ở dòng ngày ký cuối báo cáo
}

export interface ReportPresentationMeta {
  title: string
  subtitle: string
  soHocSinh: number
  banCanSuSignatures: BanCanSuSignature[]
}

export interface BanCanSuSignature {
  chucVu: string
  hoTen: string
}

// Chi lay chuc vu cap lop (bo qua "Khong giu chuc vu" va "To truong"/"To pho"
// vi do la chuc vu theo tung to, so luong thay doi va khong phai dai dien
// chung cho ca lop khi ky xac nhan bao cao).
export const BAN_CAN_SU_SIGNATURE_ROLES = [
  'Lớp trưởng',
  'Lớp phó học tập',
  'Lớp phó lao động',
  'Lớp phó kỷ luật',
  'Bí thư chi đoàn',
]
