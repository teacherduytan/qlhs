# 11 — Thư viện tài liệu học sinh (đính kèm ảnh/tài liệu)

> File này dành cho AI coding agent (Claude Code / Cursor) triển khai trực tiếp vào dự án QLHS.
> Tham chiếu: `docs/06-cai-tien-sau-trien-khai.md` (nhật ký commit). Đánh số commit tiếp theo là **C0XX**.
>
> **File này thay thế hoàn toàn bản trước `11-dinh-kem-anh-bien-ban-vi-pham.md`** (bản cũ gắn chặt tài liệu vào 1 `ghi_nhan`). Nếu bản cũ đã được triển khai, xem mục 9 để biết cách chuyển đổi dữ liệu. Nếu chưa triển khai, bỏ qua bản cũ hoàn toàn, dùng file này.

## 1. Mục tiêu

Luồng sử dụng thực tế: GVCN chụp ảnh giấy tờ (bản cam kết, bản tường trình, đơn xin phép...) → mở app → bấm "Tải lên tài liệu" → chọn:
- **Loại tài liệu**: dropdown có sẵn (Bản tường trình, Bản kiểm điểm, Bản cam kết, Đơn xin phép...), **tự thêm loại mới được** ngay tại chỗ
- **Ngày viết**: ngày trên văn bản (giáo viên tự nhập, khác với ngày tải lên)
- **Học sinh liên quan**: chọn 1 hoặc nhiều, có ô tìm kiếm nhanh theo tên

Ngày tải lên do hệ thống tự ghi, không cho sửa tay.

Sau khi lưu, tài liệu xuất hiện ở 2 nơi:
- **Thư viện tài liệu chung** — lọc/tìm kiếm theo loại, học sinh, khoảng ngày viết
- **Trang cá nhân của từng học sinh liên quan** — nếu chọn nhiều học sinh, tài liệu hiện ở trang của tất cả

**Phạm vi sử dụng: nội bộ giáo viên/nhà trường**, phụ huynh không xem được qua trang công khai.

**Khác biệt so với bản v1:** tài liệu **không bắt buộc** gắn với 1 `ghi_nhan` cụ thể — vì nhiều loại (như "Đơn xin phép") không liên quan vi phạm nào. Liên kết với `ghi_nhan` trở thành **tuỳ chọn**, chỉ cần khi muốn tài liệu được tính vào báo cáo tái phạm ở file `12-...` (xem mục 3 và mục 6).

Không giới hạn cứng số lượng tài liệu hay số học sinh liên kết trên 1 tài liệu — chỉ giới hạn qua dung lượng file.

## 2. Vì sao Supabase Storage

Dự án đã dùng Supabase cho DB + Auth. Bucket **private**, RLS đồng bộ Auth, gói free 1GB đủ dùng nhiều năm nếu ảnh được nén trước khi upload (mục 5). Không dùng dịch vụ ảnh public (ImgBB/Imgur...) vì đây là tài liệu học sinh cần kiểm soát quyền xem.

## 3. Thay đổi CSDL

Ba bảng mới, thay thế `tep_dinh_kem` của bản v1:

```sql
-- Danh mục loại tài liệu — MỞ RỘNG ĐƯỢC qua UI, không cần sửa code khi thêm loại mới
create table if not exists danh_muc_tai_lieu (
  id uuid primary key default gen_random_uuid(),
  ten text not null unique,
  thu_tu integer not null default 0,
  tinh_la_cam_ket boolean not null default false,  -- xem giải thích bên dưới
  active boolean not null default true
);

insert into danh_muc_tai_lieu (ten, thu_tu, tinh_la_cam_ket) values
  ('Bản tường trình', 1, false),
  ('Bản kiểm điểm', 2, true),
  ('Bản cam kết', 3, true),
  ('Đơn xin phép', 4, false),
  ('Khác', 99, false)
on conflict (ten) do nothing;

-- Tài liệu đã upload
create table if not exists tai_lieu (
  id uuid primary key default gen_random_uuid(),
  danh_muc_tai_lieu_id uuid not null references danh_muc_tai_lieu(id),
  ghi_nhan_id uuid references ghi_nhan(id) on delete set null,  -- NULLABLE, tuỳ chọn
  duong_dan_luu_tru text not null,
  ten_file_goc text,
  loai_tep text,               -- MIME type
  kich_thuoc_byte integer,
  ngay_viet date,               -- ngày trên văn bản, giáo viên tự nhập
  ghi_chu text,
  nguoi_tai_len uuid references auth.users(id),
  thoi_gian_tai_len timestamptz not null default now()   -- tự động, không cho sửa tay
);

-- Liên kết nhiều-nhiều: 1 tài liệu có thể thuộc nhiều học sinh
create table if not exists tai_lieu_hoc_sinh (
  tai_lieu_id uuid not null references tai_lieu(id) on delete cascade,
  ma_hs text not null references hoc_sinh(ma_hs),
  primary key (tai_lieu_id, ma_hs)
);

create index if not exists idx_tai_lieu_ghi_nhan on tai_lieu(ghi_nhan_id);
create index if not exists idx_tai_lieu_hoc_sinh_ma_hs on tai_lieu_hoc_sinh(ma_hs);

alter table danh_muc_tai_lieu enable row level security;
alter table tai_lieu enable row level security;
alter table tai_lieu_hoc_sinh enable row level security;

create policy "gv_toan_quyen_danh_muc_tai_lieu" on danh_muc_tai_lieu
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "gv_toan_quyen_tai_lieu" on tai_lieu
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "gv_toan_quyen_tai_lieu_hoc_sinh" on tai_lieu_hoc_sinh
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
```

**Vì sao có cột `tinh_la_cam_ket`:** báo cáo tái phạm ở file `12-...` cần biết loại tài liệu nào "được tính là có cam kết". Thay vì so khớp theo tên hiển thị (dễ vỡ nếu giáo viên đổi tên loại tài liệu sau này), dùng cột boolean này. Khi giáo viên tự thêm loại tài liệu mới qua UI (mục 6), cho họ tick chọn "Loại này có tính là cam kết không?" — mặc định `false`.

> Lưu ý cho AI agent: `references hoc_sinh(ma_hs)` giả định `ma_hs` là khoá chính/khoá tự nhiên của bảng `hoc_sinh` — kiểm tra lại tên cột thật trước khi chạy migration, sửa nếu khác.

## 4. Cấu hình Supabase Storage

- Bucket vẫn tên `bien-ban-vi-pham` (giữ nguyên nếu đã tạo từ bản v1) — chỉ đổi cấu trúc path.
- **Path mới**, không còn prefix theo `ma_hs` (vì 1 file có thể thuộc nhiều học sinh): `{nam_hoc}/{timestamp}_{random4}.{ext}` — ví dụ `2025-2026/1735900000_x7k2.jpg`. Việc tra học sinh nào sở hữu tài liệu nào hoàn toàn dựa vào bảng `tai_lieu_hoc_sinh`, không dựa vào path.

## 5. Nén ảnh phía client (bắt buộc trước khi upload)

Giữ nguyên bản v1: thư viện `browser-image-compression`, `maxWidthOrHeight: 1920`, `maxSizeMB: 0.4`, giữ JPEG. File PDF upload nguyên bản, cảnh báo nếu vượt ~5MB.

## 6. Luồng UI

### Màn hình "Tải lên tài liệu" (độc lập, không nằm trong context của 1 `ghi_nhan`)

Truy cập từ menu chính hoặc nút nổi (FAB), trên mobile cho chụp trực tiếp bằng camera.

1. Chọn/chụp 1 hoặc nhiều ảnh (hoặc PDF).
2. Với mỗi file — có nút "áp dụng cho tất cả" để điền nhanh khi nhiều ảnh cùng 1 loại tài liệu/cùng học sinh — nhập:
   - **Loại tài liệu**: dropdown load từ `danh_muc_tai_lieu` theo `thu_tu`, dòng cuối là "+ Thêm loại mới" — mở input nhanh tạo loại mới ngay tại chỗ (kèm tick "có tính là cam kết không"), không rời màn hình.
   - **Ngày viết**: date picker, mặc định hôm nay, giáo viên chỉnh lại theo ngày thật trên văn bản.
   - **Học sinh liên quan**: multi-select có ô tìm kiếm nhanh (gõ vài ký tự là lọc trong danh sách 36 học sinh của lớp). Bắt buộc chọn ít nhất 1 học sinh.
   - **(Tuỳ chọn) Liên kết với 1 ghi nhận vi phạm cụ thể**: dropdown tìm nhanh trong các `ghi_nhan` gần đây của (các) học sinh đã chọn. **Trường này chỉ tự hiện ra khi loại tài liệu đang chọn có `tinh_la_cam_ket = true`** (Bản kiểm điểm/Bản cam kết), kèm gợi ý ngắn "Liên kết để hệ thống tự nhận diện tái phạm ở báo cáo lịch sử vi phạm". Loại như "Đơn xin phép" không hiện trường này.
3. Lưu → upload ảnh (đã nén) lên Storage, insert `tai_lieu` + các dòng `tai_lieu_hoc_sinh` tương ứng.

### Màn hình "Thư viện tài liệu" (gallery chung)

- Danh sách/lưới tài liệu, mỗi thẻ hiện thumbnail, loại tài liệu, ngày viết, tên (các) học sinh liên quan.
- Bộ lọc: theo loại tài liệu, theo học sinh (tìm nhanh), theo khoảng ngày viết.
- Bấm vào 1 tài liệu để xem full ảnh, sửa lại các trường phân loại nếu nhập sai, hoặc xoá.

### Trang cá nhân học sinh

- Thêm tab/khu vực **"Tài liệu đính kèm"**: liệt kê tất cả `tai_lieu` liên kết tới học sinh đó (qua `tai_lieu_hoc_sinh`), sắp theo `ngay_viet` giảm dần.

### Xoá

- Xoá 1 `tai_lieu` phải xoá luôn object trong Storage (không chỉ xoá dòng CSDL); các dòng `tai_lieu_hoc_sinh` liên quan tự xoá theo `on delete cascade`.

## 7. Việc KHÔNG làm trong commit này

- Không tự động OCR nội dung ảnh.
- Không xây signed URL cho phụ huynh xem.
- Không bắt buộc liên kết với `ghi_nhan` — luôn là trường tuỳ chọn.

## 8. Checklist xác minh bắt buộc trước khi đánh dấu hoàn thành

- [ ] Migration chạy thành công, 3 bảng mới + dữ liệu seed `danh_muc_tai_lieu` tồn tại
- [ ] Upload 1 ảnh, chọn loại tài liệu có sẵn, ngày viết, 1 học sinh — hiện đúng trong thư viện chung và trang cá nhân học sinh đó
- [ ] Tạo loại tài liệu mới ngay trong dropdown lúc upload — loại mới lưu vào `danh_muc_tai_lieu` và xuất hiện lại ở lần upload sau
- [ ] Upload 1 ảnh, chọn **nhiều học sinh** — ảnh xuất hiện đúng ở trang cá nhân của TẤT CẢ học sinh đã chọn
- [ ] Chọn loại tài liệu "Bản cam kết" — trường "Liên kết với ghi nhận vi phạm" tự hiện ra; chọn "Đơn xin phép" — trường đó ẩn đi
- [ ] Test trên trình duyệt thật, cả desktop và mobile (chụp ảnh trực tiếp bằng camera)
- [ ] Xoá 1 tài liệu — object Storage bị xoá, dòng `tai_lieu_hoc_sinh` liên quan cũng bị xoá theo cascade
- [ ] Bộ lọc trong thư viện tài liệu chung (theo loại/học sinh/ngày) hoạt động đúng

## 9. Nếu bản v1 đã được triển khai trước đó

Nếu bảng `tep_dinh_kem` (bản cũ, `ghi_nhan_id not null`) đã tồn tại và có dữ liệu thật: viết script chuyển đổi — với mỗi dòng `tep_dinh_kem`, tạo 1 dòng `tai_lieu` tương ứng (map `loai_tai_lieu` text cũ sang `danh_muc_tai_lieu_id` theo tên), giữ nguyên `ghi_nhan_id`, insert 1 dòng `tai_lieu_hoc_sinh` lấy `ma_hs` từ `ghi_nhan.ma_hs` của bản ghi liên kết. Không xoá `tep_dinh_kem` cũ ngay — giữ lại đến khi xác minh dữ liệu chuyển đổi đúng, rồi drop bảng cũ trong 1 commit riêng.

Commit số: **C0XX** _(GVCN điền sau khi implement xong)_
