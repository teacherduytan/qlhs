# Triển khai Apps Script Web App

Sau khi dán `Code.gs` vào project Apps Script (cùng `SetupSheet.gs`, `SeedData.gs`):

1. **Deploy** → **New deployment** → loại **Web app**
2. Execute as: **Me**
3. Who has access: **Anyone**
4. Copy **Web app URL** → đặt vào `.env` frontend:

```
VITE_APPS_SCRIPT_URL=<URL vừa copy>
VITE_APPS_SCRIPT_WRITE_SECRET=<chuỗi bí mật giống Script Property bên dưới>
```

## Cập nhật deployment đúng cách

Khi sửa `Code.gs`, không tạo deployment mới nếu muốn giữ nguyên URL đang dùng trong web app.

1. Mở Apps Script → **Deploy** → **Manage deployments**
2. Chọn deployment Web app đang dùng → biểu tượng bút chì
3. Version: chọn **New version**
4. Kiểm tra lại:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Bấm **Deploy**

Nếu lỡ tạo deployment mới, cần copy URL mới vào `.env` và cấu hình deploy frontend lại.

## Script Property bắt buộc

Từ C028, mọi request ghi (`doPost`) cần có mã bí mật. Trong Apps Script:

1. Project Settings → Script properties → **Add script property**
2. Name: `QLHS_WRITE_SECRET`
3. Value: một chuỗi dài ngẫu nhiên
4. Dùng đúng chuỗi đó cho `VITE_APPS_SCRIPT_WRITE_SECRET` trong `.env`

Gọi `doPost` thiếu hoặc sai mã sẽ bị từ chối và Sheet không đổi.

## API — doGet (`?action=...`)

| action | Mô tả |
|--------|--------|
| `students` | Danh sách học sinh |
| `student_by_token` | `&token=x7fA9k2Q` |
| `records` | Ghi nhận (`&ma_hs=HS001` tùy chọn) |
| `danh_muc_diem` | Danh mục điểm |
| `cau_hinh_tuan` | Cấu hình tuần |
| `ban_can_su` | Ban cán sự |
| `phu_huynh` | Phụ huynh |
| `nhat_ky_import` | Nhật ký import |

## API — doPost (JSON body)

**Ghi 1 dòng** (C012):

```json
{
  "write_secret": "...",
  "tab": "GhiNhan",
  "row": { "ma_hs": "HS001", "ngay": "2026-07-13" }
}
```

**Import hàng loạt** (C013):

```json
{
  "write_secret": "...",
  "import": true,
  "loai": "ghi_nhan",
  "nguoi_thuc_hien": "GVCN",
  "rows": [ { ... }, { ... } ]
}
```

`loai`: `hoc_sinh` | `ghi_nhan` | `phu_huynh` | `ban_can_su`

## Sheet ID

Mặc định trong `Code.gs`: `1-QrQtX59NdPMjmjsPUqxTJpL4M9tYt3AuA_S8Vv6woE`
