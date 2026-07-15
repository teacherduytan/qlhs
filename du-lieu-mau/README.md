# Dữ liệu mẫu — trích từ file điểm danh thật

Nguồn: `Diem_danh_11C5_11-07-2026_data_đầu_vào_cho_app_.xlsx` (anh cung cấp ngày 11/07/2026), sheet `11C5` (danh sách gốc).

## File trong thư mục này

| File | Mô tả |
|------|--------|
| `hocsinh_seed.json` | 36 học sinh, đúng cấu trúc tab `HocSinh` (tài liệu 02) — dùng cho C004 / Import C016 |
| `hocsinh_seed.csv` | Cùng dữ liệu, CSV để dán vào Google Sheet |
| `cau_hinh_tuan_seed.json` | Tuần 1 (06–10/07) và Tuần 2 (13–17/07/2026) |
| `danh_muc_diem_seed.json` | 36 mục điểm theo quy chế trường và các mục tích cực KT (dùng làm danh mục ban đầu; khi app đã chạy thì DanhMucDiem trên Sheet là nguồn hiện hành) |
| `mau-import-ghinhan.json` | Mẫu JSON import ghi nhận đủ các tình huống: cá nhân, học tập, nề nếp, tập thể, tổ trực |
| `mau-prompt-chuyen-doi-json.md` | Prompt copy-dán cho AI khi chuyển ảnh phiếu giấy thành JSON; mọi vi phạm/tích cực phải khớp mã đang có trong DanhMucDiem, chỉ `hoc_tap` được không có mã |

## Quy tắc chuyển đổi đã áp dụng

| Trường gốc trong Excel | Trường trong `HocSinh` | Ghi chú |
|---|---|---|
| `TT` | `tt` | Giữ nguyên số thứ tự gốc để đối chiếu. |
| `HỌ` + `TÊN` | `ho` + `ten` | Giữ tách riêng đúng như bản gốc. |
| `DIỆN` | `dien` | `2B` / `BT` / `NT` — xem tài liệu 02. |
| `NỮ` (x/trống) | `nu` (true/false) | |
| `DÂN TỘC`, `NGÀY SINH`, `ĐIỆN THOẠI 1/2` | giữ nguyên tên, đổi định dạng ngày sang `YYYY-MM-DD` | |
| *(không có trong Excel)* | `ma_hs` | Tự sinh `HS001`–`HS036` theo `TT`. |
| *(không có trong Excel)* | `token_ho_so` | Chuỗi ngẫu nhiên 8 ký tự (tài liệu 01 mục 6). |
| *(không có trong Excel)* | `la_co_do` | Mặc định `false` — **cần xác nhận em nào thuộc đội cờ đỏ**. |

## Cần anh xác nhận trước khi nạp chính thức

- 2 học sinh thiếu ngày sinh và SĐT: **Trần Huy Phúc (HS035)**, **Đỗ Tâm Nhi (HS036)**.
- **Nguyễn Văn Chính (HS003)**: diện đổi từ `BT` → `2B` — dữ liệu lịch sử tuần trước không bị đổi theo (tài liệu 01 mục 7).

## Nạp vào Google Sheet

Chạy `seedInitialData` trong `apps-script/SeedData.gs` sau khi đã tạo Sheet bằng `setupQLHSSheet` (C003), hoặc dán CSV vào tab tương ứng.
