# Triển khai Apps Script Web App

> **Đã ngừng dùng từ C132.** Từ C132, frontend không còn gọi Apps Script cho bất kỳ
> thao tác nào — kể cả tạo link Google Form điểm danh (nay là RPC Supabase
> `tao_link_form_diem_danh`, xem `docs/06-cai-tien-sau-trien-khai.md`). Tài liệu này
> chỉ còn giá trị tham khảo lịch sử; không cần deploy lại Apps Script cho bản mới.

Sau khi dán `Code.gs` vào project Apps Script cùng `SetupSheet.gs` và `SeedData.gs`:

1. **Deploy** → **New deployment** → loại **Web app**
2. Execute as: **Me**
3. Who has access: **Anyone**
4. Copy **Web app URL** → đặt vào `.env` frontend hoặc GitHub Secret `VITE_APPS_SCRIPT_URL`.

```env
VITE_APPS_SCRIPT_URL=<URL Web app vừa copy>
VITE_SUPABASE_URL=https://zupkcgfjkckrbemptaiv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key trong Supabase Settings -> API>
```

Không đặt `service_role` key hoặc secret ghi dữ liệu trong biến `VITE_*`. `anon` key Supabase được phép nằm ở frontend vì quyền thật do Supabase Auth/RLS kiểm soát.

## Web App URL Hiện Hành

```txt
https://script.google.com/macros/s/AKfycby8hopCcnoo_DsnihG0wrDL7bE9VPTbsG3tnZQkK4zEyqalxQV4Ov-zMxrYF57YfRHB/exec
```

Health check bản đang chạy:

```txt
https://script.google.com/macros/s/AKfycby8hopCcnoo_DsnihG0wrDL7bE9VPTbsG3tnZQkK4zEyqalxQV4Ov-zMxrYF57YfRHB/exec?action=api_health
```

## Cập Nhật Deployment Đúng Cách

Khi sửa `Code.gs`, nên giữ nguyên deployment Web app đang dùng để không phải đổi URL trong frontend.

1. Mở Apps Script → **Deploy** → **Manage deployments**
2. Chọn deployment Web app đang dùng → biểu tượng bút chì
3. Version: chọn **New version**
4. Kiểm tra lại:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Bấm **Deploy**

Nếu lỡ tạo deployment mới, URL Web app sẽ đổi. Khi đó cần cập nhật lại GitHub Secret `VITE_APPS_SCRIPT_URL`, rồi chạy lại workflow GitHub Pages.

## Script Property Bắt Buộc

Từ C119, vùng giáo viên đăng nhập bằng **Supabase Auth**. Apps Script vẫn xử lý một số thao tác ghi/Import/Báo cáo sĩ số trong giai đoạn chuyển đổi, nên Apps Script cần xác minh Supabase access token.

1. Apps Script → **Project Settings** → **Script properties** → **Add script property**
2. Thêm các property:

| Name | Giá trị |
|---|---|
| `SUPABASE_URL` | `https://zupkcgfjkckrbemptaiv.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key trong Supabase Settings → API |

Frontend đăng nhập bằng Supabase Auth, Supabase tự lưu phiên. Khi gọi Apps Script để ghi/sửa/xoá/import, frontend gửi `supabase_access_token`; Apps Script gọi Supabase Auth API để xác minh token còn hợp lệ rồi mới cho ghi dữ liệu.

Property cũ `QLHS_TEACHER_PASSWORD` chỉ còn là fallback legacy cho bản frontend cũ, không còn là luồng đăng nhập chính. Property cũ `QLHS_WRITE_SECRET` và biến `VITE_APPS_SCRIPT_WRITE_SECRET` không còn dùng sau C060.

## Script Property Cho Báo Cáo Sĩ Số

Từ C116, tính năng **Báo cáo sĩ số** đọc file điểm danh sống và tạo link Google Form prefill ở backend. Cần thêm các Script properties sau, không đưa vào `.env` frontend:

| Name | Giá trị |
|---|---|
| `ATTENDANCE_SPREADSHEET_ID` | ID Google Sheet điểm danh `Diem_danh_11C5` |
| `ATTENDANCE_FORM_ENTRIES_JSON` | JSON mapping Google Form theo cấu trúc trong `docs/spec-bao-cao-si-so.md`, gồm `form_base_url`, `form_password`, `questions[]` |
| `ATTENDANCE_FORM_BASE_URL` | Tuỳ chọn nếu không đặt `form_base_url` trong JSON |
| `ATTENDANCE_FORM_PASSWORD` | Tuỳ chọn nếu không đặt `form_password` trong JSON |
| `ATTENDANCE_CLASS_NAME` | Tuỳ chọn, mặc định `11C5` |

`ATTENDANCE_FORM_ENTRIES_JSON` có thể dán nguyên JSON:

```json
{
  "form_base_url": "https://docs.google.com/forms/d/e/XXXXXXXXXXXX/viewform",
  "form_password": "mat-khau-form",
  "questions": [
    { "title": "Nhập Password", "entry": "entry.111111" },
    { "title": "NGÀY", "entry": "entry.222222" }
  ]
}
```

Apps Script chỉ trả về URL prefill cuối cùng cho frontend. Frontend không biết entry ID hoặc mật khẩu form, và app không tự bấm Gửi thay giáo viên.

## GitHub Pages

GitHub Secret cần có:

```txt
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
VITE_SUPABASE_URL=https://zupkcgfjkckrbemptaiv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Sau khi đổi URL Apps Script:

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Cập nhật secret `VITE_APPS_SCRIPT_URL`
3. GitHub repo → **Actions** → **Deploy GitHub Pages**
4. Chạy lại workflow

## API — doGet (`?action=...`)

| action | Mô tả |
|--------|------|
| `students` | Danh sách học sinh |
| `student_by_token` | `&token=x7fA9k2Q` |
| `records` | Ghi nhận (`&ma_hs=HS001` tuỳ chọn) |
| `danh_muc_diem` | Danh mục điểm |
| `cau_hinh_tuan` | Cấu hình tuần |
| `ban_can_su` | Ban cán sự |
| `phu_huynh` | Phụ huynh |
| `nhat_ky_import` | Nhật ký import |
| `api_health` | Kiểm tra version backend và action hỗ trợ |
| `teacher_login` | Legacy: đăng nhập giáo viên bằng Apps Script password cho bản frontend cũ |
| `verify_teacher_session` | Legacy/debug: kiểm tra phiên bằng `teacher_session_token` hoặc `supabase_access_token` |

## API — doPost (JSON body)

Từ C119, frontend đăng nhập bằng Supabase Auth. `doPost` dùng cho các thao tác ghi/sửa/xoá/import cần `supabase_access_token`.

**Ghi 1 dòng**:

```json
{
  "supabase_access_token": "...",
  "tab": "GhiNhan",
  "row": { "ma_hs": "HS001", "ngay": "2026-07-13" }
}
```

**Import hàng loạt**:

```json
{
  "supabase_access_token": "...",
  "import": true,
  "loai": "ghi_nhan",
  "nguoi_thuc_hien": "GVCN",
  "rows": [{ "...": "..." }]
}
```

`loai`: `hoc_sinh` | `ghi_nhan` | `phu_huynh` | `ban_can_su`

**Báo cáo sĩ số**:

```json
{
  "supabase_access_token": "...",
  "action": "calculate_attendance_report",
  "ngay": "2026-07-20",
  "buoi": "SANG",
  "tre_tinh_co_mat": true
}
```

```json
{
  "supabase_access_token": "...",
  "action": "build_attendance_form_url",
  "payload": {
    "ngay": "2026-07-20",
    "buoi": "SANG",
    "co_mat": { "NT": 10, "BT": 20, "2B": 5 },
    "vang": ["Nguyễn Văn A (BT)"],
    "so_mon": {}
  }
}
```

## Sheet ID

Mặc định trong `Code.gs`: `1-QrQtX59NdPMjmjsPUqxTJpL4M9tYt3AuA_S8Vv6woE`
