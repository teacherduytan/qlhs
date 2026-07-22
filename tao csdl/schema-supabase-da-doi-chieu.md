# Schema Supabase đã đối chiếu với app hiện tại

Ngày đối chiếu: 22/07/2026

Nguồn đúng cuối cùng:
- `apps-script/SetupSheet.gs` — `TAB_SCHEMA`
- `apps-script/Code.gs` — API hiện hành C117 và các action CRUD/import
- `src/data/types.ts` — kiểu dữ liệu frontend đang dùng
- `docs/02-mo-hinh-du-lieu.md`, `docs/06-cai-tien-sau-trien-khai.md` — bối cảnh nghiệp vụ

Hai file `de-xuat-chuyen-doi-csdl-supabase.md` và `huong-dan-supabase-cli-migration.md` trong thư mục này là bản nháp/hướng dẫn. Không dùng nguyên schema 3 bảng trong đó để tạo bảng thật.

## Migration đã tạo

File migration thật:

```txt
supabase/migrations/20260722000100_tao_bang_ban_dau_qlhs.sql
```

Project-ref:

```txt
zupkcgfjkckrbemptaiv
```

## Bảng và cột thật

### `hoc_sinh`

Đối chiếu từ tab `HocSinh`:

```txt
ma_hs, tt, ho, ten, dien, nu, dan_toc, ngay_sinh,
sdt_1, sdt_2, ngay_nhap_hoc, ngay_roi_lop, to, token_ho_so,
la_co_do, anh_dai_dien, ghi_chu
```

### `phu_huynh`

Đối chiếu từ tab `PhuHuynh`:

```txt
ma_hs, ho_ten_ph, quan_he, sdt, uu_tien_lien_he
```

### `ban_can_su`

Đối chiếu từ tab `BanCanSu`:

```txt
ma_hs, chuc_vu, to, ngay_bat_dau
```

### `danh_muc_diem`

Đối chiếu từ tab `DanhMucDiem`:

```txt
ma_danh_muc, nhom, ten_muc, diem, nghiem_trong, pham_vi,
mo_ta, de_xuat_xu_ly, ma_xu_ly_de_xuat
```

### `danh_muc_xu_ly`

Đối chiếu từ tab `DanhMucXuLy`:

```txt
ma_xu_ly, ten_xu_ly, noi_dung_xu_ly, muc_do, ghi_chu
```

### `cau_hinh_tuan`

Đối chiếu từ tab `CauHinhTuan`:

```txt
tuan_so, tu_ngay, den_ngay, so_ngay, loai_tuan
```

### `ghi_nhan`

Đối chiếu từ tab `GhiNhan`:

```txt
ma_ghi_nhan, ma_hs, to_lien_quan, ngay, tuan_so, dien_tai_thoi_diem,
tiet, mon_hoc, loai, ma_danh_muc, noi_dung, so_lan, ly_do,
da_xu_ly, hinh_thuc_xu_ly, goi_phu_huynh, ghi_so_dau_bai, diem_so_mon,
diem_cong_tru, nguoi_ghi, nguon, ma_log_import,
trang_thai_xu_ly_tap_the, su_kien_goc
```

Lưu ý: `de_xuat_danh_muc` là dữ liệu tạm trong luồng Import/AI, không phải cột đang lưu trong tab `GhiNhan` hiện tại nên không đưa vào bảng `ghi_nhan`.

### `nhat_ky_import`

Đối chiếu từ tab `NhatKyImport`:

```txt
ma_log, thoi_gian, loai_du_lieu, so_dong, nguoi_thuc_hien,
trang_thai, duong_dan_file_goc, ghi_chu
```

## Bảo mật

Migration đã bật RLS cho toàn bộ bảng và chỉ cấp quyền API cho role `authenticated`.

Chưa mở anonymous policy cho hồ sơ học sinh public `/#/hs/<token>` trong migration đầu tiên. Khi chuyển frontend thật sang Supabase, cần thiết kế riêng RPC hoặc policy giới hạn theo token để không lộ dữ liệu học sinh.

## Keepalive

Đã thêm workflow:

```txt
.github/workflows/supabase-keepalive.yml
```

Cần thêm GitHub Actions secret:

```txt
SUPABASE_ANON_KEY
```

Workflow ping project mỗi 4 ngày để giảm nguy cơ Supabase free-tier bị pause khi nghỉ dài ngày.
