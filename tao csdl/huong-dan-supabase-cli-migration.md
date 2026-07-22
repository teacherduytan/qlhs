# Hướng dẫn: thiết lập Supabase CLI + migration cho dự án QLHS

> Đưa file này cho IDE AI (Claude Code/Cursor) để thực hiện. Mục tiêu: tạo 3 bảng (hoc_sinh, danh_muc_diem, ghi_nhan) bằng migration có version, thay vì tạo tay qua giao diện — để mọi lần đổi cấu trúc sau này chỉ cần thêm 1 file mới, có lịch sử rõ ràng.

## 0. Trước khi bắt đầu (phần thầy Tân tự làm, không phải IDE AI)

1. Tạo tài khoản tại supabase.com nếu chưa có.
2. Tạo 1 project mới (New Project) — đặt tên project (ví dụ `qlhs-11c5`), chọn vùng gần Việt Nam nhất (Singapore), đặt mật khẩu database (lưu lại, sẽ cần dùng).
3. Sau khi project tạo xong, vào **Project Settings → General**, ghi lại **Project Reference ID** (project-ref) — dạng chuỗi ký tự ngắn, IDE AI sẽ cần giá trị này.
4. Vào **Project Settings → API**, ghi lại `anon` key và `Project URL` — sẽ dùng ở bước sau cho frontend.

## 1. Cài đặt Supabase CLI

```bash
npm install -g supabase
supabase --version   # kiểm tra cài thành công
```

## 2. Đăng nhập CLI

```bash
supabase login
```
Lệnh này mở trình duyệt để xác thực tài khoản Supabase — làm một lần trên máy đang phát triển.

## 3. Khởi tạo Supabase trong repo dự án

Chạy tại thư mục gốc của repo QLHS (cùng cấp với `docs/`, `src/`):

```bash
supabase init
```

Lệnh này tạo thư mục `supabase/` trong repo, chứa cấu hình và sau này là các file migration. **Thư mục này commit vào git bình thường** — đây chính là phần giải quyết vấn đề "khó theo dõi thay đổi cấu trúc" của thầy.

## 4. Liên kết với project thật

```bash
supabase link --project-ref zupkcgfjkckrbemptaiv
```
CLI sẽ hỏi mật khẩu database đã đặt ở bước 0.2.

## 5. Migration đầu tiên đã được tạo trong repo

Không dùng lại khối SQL 3 bảng nháp cũ. Schema thật đã được đối chiếu từ `apps-script/SetupSheet.gs`, `apps-script/Code.gs`, `src/data/types.ts` và ghi vào:

```txt
supabase/migrations/20260722000100_tao_bang_ban_dau_qlhs.sql
```

Bản giải thích cột thật nằm ở:

```txt
tao csdl/schema-supabase-da-doi-chieu.md
```

Nếu sau này cần đổi cấu trúc thì mới chạy:

```bash
supabase migration new <ten-mo-ta-ngan-gon>
```

## 6. Bước BẮT BUỘC, hay bị bỏ sót: cấp quyền cho API + bật bảo mật dòng (RLS)

Migration C118 đã có sẵn phần grant + bật RLS + policy cho toàn bộ 8 bảng. Khi review trước `supabase db push`, vẫn phải kiểm tra không bị xoá nhầm các đoạn này.

> ⚠️ Đây không phải bước "cho chắc" — bỏ qua bước này thì hoặc API không hoạt động (do thiếu grant), hoặc dữ liệu học sinh bị công khai hoàn toàn (do thiếu RLS). Cả hai đều không được phép xảy ra với dữ liệu học sinh thật.

## 7. Áp dụng migration lên project thật

```bash
supabase db push
```

CLI sẽ hiện danh sách lệnh SQL sắp chạy, xác nhận rồi Enter. Sau khi chạy xong, vào Dashboard → **Table Editor** để xác nhận cả 3 bảng đã xuất hiện đúng cấu trúc.

## 8. Kiểm tra nhanh API đã hoạt động

Từ Dashboard → **API docs** (hoặc mục Table Editor có nút "..." → xem API), thử gọi thẳng bằng `curl`:

```bash
curl "https://<project-ref>.supabase.co/rest/v1/danh_muc_diem" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"
```

Nếu trả về `[]` (mảng rỗng, không phải lỗi) là API đã hoạt động đúng — bảng chưa có dữ liệu là bình thường ở bước này.

## 9. Lưu ý bảo mật khóa API

- `anon` key: an toàn để đưa vào code frontend (React) — quyền truy cập thực tế do RLS policy ở mục 6 kiểm soát, không phải do giấu khóa.
- `service_role` key (nằm cùng trang API): **tuyệt đối không đưa vào frontend hay commit lên git** — key này bỏ qua toàn bộ RLS, chỉ dùng cho script migrate dữ liệu chạy ở máy local.
- Thêm file `.env` (chứa các key) vào `.gitignore` ngay từ đầu.

## 10. Quy trình cho MỌI thay đổi cấu trúc sau này

Từ giờ, mỗi khi cần thêm cột, đổi kiểu dữ liệu, thêm bảng mới — **không sửa trực tiếp qua Dashboard**, luôn làm theo:

```bash
supabase migration new <ten-mo-ta-ngan-gon>
# → sửa file .sql vừa sinh ra
supabase db push
```

Toàn bộ file trong `supabase/migrations/` commit vào git — đây chính là "lịch sử thay đổi cấu trúc bảng" mà Sheets không có được.

## 11. Checklist trước khi báo hoàn thành

- [ ] `supabase/migrations/` đã có ít nhất 1 file, đã commit vào git
- [ ] Cả 3 bảng hiện đúng trong Table Editor
- [ ] Đã chạy bước cấp quyền + bật RLS (mục 6) — không bỏ qua
- [ ] Đã thử gọi API bằng curl, nhận được phản hồi hợp lệ (không phải lỗi 401/403 do thiếu grant)
- [ ] `service_role` key không xuất hiện ở bất kỳ đâu trong code frontend hoặc git history
- [ ] Đã kiểm tra thực tế trong trình duyệt (không chỉ đọc log CLI), theo đúng quy tắc đã có ở tài liệu trước
