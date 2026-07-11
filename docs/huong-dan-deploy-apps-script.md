# Triển khai Apps Script Web App

Sau khi dán `Code.gs` vào project Apps Script (cùng `SetupSheet.gs`, `SeedData.gs`):

1. **Deploy** → **New deployment** → loại **Web app**
2. Execute as: **Me**
3. Who has access: **Anyone** (hoặc Anyone with Google account — tùy chính sách trường)
4. Copy **Web app URL** → đặt vào `.env` frontend:

```
VITE_APPS_SCRIPT_URL=<URL vừa copy>
```

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
{ "tab": "GhiNhan", "row": { "ma_hs": "HS001", "ngay": "2026-07-13", ... } }
```

**Import hàng loạt** (C013):

```json
{
  "import": true,
  "loai": "ghi_nhan",
  "nguoi_thuc_hien": "GVCN",
  "rows": [ { ... }, { ... } ]
}
```

`loai`: `hoc_sinh` | `ghi_nhan` | `phu_huynh` | `ban_can_su`

## Sheet ID

Mặc định trong `Code.gs`: `1-QrQtX59NdPMjmjsPUqxTJpL4M9tYt3AuA_S8Vv6woE`
