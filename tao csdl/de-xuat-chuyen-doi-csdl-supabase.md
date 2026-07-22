# Đề xuất chuyển đổi tầng dữ liệu: Google Sheets → Supabase (Postgres)

> Tài liệu này dùng để đưa cho AI coding agent (Claude Code/Cursor) trong IDE.
> **Trước khi làm bất kỳ thay đổi nào, AI phải đọc toàn bộ code hiện tại** (Apps Script API, các file trong `docs/`, đặc biệt tài liệu mô tả cấu trúc dữ liệu) để lấy đúng danh sách cột/bảng thật — tài liệu này chỉ nêu **định hướng và các phần đã biết chắc**, không phải bản schema cuối cùng.
> **Cập nhật 22/07/2026 (C118)**: schema thật đã được đối chiếu và tạo migration tại `supabase/migrations/20260722000100_tao_bang_ban_dau_qlhs.sql`; xem bản tổng hợp ở `tao csdl/schema-supabase-da-doi-chieu.md`. Không dùng trực tiếp khung SQL 3 bảng ở mục 5 để tạo bảng thật.

## 1. Vấn đề hiện tại

- Google Sheets dùng làm CSDL chính (qua Google Apps Script API) đang chậm dần khi dữ liệu tăng.
- Sheets không có ràng buộc khóa ngoại thật, không có migration → mỗi lần đổi cấu trúc bảng (thêm cột, đổi kiểu, thêm bảng liên kết) đều thủ công và dễ gây lỗi dữ liệu.

## 2. Lựa chọn: Supabase (Postgres)

Lý do chọn:
- Dữ liệu hiện tại vốn đã là quan hệ (HocSinh – DanhMucDiem – GhiNhan có khóa ngoại), Postgres khớp tự nhiên, không cần đổi mô hình dữ liệu.
- Supabase tự sinh REST API (PostgREST) + thư viện JS client → gần như không cần viết lại một backend server riêng để thay Apps Script.
- Table editor dạng lưới, giáo viên vẫn có thể tự xem/sửa dữ liệu như quen dùng Sheets.
- Free tier: 500MB database (dư dùng nhiều năm với quy mô 1 lớp, xem tính toán ở mục 7), 1GB file storage riêng cho ảnh phiếu ghi nhận nếu cần.

**Lưu ý bắt buộc phải xử lý:** dự án free tier của Supabase **tự động pause sau 7 ngày không có request nào**. Vì năm học có nghỉ hè/Tết dài hơn 1 tuần, phải thiết lập cơ chế giữ dự án "sống":
- Tạo GitHub Actions workflow chạy theo lịch (`schedule` cron), gọi một API bất kỳ của Supabase project mỗi 3–4 ngày.
- Việc này cần đưa vào phạm vi công việc, không được bỏ qua — nếu bỏ qua, ứng dụng sẽ ngưng hoạt động vào đúng các kỳ nghỉ, là lúc ít người kiểm tra nhất.

## 3. Nguyên tắc bắt buộc phải giữ nguyên khi triển khai

Đây là các quy ước đã có từ khi dùng Sheets, **phải tiếp tục áp dụng** trong schema/logic mới, không được đánh mất khi chuyển đổi:

1. Trường `noi_dung` (và các trường văn bản tự do khác) chỉ chứa dữ liệu sạch, không lẫn ghi chú suy luận nội bộ.
2. Khi một hành vi/khen thưởng chưa có mã trong `DanhMucDiem`, không được tự gán mã số mới — để `ma_danh_muc = NULL` và đề xuất qua trường `de_xuat_danh_muc`, chờ giáo viên xác nhận rồi mới tạo mã thật trong bảng danh mục.
3. AI (dù là Claude web hay IDE AI) **không bao giờ tự đánh số mã danh mục** (ví dụ NN08, KT05...) — mã số chỉ được xem là chính thức sau khi đã được tạo trong hệ thống thật, tránh trùng lặp như sự cố NN08/NN09 trước đây.
4. Logic kiểm tra khi import **không được chặn toàn bộ record có `ma_danh_muc = NULL`** — NULL là trạng thái hợp lệ, chờ giáo viên duyệt, chỉ chặn khi có mã được cung cấp nhưng mã đó không tồn tại trong danh mục.
5. Sau khi implement xong bất kỳ phần nào, **phải tự kiểm tra chạy được trong trình duyệt thật** trước khi báo cáo hoàn thành — bài học từ lần triển khai đầu (C001–C027) từng bị đánh dấu xong nhưng dữ liệu không hiển thị.

## 4. Cấu trúc dữ liệu đã biết (cần đọc code để xác minh & bổ sung)

Các bảng hiện có trong Google Sheets (tên tab), IDE AI cần đọc Apps Script hiện tại để lấy **chính xác từng tên cột**, dưới đây chỉ là các trường đã xác nhận qua các phiên xử lý phiếu trước đó:

### HocSinh
- `ma_hs` (khóa chính, sinh tự động)
- `token_ho_so`
- họ tên, lớp, và các trường khác — **đọc lại từ Sheet/tài liệu 02 để lấy đủ**

### DanhMucDiem
- Mã danh mục theo nhóm: CC (Chuyên cần), VS (Vệ sinh), NN (Nề nếp), KL (Trật tự kỷ luật), KT (Khen thưởng) — ví dụ NN08, KT01
- Tên/mô tả danh mục, điểm cộng/trừ tương ứng, loại (`ne_nep` / `khen_thuong`)

### GhiNhan
- `ma_hs` (khóa ngoại → HocSinh)
- `ma_danh_muc` (khóa ngoại → DanhMucDiem, **cho phép NULL**)
- `ngay`, `tiet`, `mon_hoc`
- `loai` (`ne_nep` / `khen_thuong`)
- `noi_dung` (nội dung sạch, không có ghi chú nội bộ)
- `so_lan`, `nguoi_ghi`
- `de_xuat_danh_muc` (đề xuất danh mục mới khi chưa có mã khớp)

### Các tab khác (PhuHuynh, BanCanSu, NhatKyImport nếu còn dùng)
- Chưa có đủ thông tin cột trong ngữ cảnh này — **AI phải đọc trực tiếp Apps Script/Sheet hiện tại** trước khi thiết kế bảng Postgres tương ứng, không được đoán.

## 5. Đề xuất khung schema Postgres (bản nháp — cần đối chiếu mục 4 trước khi tạo bảng thật)

```sql
create table hoc_sinh (
  ma_hs text primary key,
  ho_ten text not null,
  lop text not null,
  token_ho_so text unique
  -- bổ sung các cột còn thiếu sau khi đối chiếu Sheet hiện tại
);

create table danh_muc_diem (
  ma_danh_muc text primary key,
  ten_danh_muc text not null,
  loai text not null check (loai in ('ne_nep', 'khen_thuong')),
  diem numeric not null
);

create table ghi_nhan (
  id uuid primary key default gen_random_uuid(),
  ma_hs text not null references hoc_sinh(ma_hs),
  ma_danh_muc text references danh_muc_diem(ma_danh_muc), -- cho phép NULL, xem mục 3.2
  de_xuat_danh_muc text,
  ngay date not null,
  tiet text,
  mon_hoc text,
  loai text not null check (loai in ('ne_nep', 'khen_thuong')),
  noi_dung text,
  so_lan integer default 1,
  nguoi_ghi text,
  created_at timestamptz default now()
);
```

## 6. Thay đổi tầng API

- Thay Apps Script bằng gọi trực tiếp Supabase client (`@supabase/supabase-js`) từ frontend React, dùng REST API tự sinh (PostgREST) cho các thao tác CRUD cơ bản.
- Với logic nghiệp vụ phức tạp hơn (ví dụ wizard tạo danh mục mới, tính điểm thi đua theo tuần), có thể dùng Supabase Edge Functions thay cho Apps Script functions tương ứng.
- Xác thực giáo viên: cân nhắc chuyển từ session token tự quản lý (Apps Script + sessionStorage) sang Supabase Auth, hoặc giữ cơ chế tương tự nhưng lưu trong bảng Postgres riêng — **cần thầy quyết định hướng nào trước khi AI code triển khai**, vì ảnh hưởng đến toàn bộ luồng đăng nhập hiện tại.

## 7. Ước tính dung lượng (tham khảo, không phải yêu cầu kỹ thuật)

Với 36 học sinh, ~3.800 dòng `ghi_nhan`/năm học, dung lượng ước tính chỉ khoảng vài MB/năm — dư giới hạn 500MB rất nhiều, kể cả nếu sau này mở rộng ra cả trường. Không lưu ảnh scan phiếu vào bảng CSDL — nếu cần, dùng Supabase Storage (1GB free) riêng.

## 8. Kế hoạch di chuyển dữ liệu

1. Xuất dữ liệu hiện tại từ từng tab Sheets ra CSV.
2. Tạo project Supabase, tạo schema theo mục 4–5 (sau khi đã đối chiếu đủ cột).
3. Import CSV vào từng bảng Postgres tương ứng (Supabase hỗ trợ import CSV trực tiếp qua Table editor hoặc SQL).
4. Kiểm tra đối chiếu số dòng, không sai lệch trước khi chuyển frontend sang gọi Supabase.
5. Giữ Google Sheets ở chế độ chỉ đọc một thời gian làm bản sao lưu đối chiếu, không xóa ngay.

## 9. Checklist trước khi báo hoàn thành

- [ ] Đã đọc đủ Apps Script + Sheet hiện tại, xác nhận đúng toàn bộ tên cột trước khi tạo bảng thật
- [ ] Toàn bộ 4 nguyên tắc ở mục 3 được giữ nguyên trong logic mới
- [ ] Đã thiết lập GitHub Actions ping chống pause
- [ ] Đã kiểm tra chạy được trong trình duyệt thật (không chỉ đọc code), theo đúng bài học ở mục 3.5
- [ ] Dữ liệu sau khi migrate khớp số dòng với Sheets gốc
