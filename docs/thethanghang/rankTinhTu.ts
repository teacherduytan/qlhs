// ============================================================
// rankTinhTu.ts — Hệ thống bậc "tinh tú" theo tuần cho học sinh
// ------------------------------------------------------------
// Nguyên tắc: đây là DỮ LIỆU MẶC ĐỊNH (seed). Về lâu dài, bảng
// ngưỡng bậc + mức thưởng huy hiệu nên nằm trong Supabase và sửa
// được qua trang quản lý luật (xem tài liệu 11), để giáo viên
// tự chỉnh mà không cần deploy lại. File này là điểm khởi đầu
// và là nơi khai báo KIỂU dữ liệu dùng chung.
// ============================================================

export interface BacTinhTu {
  bac: number;            // 1..7, càng cao càng mạnh
  ma: string;             // định danh không dấu, dùng lưu DB / lịch sử
  ten: string;            // tên hiển thị
  icon: string;           // emoji biểu tượng
  diem_toi_thieu: number; // điểm tuần >= mốc này thì đạt bậc này
  mo_ta: string;          // câu ngắn cho học sinh hiểu ý nghĩa bậc
}

// Thang 7 bậc, mốc điểm tính trên thang 0..~112
// (điểm rèn luyện tối đa ~100 + thưởng huy hiệu). Giáo viên chỉnh
// diem_toi_thieu tuỳ độ khó mong muốn.
export const THANG_TINH_TU: BacTinhTu[] = [
  { bac: 1, ma: 'sao_bang',   ten: 'Sao Băng',   icon: '☄️', diem_toi_thieu: 0,  mo_ta: 'Vừa xuất hiện — khởi đầu của mọi hành trình.' },
  { bac: 2, ma: 'sao_nho',    ten: 'Sao Nhỏ',    icon: '⭐', diem_toi_thieu: 50, mo_ta: 'Bắt đầu toả sáng đều đặn.' },
  { bac: 3, ma: 'hanh_tinh',  ten: 'Hành Tinh',  icon: '🪐', diem_toi_thieu: 65, mo_ta: 'Đã có quỹ đạo ổn định, vững vàng.' },
  { bac: 4, ma: 'mat_trang',  ten: 'Mặt Trăng',  icon: '🌙', diem_toi_thieu: 75, mo_ta: 'Sáng rõ, ai nhìn vào cũng thấy được.' },
  { bac: 5, ma: 'mat_troi',   ten: 'Mặt Trời',   icon: '☀️', diem_toi_thieu: 85, mo_ta: 'Tự toả năng lượng, lan toả tích cực quanh mình.' },
  { bac: 6, ma: 'chom_sao',   ten: 'Chòm Sao',   icon: '✨', diem_toi_thieu: 95, mo_ta: 'Nhiều điểm sáng hợp lại — mẫu mực nhiều mặt.' },
  { bac: 7, ma: 'thien_ha',   ten: 'Thiên Hà',   icon: '🌌', diem_toi_thieu: 105, mo_ta: 'Bậc cao nhất — rực rỡ toàn diện.' },
];

// Mỗi huy hiệu đạt trong tuần cộng thêm bao nhiêu điểm thưởng.
// Cũng nên đưa vào bảng cấu hình trên web sau này.
export const DIEM_THUONG_MOI_HUY_HIEU = 4;

export interface KetQuaRank {
  diemRenLuyen: number;    // điểm gốc từ 4 nhóm CC/VS/NN/KL (0..100)
  diemThuong: number;      // tổng thưởng từ huy hiệu
  diemTuan: number;        // tổng cuối = gốc + thưởng
  bacHienTai: BacTinhTu;
  bacKeTiep: BacTinhTu | null;   // null nếu đã ở bậc cao nhất
  conThieu: number;              // còn bao nhiêu điểm để lên bậc kế tiếp (0 nếu max)
  phanTramToiKeTiep: number;     // 0..100, để vẽ thanh tiến độ
}

/**
 * Tính bậc tinh tú của 1 học sinh trong 1 tuần.
 * @param diemRenLuyen  điểm rèn luyện tuần (0..100) — lấy từ scoring.ts sẵn có
 * @param soHuyHieu     số huy hiệu đạt trong tuần
 */
export function tinhRankTuan(diemRenLuyen: number, soHuyHieu: number): KetQuaRank {
  const diemThuong = soHuyHieu * DIEM_THUONG_MOI_HUY_HIEU;
  const diemTuan = Math.round(diemRenLuyen + diemThuong);

  // bậc hiện tại = bậc cao nhất mà diemTuan vượt mốc
  const sapXep = [...THANG_TINH_TU].sort((a, b) => a.diem_toi_thieu - b.diem_toi_thieu);
  let bacHienTai = sapXep[0];
  for (const b of sapXep) {
    if (diemTuan >= b.diem_toi_thieu) bacHienTai = b;
  }

  const idx = sapXep.findIndex((b) => b.ma === bacHienTai.ma);
  const bacKeTiep = idx < sapXep.length - 1 ? sapXep[idx + 1] : null;

  let conThieu = 0;
  let phanTramToiKeTiep = 100;
  if (bacKeTiep) {
    conThieu = Math.max(0, bacKeTiep.diem_toi_thieu - diemTuan);
    const khoang = bacKeTiep.diem_toi_thieu - bacHienTai.diem_toi_thieu;
    const daDi = diemTuan - bacHienTai.diem_toi_thieu;
    phanTramToiKeTiep = khoang > 0 ? Math.min(100, Math.round((daDi / khoang) * 100)) : 100;
  }

  return { diemRenLuyen, diemThuong, diemTuan, bacHienTai, bacKeTiep, conThieu, phanTramToiKeTiep };
}
