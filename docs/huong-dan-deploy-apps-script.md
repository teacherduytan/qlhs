# Triển khai Apps Script Web App

Sau khi dán `Code.gs` vào project Apps Script cùng `SetupSheet.gs` và `SeedData.gs`:

1. **Deploy** → **New deployment** → loại **Web app**
2. Execute as: **Me**
3. Who has access: **Anyone**
4. Copy **Web app URL** → đặt vào `.env` frontend hoặc GitHub Secret `VITE_APPS_SCRIPT_URL`.

```env
VITE_APPS_SCRIPT_URL=<URL Web app vừa copy>
```

Không đặt mật khẩu giáo viên hoặc secret ghi dữ liệu trong biến `VITE_*`, vì mọi biến `VITE_*` sẽ bị nhúng vào bundle JavaScript khi build.

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

Từ C060, vùng giáo viên dùng đăng nhập thật qua Apps Script:

1. Apps Script → **Project Settings** → **Script properties** → **Add script property**
2. Name: `QLHS_TEACHER_PASSWORD`
3. Value: mật khẩu giáo viên

Khi giáo viên đăng nhập, frontend gửi mật khẩu lên Apps Script. Apps Script so khớp với `QLHS_TEACHER_PASSWORD`, đúng thì trả về session token tạm lưu bằng `CacheService`. Frontend lưu token trong `sessionStorage` và gửi `teacher_session_token` cho các request ghi/sửa/xoá/import.

Property cũ `QLHS_WRITE_SECRET` và biến `VITE_APPS_SCRIPT_WRITE_SECRET` không còn dùng sau C060.

## GitHub Pages

GitHub Secret cần có:

```txt
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
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
| `teacher_login` | Đăng nhập giáo viên bằng `&password=...` |
| `verify_teacher_session` | Kiểm tra phiên giáo viên bằng `&teacher_session_token=...` |

## API — doPost (JSON body)

Từ C078, đăng nhập giáo viên và kiểm tra phiên dùng `doGet` để tránh lỗi `Failed to fetch` do redirect Apps Script trên trình duyệt. `doPost` chỉ dùng cho các thao tác ghi/sửa/xoá/import cần `teacher_session_token`.

**Ghi 1 dòng**:

```json
{
  "teacher_session_token": "...",
  "tab": "GhiNhan",
  "row": { "ma_hs": "HS001", "ngay": "2026-07-13" }
}
```

**Import hàng loạt**:

```json
{
  "teacher_session_token": "...",
  "import": true,
  "loai": "ghi_nhan",
  "nguoi_thuc_hien": "GVCN",
  "rows": [{ "...": "..." }]
}
```

`loai`: `hoc_sinh` | `ghi_nhan` | `phu_huynh` | `ban_can_su`

## Sheet ID

Mặc định trong `Code.gs`: `1-QrQtX59NdPMjmjsPUqxTJpL4M9tYt3AuA_S8Vv6woE`
