# Hướng dẫn: chuyển luồng đọc/ghi dữ liệu từ Google Sheets sang Supabase

> Bối cảnh: đăng nhập đã chuyển sang Supabase Auth (C119), nhưng **đọc/ghi dữ liệu thật vẫn đang qua Apps Script vào Google Sheets**. File này để hoàn tất phần còn lại — mục tiêu gốc của việc chuyển đổi (Sheets chậm, khó đổi cấu trúc) chỉ thực sự đạt được sau bước này.
>
> Đưa file này cho IDE AI.

## 0. Nguyên tắc bắt buộc giữ nguyên (không được đánh mất khi viết lại)

1. `ma_danh_muc` trong `ghi_nhan` được phép NULL — không tự gán mã mới khi chưa có trong `danh_muc_diem`.
2. AI không bao giờ tự đánh số mã danh mục mới.
3. `noi_dung` và các trường văn bản khác chỉ chứa dữ liệu sạch.
4. Sau khi implement, **phải tự kiểm tra chạy được trong trình duyệt thật**, không chỉ dựa vào `npm test`/`npm run build` pass — 2 lệnh đó không phát hiện được lỗi hiển thị dữ liệu hay lỗi gọi API sai bảng.

## 1. Di chuyển dữ liệu thật hiện có (một lần, làm trước khi đổi code)

Dữ liệu thật của năm học 2025-2026 đang nằm trong Google Sheets — phải chuyển sang Supabase trước khi frontend đổi qua đọc từ đó, nếu không app sẽ hiển thị rỗng.

**Thứ tự import bắt buộc phải theo đúng, vì có ràng buộc khóa ngoại giữa các bảng** (import sai thứ tự sẽ báo lỗi vi phạm khóa ngoại):

1. `danh_muc_xu_ly` (không phụ thuộc bảng nào)
2. `cau_hinh_tuan` (không phụ thuộc bảng nào)
3. `hoc_sinh` (không phụ thuộc bảng nào)
4. `danh_muc_diem` (phụ thuộc `danh_muc_xu_ly` qua `ma_xu_ly_de_xuat`)
5. `phu_huynh` (phụ thuộc `hoc_sinh`)
6. `ban_can_su` (phụ thuộc `hoc_sinh`)
7. `nhat_ky_import` (không phụ thuộc bảng nào)
8. `ghi_nhan` (phụ thuộc `hoc_sinh`, `cau_hinh_tuan`, `danh_muc_diem`, `nhat_ky_import` — **luôn import sau cùng**)

**Cách làm:**
- Xuất từng tab Sheets ra CSV (File → Tải xuống → CSV cho từng sheet).
- Trước khi import, đối chiếu các cột kiểu enum phải khớp **chính xác** giá trị đã định nghĩa trong migration, ví dụ:
  - `hoc_sinh.dien` chỉ nhận `2B`, `BT`, hoặc `NT`
  - `danh_muc_diem.nhom` chỉ nhận `CC`, `VS`, `NN`, `KL`, `KT`
  - `ghi_nhan.loai` chỉ nhận `chuyen_can`, `ve_sinh`, `ne_nep`, `trat_tu_ky_luat`, `hoc_tap`, `khen_thuong`
  - Nếu dữ liệu trong Sheets ghi khác đi (ví dụ viết hoa/thường khác, dấu cách khác), **phải chuẩn hóa lại giá trị trước khi import**, không sửa enum cho khớp dữ liệu cũ.
- Import bằng Supabase Table Editor (nút Import data from CSV trên từng bảng) theo đúng thứ tự ở trên, hoặc viết 1 script Node dùng `@supabase/supabase-js` với `service_role` key (chạy ở máy local, **không commit key này**) để import có kiểm soát hơn.
- Sau khi import xong mỗi bảng, đối chiếu số dòng với Sheets gốc — không được lệch.
- Riêng `ghi_nhan.ma_ghi_nhan` là khóa chính dạng text — **giữ nguyên mã cũ từ Sheets khi import, không để hệ thống tự sinh mã mới**, để không phá vỡ liên kết với dữ liệu lịch sử.

## 2. Thay lớp truy cập dữ liệu ở frontend

Tạo 1 file tập trung, ví dụ `src/lib/supabaseQueries.ts`, chứa các hàm CRUD thay thế cho từng hàm hiện đang gọi Apps Script, ví dụ:

```ts
import { supabase } from './supabaseClient';

export async function layDanhSachHocSinh() {
  const { data, error } = await supabase.from('hoc_sinh').select('*').order('tt');
  if (error) throw error;
  return data;
}

export async function themGhiNhan(ghiNhan: GhiNhanInsert) {
  const { data, error } = await supabase.from('ghi_nhan').insert(ghiNhan).select().single();
  if (error) throw error;
  return data;
}
```

Sau đó thay từng chỗ trong code đang gọi Apps Script (`fetch` tới URL web app) bằng hàm tương ứng trong file này. Làm từng chức năng một (ví dụ: xem danh sách học sinh trước, rồi đến thêm ghi nhận, rồi đến import phiếu...), test xong 1 chức năng mới chuyển sang chức năng kế tiếp — không đổi toàn bộ cùng lúc để dễ khoanh vùng lỗi.

## 3. Xử lý phần logic nghiệp vụ hiện nằm trong Apps Script

Các phần tính toán phức tạp trong `Code.gs` (ví dụ: tính điểm thi đua theo tuần, wizard tạo danh mục mới, xử lý xu hướng tổ/tập thể) cần quyết định chuyển sang đâu:
- Logic đơn giản, không cần giấu: viết lại trực tiếp ở frontend (TypeScript), gọi Supabase qua `supabase-js`.
- Logic cần chạy phía server (ví dụ cần quyền cao hơn RLS cho phép, hoặc muốn giấu công thức tính điểm): viết thành Supabase Edge Function.

Nếu chưa chắc phần nào nên đặt ở đâu, liệt kê danh sách các hàm còn lại trong `Code.gs` trước, để bàn tiếp — không tự ý quyết định cho toàn bộ logic phức tạp.

## 4. Giai đoạn chuyển tiếp — không xóa Apps Script/Sheets ngay

- Giữ Apps Script còn tồn tại nhưng **không còn nhận ghi dữ liệu mới** sau khi frontend đã chuyển hẳn sang gọi Supabase trực tiếp.
- Sheets giữ lại làm bản đối chiếu/backup ít nhất hết học kỳ hiện tại, không xóa ngay.
- Chỉ gỡ bỏ hẳn Apps Script sau khi đã chạy ổn định qua Supabase một thời gian đủ dài để yên tâm (ví dụ hết 1 học kỳ).

## 5. Checklist trước khi báo hoàn thành

- [ ] Dữ liệu thật đã import đủ 8 bảng, đúng thứ tự, đối chiếu số dòng khớp Sheets gốc
- [ ] Không có bản ghi nào bị lỗi enum hoặc bị bỏ sót do sai định dạng khi import
- [x] Toàn bộ chức năng đọc/ghi chính (xem danh sách học sinh, thêm ghi nhận, xem lịch sử theo tuần) đã gọi trực tiếp Supabase, không còn qua Apps Script
- [ ] Đã tự mở app trong trình duyệt, thêm thử 1 ghi nhận mới, xác nhận nó xuất hiện trong Supabase Table Editor — không chỉ dựa vào `npm test`/`npm run build`
- [ ] Apps Script + Sheets vẫn còn nguyên, chưa bị xóa, chỉ ngừng nhận ghi mới
- [ ] `service_role` key (nếu dùng để import) không xuất hiện trong bất kỳ file nào đã commit

## 6. Trạng thái thực hiện C120 - 23/07/2026

- Đã tạo `src/data/SupabaseDataSource.ts` và chuyển `src/data/client.ts` sang dùng lớp này.
- Các bảng chính đã đọc/ghi trực tiếp Supabase khi giáo viên có phiên Supabase Auth: `hoc_sinh`, `ghi_nhan`, `danh_muc_diem`, `danh_muc_xu_ly`, `cau_hinh_tuan`, `phu_huynh`, `ban_can_su`, `nhat_ky_import`.
- Import JSON hợp lệ ghi vào Supabase, tự sinh `LOG000001...` và `GN000001...` theo mã lớn nhất đang có trong Supabase. App không tự tạo mã danh mục mới trong bước import backend; các dòng thiếu/chưa khớp danh mục vẫn phải được màn Import xử lý trước.
- `CauHinhTuan` trong Supabase tự nối thêm tuần học bình thường đến ngày thực tế khi giáo viên mở app hoặc import bản ghi theo ngày mới.
- Trang hồ sơ học sinh công khai (`/#/hs/<token>`) vẫn fallback Apps Script vì route này không có phiên `authenticated`; đây là chủ ý để không nới RLS public trong C120.
- Báo cáo sĩ số và build URL Google Form vẫn đi qua Apps Script vì còn phụ thuộc Google Sheet điểm danh và Script Properties form.

## 7. Trạng thái export/import dữ liệu thật C121 - 23/07/2026

- Đã export dữ liệu thật từ Apps Script/Google Sheets vào thư mục local `tao csdl/export-c120-20260723/`. Thư mục export đã được ignore bằng `.gitignore` vì có dữ liệu học sinh thật.
- Số dòng export từ Sheets:
  - `danh_muc_xu_ly`: 7
  - `cau_hinh_tuan`: 2
  - `hoc_sinh`: 36
  - `danh_muc_diem`: 37
  - `phu_huynh`: 0
  - `ban_can_su`: 0
  - `nhat_ky_import`: 26
  - `ghi_nhan`: 29
- Kiểm enum trước import: không có giá trị lệch trong `dien`, `nhom`, `loai`, `pham_vi`, `trang_thai`, `muc_do`; `cau_hinh_tuan.loai_tuan` trong Sheets đang trống và Supabase dùng default `hoc_binh_thuong`.
- `CauHinhTuan` trong Sheets hiện chỉ có tuần 1 và tuần 2, chưa có đủ toàn bộ năm học 2025-2026. Sau khi app/SupabaseDataSource áp dụng auto-extend theo ngày 23/07/2026, Supabase có thêm tuần 3.
- Import ban đầu bị chặn bởi unique constraint `danh_muc_xu_ly_noi_dung_xu_ly_key`: các mã `XL02`, `XL03`, `XL04`, `XL05` có cùng `noi_dung_xu_ly` là `Lần 1: nhắc nhở; lần 2 trở lên: trừ điểm.`. Trong đó chỉ `XL05` đang được `DanhMucDiem` tham chiếu.
- Để khôi phục Supabase không rỗng sau bước replace, đã nhập các dòng chính và giữ dòng xử lý được tham chiếu `XL05`; các mã `XL02`, `XL03`, `XL04` chưa nhập vì bị unique constraint và chưa có xác nhận gộp/xoá/sửa nội dung.
- Số dòng Supabase sau bước khôi phục:
  - `danh_muc_xu_ly`: 4/7
  - `cau_hinh_tuan`: 3/2 do auto-extend tuần 3
  - `hoc_sinh`: 36/36
  - `danh_muc_diem`: 37/37
  - `phu_huynh`: 0/0
  - `ban_can_su`: 0/0
  - `nhat_ky_import`: 26/26
  - `ghi_nhan`: 29/29
- C122 đã bỏ unique constraint sai trên `danh_muc_xu_ly.noi_dung_xu_ly` bằng migration `20260723000100_bo_unique_noi_dung_xu_ly.sql`.
- Đã import bù đủ các mã `XL02`, `XL03`, `XL04`; `danh_muc_xu_ly` hiện có 7/7 dòng gốc từ Sheets, không xoá dòng nào.
- Kiểm tra lại `DanhMucDiem`: `NN09 - Nói chuyện/phát biểu không đúng lúc trong giờ` vẫn tham chiếu `ma_xu_ly_de_xuat = XL05`; không có tham chiếu gãy sang `DanhMucXuLy`.
- Còn cần kiểm UI đăng nhập thật để xem đủ 36 học sinh trong trình duyệt.
