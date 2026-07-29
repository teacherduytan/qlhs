// Hang so dung chung cho moi bao cao (Tuan/Thang/Hoc ky/Nam hoc sau nay),
// tranh hardcode rai rac trong tung file export.
export const REPORT_CONFIG = {
  tenTruong: 'TRƯỜNG THCS VÀ THPT LẠC HỒNG',
  tenLop: '11C5',
  namHoc: '2025 - 2026',
  tenGvcn: '[Điền tên GVCN]', // TODO: giáo viên tự điền tên thật trước khi dùng
  diaDiemKy: 'TP. Hồ Chí Minh', // dùng ở dòng ngày ký cuối báo cáo
}

export interface ReportPresentationMeta {
  title: string
  subtitle: string
  soHocSinh: number
}
