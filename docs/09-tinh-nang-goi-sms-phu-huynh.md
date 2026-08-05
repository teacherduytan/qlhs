# Tính năng: Gọi + Nhắn tin (SMS) nhanh cho phụ huynh, nội dung SMS import sẵn qua JSON

> **Gửi AI coding agent (Claude Code/Cursor).** Tài liệu này mô tả yêu cầu và thiết kế đề xuất, không phải diff — hãy đọc kỹ, kiểm tra codebase hiện tại trước khi sửa, và **không tự đoán tên file/route nếu chưa xác nhận được qua tìm kiếm codebase**.
>
> Tham chiếu: `docs/06-cai-tien-sau-trien-khai.md` (log commit). Sau khi hoàn thành, thêm dòng log vào file đó với mã commit thật, thay cho placeholder `[C0XX]` bên dưới.
>
> ⚠️ Đổi tên file này thành đúng số thứ tự tiếp theo trong `docs/` (ví dụ `11-...`) trước khi lưu vào repo — số `1X` ở đây chỉ là placeholder vì tôi không có quyền xem thư mục `docs/` hiện tại của bạn.

---

## 1. Bối cảnh

Từ commit **C056**, route giáo viên `/#/quan-ly/hoc-sinh/<ma_hs>` đã hiển thị `sdt_1`/`sdt_2` dạng link `tel:` — bấm trên di động mở app gọi điện ngay. Tính năng này **mở rộng** hành vi đó: bấm vào số điện thoại sẽ hiện lựa chọn **Gọi** hoặc **Nhắn tin**, và nếu chọn Nhắn tin thì nội dung tin nhắn được điền sẵn từ dữ liệu đã import trước đó qua JSON.

## 2. Quyết định thiết kế đã chốt (giáo viên xác nhận)

| Vấn đề | Quyết định |
|---|---|
| Lưu nội dung tin nhắn | Lưu theo **tuần/tháng cụ thể**, giữ **lịch sử nhiều lần** — không ghi đè |
| Phạm vi áp dụng nút Gọi/SMS | Cả **trang chi tiết học sinh** và **trang danh sách học sinh** (khu vực giáo viên) |
| Đường import JSON | Dùng chung **màn hình Import sẵn có**, thêm loại dữ liệu mới |

## 3. Việc cần làm trước khi code

Vì tôi (Claude, đóng vai kiến trúc sư) không truy cập được codebase thật, agent cần tự xác nhận các điểm sau trước khi triển khai, và **báo lại cho giáo viên nếu có sai lệch so với giả định trong tài liệu này**:

1. Route/component nào đang render `sdt_1`/`sdt_2` dạng `tel:` (từ C056) — sửa tại đó, không tạo component trùng lặp.
2. Trang "Danh sách học sinh" khu vực giáo viên hiện có hiển thị số điện thoại chưa. Nếu chưa, cần thêm cột/nút số điện thoại trước khi gắn action sheet Gọi/SMS.
3. Cấu trúc màn hình Import hiện tại (loại dữ liệu nào đang được hỗ trợ, cơ chế thêm "loại mới") để gắn loại "Tin nhắn phụ huynh" vào đúng pattern đang dùng.
4. Cấu trúc bảng `cau_hinh_tuan` hiện tại (để biết cách tham chiếu `ma_tuan` và lấy được thứ tự thời gian của tuần).

## 4. Thiết kế CSDL (Supabase migration)

Đề xuất bảng mới `noi_dung_tin_nhan`:

```sql
create table noi_dung_tin_nhan (
  id uuid primary key default gen_random_uuid(),
  ma_hs text not null references hoc_sinh(ma_hs),
  loai_ky text not null check (loai_ky in ('tuan', 'thang')),
  ma_tuan text references cau_hinh_tuan(ma_tuan), -- bắt buộc nếu loai_ky = 'tuan'
  thang int check (thang between 1 and 12),        -- bắt buộc nếu loai_ky = 'thang'
  nam int,                                          -- bắt buộc nếu loai_ky = 'thang'
  noi_dung text not null,
  nguon_import text, -- tên file JSON hoặc mã batch, để truy vết khi cần
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  constraint chk_ky_hop_le check (
    (loai_ky = 'tuan' and ma_tuan is not null and thang is null and nam is null)
    or
    (loai_ky = 'thang' and thang is not null and nam is not null and ma_tuan is null)
  )
);

-- Giả định: import lại đúng tuần/tháng đã có sẽ CẬP NHẬT bản ghi đó (upsert),
-- không tạo bản trùng — hãy xác nhận với giáo viên nếu hành vi mong muốn khác.
create unique index uq_tin_nhan_tuan on noi_dung_tin_nhan (ma_hs, ma_tuan) where loai_ky = 'tuan';
create unique index uq_tin_nhan_thang on noi_dung_tin_nhan (ma_hs, thang, nam) where loai_ky = 'thang';
```

**Bảo mật (RLS):** bảng này chứa nội dung liên lạc phụ huynh — áp dụng RLS chỉ cho phép giáo viên đã đăng nhập (Supabase Auth) đọc/ghi, **tuyệt đối không** để lộ qua route công khai `/#/hs/<token>` hay qua RPC `SECURITY DEFINER` dùng cho hồ sơ công khai. Theo đúng nguyên tắc bảo mật đã áp dụng cho `sdt_1`/`sdt_2`.

## 5. Định dạng JSON import

```json
[
  {
    "ma_hs": "HS001",
    "loai_ky": "tuan",
    "ma_tuan": "T04-2526",
    "noi_dung": "Tuần này em Nam đi học đầy đủ, không vi phạm nề nếp, được tuyên dương phát biểu xây dựng bài."
  },
  {
    "ma_hs": "HS002",
    "loai_ky": "thang",
    "thang": 9,
    "nam": 2025,
    "noi_dung": "Tháng 9 em Hoa có 1 lần đi trễ, đã khắc phục tốt trong 2 tuần cuối tháng."
  }
]
```

Quy tắc validate khi import (tái dùng logic khớp `ma_hs` với roster 36 em đã có trong dự án):

- `ma_hs` phải khớp đúng học sinh trong `hocsinh_seed.csv`/bảng `hoc_sinh` — không tự suy đoán nếu không khớp, báo lỗi cho giáo viên xem lại.
- `loai_ky` = `"tuan"` bắt buộc có `ma_tuan` hợp lệ (tồn tại trong `cau_hinh_tuan`); `loai_ky` = `"thang"` bắt buộc có `thang` + `nam`.
- `noi_dung` không rỗng, không chứa markup/ký tự điều khiển thừa (áp dụng đúng nguyên tắc "chỉ dữ liệu sạch" đã dùng cho trường `noi_dung` ở `ghi_nhan`).
- Cho xem trước (preview) danh sách sẽ ghi/ghi đè trước khi xác nhận — đúng pattern màn hình Import hiện có.

## 6. Hành vi UI: Gọi + SMS

**Khi bấm vào số điện thoại** (ở trang chi tiết học sinh và trang danh sách học sinh, khu vực giáo viên):

1. Hiện action sheet / menu nhỏ với 2 lựa chọn: **"Gọi"** và **"Nhắn tin"**.
2. **Gọi** → giữ nguyên hành vi `tel:` hiện có.
3. **Nhắn tin** → mở `sms:<số>?body=<nội_dung_đã_encode>` (dùng `encodeURIComponent`), điền sẵn nội dung "hiện tại" của học sinh đó.
4. Nếu học sinh **chưa có** nội dung nào được import → lựa chọn "Nhắn tin" vẫn mở được SMS nhưng để trống nội dung (không chặn, không báo lỗi — chỉ là không có gì điền sẵn), có thể thêm ghi chú nhỏ "Chưa có nội dung tin nhắn cho em này".

**Xác định nội dung "hiện tại":** vì dữ liệu lưu theo lịch sử nhiều tuần/tháng, "hiện tại" = bản ghi có **kỳ gần nhất theo thời gian thực tế** (không phải bản ghi mới nhập nhất) — so sánh theo ngày bắt đầu/kết thúc của `ma_tuan` (tra trong `cau_hinh_tuan`) hoặc theo `(nam, thang)`, lấy kỳ gần với ngày hiện tại nhất trong số các kỳ đã có dữ liệu.

**Trang chi tiết học sinh:** nên có thêm mục "Lịch sử tin nhắn" liệt kê tất cả các kỳ đã import cho em đó (mới nhất trước), mỗi dòng có nút "Dùng nội dung này" để mở SMS với đúng nội dung của kỳ đó thay vì chỉ kỳ gần nhất — hữu ích khi giáo viên muốn gửi lại nội dung của tuần trước.

## 7. Checklist kiểm thử bắt buộc trên trình duyệt thật trước khi đánh dấu hoàn thành

- [ ] Trên điện thoại thật (Android **và** iOS nếu có điều kiện): bấm số → hiện đúng action sheet Gọi/Nhắn tin.
- [ ] Chọn "Gọi" → mở đúng app gọi điện với đúng số.
- [ ] Chọn "Nhắn tin" → mở đúng app nhắn tin, **nội dung điền sẵn đúng học sinh, đúng kỳ gần nhất**, tiếng Việt có dấu hiển thị đúng (không bị lỗi encode).
- [ ] Học sinh chưa có nội dung nào → chọn "Nhắn tin" không bị lỗi, nội dung để trống.
- [ ] Trang danh sách học sinh: action sheet hoạt động giống trang chi tiết.
- [ ] Import JSON: cả `loai_ky = "tuan"` và `"thang"` đều import đúng, preview đúng trước khi xác nhận.
- [ ] Import lại đúng 1 kỳ đã có → cập nhật (upsert) đúng, không tạo bản trùng.
- [ ] `ma_hs` không hợp lệ trong file import → bị chặn/báo lỗi rõ ràng, không import "chui".
- [ ] Vào route công khai `/#/hs/<token>` → xác nhận **không** thấy nội dung tin nhắn hay số điện thoại (đúng nguyên tắc bảo mật cũ).
- [ ] Trang "Lịch sử tin nhắn" hiển thị đúng thứ tự thời gian, nút "Dùng nội dung này" hoạt động đúng.

## 8. Ghi log commit

Sau khi triển khai xong và kiểm thử đạt checklist trên, thêm dòng vào `docs/06-cai-tien-sau-trien-khai.md` theo đúng format bảng đang dùng, ví dụ:

```
| C0XX | `[C0XX] feat(ui+db): thêm Gọi/SMS nhanh cho phụ huynh, import nội dung SMS qua JSON theo tuần/tháng` | Bấm SĐT (trang chi tiết + danh sách học sinh) hiện action sheet Gọi/Nhắn tin; nội dung SMS lấy từ bảng `noi_dung_tin_nhan`, import qua màn hình Import sẵn có, lưu lịch sử theo tuần/tháng. | [điền kết quả test thật] |
```

(Điền số commit thật thay `C0XX` sau khi commit.)
