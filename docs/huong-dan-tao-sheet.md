# Hướng dẫn tạo Google Sheet — QLHS_11C5_2025-2026

Commit **C003**: tạo file Sheet chuẩn hóa theo [02-mo-hinh-du-lieu.md](02-mo-hinh-du-lieu.md).

## Cách 1 — Tự động (khuyến nghị)

1. Mở [Google Apps Script](https://script.google.com) → **Dự án mới**.
2. Xóa nội dung mặc định, dán toàn bộ file `apps-script/SetupSheet.gs` từ repo.
3. Chọn hàm **`setupQLHSSheet`** trong dropdown → bấm **Run** (Chạy).
4. Cấp quyền truy cập Google Drive/Sheets khi được hỏi.
5. Vào **Nhật ký thực thi** (Executions) → xem URL Sheet vừa tạo.

Kết quả mong đợi:

- File tên **`QLHS_11C5_2025-2026`**
- Đủ **7 tab**: `HocSinh`, `PhuHuynh`, `BanCanSu`, `DanhMucDiem`, `CauHinhTuan`, `GhiNhan`, `NhatKyImport`
- Tab `DanhMucDiem` có **31 dòng** (CC/VS/NN/KL), mỗi dòng có cột `pham_vi`

## Cách 2 — Thủ công

1. Tạo Google Sheet mới, đổi tên `QLHS_11C5_2025-2026`.
2. Tạo 7 tab, đặt tên và hàng tiêu đề đúng như bảng trong tài liệu 02.
3. Import tab `DanhMucDiem` từ file `du-lieu-mau/danh_muc_diem_seed.json` (chuyển sang CSV hoặc dán tay).

## Kiểm tra sau khi tạo

| Kiểm tra | Kỳ vọng |
|----------|---------|
| Số tab | 7 |
| `DanhMucDiem` | 31 dòng dữ liệu + 1 hàng tiêu đề |
| `pham_vi` | Mỗi mục có giá trị `ca_nhan`, `tap_the`, hoặc `to_truc` |
| `nghiem_trong` | `TRUE` cho KL06, KL09, KL11, KL12, KL13 |
| Các tab còn lại | Chỉ có hàng tiêu đề (dữ liệu nạp ở C004) |

## Bước tiếp theo

- **C004**: Chạy `seedInitialData(spreadsheetId)` sau `setupQLHSSheet` — nạp 36 học sinh + 2 tuần. Xem `apps-script/SeedData.gs` và `du-lieu-mau/`.
