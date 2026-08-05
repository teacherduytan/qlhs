# Tính năng: Gọi + Nhắn tin (SMS) nhanh cho phụ huynh, nội dung SMS import qua JSON

> **Gửi AI coding agent (Claude Code/Cursor).** Tài liệu mô tả yêu cầu và thiết kế đề xuất, không phải diff — đọc kỹ, kiểm tra codebase hiện tại trước khi sửa, **không tự đoán tên file/route nếu chưa xác nhận được qua tìm kiếm codebase**.
>
> Tham chiếu: `docs/06-cai-tien-sau-trien-khai.md` (log commit). Sau khi hoàn thành, thêm dòng log vào file đó với mã commit thật, thay placeholder `[C0XX]`.
>
> ⚠️ Đổi tên file này thành đúng số thứ tự tiếp theo trong `docs/` trước khi lưu vào repo — số `1X` chỉ là placeholder.

---

## 1. Bối cảnh

Từ commit **C056**, route giáo viên `/#/quan-ly/hoc-sinh/<ma_hs>` đã hiển thị `sdt_1`/`sdt_2` dạng link `tel:`. Tính năng này mở rộng: bấm số điện thoại → hiện lựa chọn **Gọi** hoặc **Nhắn tin**; chọn Nhắn tin thì nội dung được điền sẵn từ dữ liệu import qua JSON.

## 2. Phạm vi giai đoạn này — CHỈ ĐƠN GIẢN

Giai đoạn này **không** có khái niệm tuần/tháng hay kỳ báo cáo trong JSON. Luồng duy nhất:

**JSON import (giáo viên tự soạn nội dung) → nội dung được gán thẳng vào đúng học sinh trong CSDL → nội dung mới nhất của học sinh đó dùng để điền sẵn SMS.**

Mỗi lần import là **thêm bản ghi mới** (không upsert/ghi đè) — lịch sử tự nhiên hình thành qua nhiều lần import mà không cần giáo viên khai báo "đây là tuần mấy". Nếu về sau cần lọc/xem theo kỳ, có thể thêm field đó ở bản mở rộng, không cần trong JSON tối thiểu này.

**Chuẩn bị cho giai đoạn 2 (không làm bây giờ):** hệ thống tự sinh nội dung SMS dựa trên điều kiện, giống cách hệ thống đồng hành (companion system) suy luận trạng thái/lời khuyên cho học sinh. Vì vậy bảng CSDL bên dưới có sẵn cột `nguon` và `da_duyet` để sau này ghi được cả nội dung tự sinh (chưa duyệt) mà không cần đổi schema lần nữa.

## 3. Việc cần làm trước khi code

1. Route/component đang render `sdt_1`/`sdt_2` dạng `tel:` (từ C056) — sửa tại đó.
2. Trang "Danh sách học sinh" khu vực giáo viên hiện có hiển thị số điện thoại chưa; nếu chưa, thêm trước khi gắn action sheet.
3. Cấu trúc màn hình Import hiện tại (cách thêm "loại dữ liệu" mới) để gắn loại "Tin nhắn phụ huynh" đúng pattern đang dùng.

## 4. Thiết kế CSDL (Supabase migration)

```sql
create table noi_dung_tin_nhan (
  id uuid primary key default gen_random_uuid(),
  ma_hs text not null references hoc_sinh(ma_hs),
  noi_dung text not null,
  ghi_chu text, -- nhãn tự do cho GV, ví dụ "Tuần 4" — chỉ để hiển thị, không ràng buộc cấu trúc, KHÔNG bắt buộc
  nguon text not null default 'nhap_tay' check (nguon in ('nhap_tay', 'tu_dong')),
  -- 'nhap_tay' = import JSON thủ công (giai đoạn này)
  -- 'tu_dong'  = dành cho hệ thống tự sinh sau này (giai đoạn 2), chưa dùng bây giờ
  da_duyet boolean not null default true,
  -- mặc định true vì nội dung 'nhap_tay' do GV tự soạn = coi như đã duyệt
  -- khi có 'tu_dong' sau này, nên default false và cần GV duyệt trước khi cho gửi SMS
  -- (đúng nguyên tắc "lời khuyên hệ thống đồng hành phải qua GV duyệt trước khi tới phụ huynh")
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_tin_nhan_hs on noi_dung_tin_nhan (ma_hs, created_at desc);
```

**Bảo mật (RLS):** bảng chứa nội dung liên lạc phụ huynh — RLS chỉ cho giáo viên đã đăng nhập (Supabase Auth) đọc/ghi. Tuyệt đối không lộ qua route công khai `/#/hs/<token>` hay qua RPC `SECURITY DEFINER` dùng cho hồ sơ công khai.

## 5. Định dạng JSON import

```json
[
  { "ma_hs": "HS001", "noi_dung": "Tuần này em Nam đi học đầy đủ, không vi phạm nề nếp, được tuyên dương phát biểu xây dựng bài." },
  { "ma_hs": "HS002", "noi_dung": "Tháng 9 em Hoa có 1 lần đi trễ, đã khắc phục tốt trong 2 tuần cuối tháng.", "ghi_chu": "Tháng 9" }
]
```

- `ma_hs`, `noi_dung`: bắt buộc.
- `ghi_chu`: tuỳ chọn, chỉ để GV tự ghi nhãn khi xem lịch sử — không validate cấu trúc.
- `nguon`, `da_duyet`: không có trong JSON import thủ công, hệ thống tự gán `nguon = 'nhap_tay'`, `da_duyet = true`.

Quy tắc validate khi import:

- `ma_hs` phải khớp đúng học sinh trong `hoc_sinh` — không tự suy đoán nếu không khớp, báo lỗi cho giáo viên xem lại (tái dùng logic fuzzy-match roster 36 em đã có trong dự án).
- `noi_dung` không rỗng, không chứa markup/ký tự điều khiển thừa (đúng nguyên tắc "chỉ dữ liệu sạch" đã áp dụng cho `noi_dung` ở `ghi_nhan`).
- Cho xem trước (preview) trước khi xác nhận ghi — đúng pattern màn hình Import hiện có.
- Mỗi dòng JSON hợp lệ → **insert 1 bản ghi mới**, không ghi đè bản cũ của học sinh đó.

## 6. Hành vi UI: Gọi + SMS

Ở trang chi tiết học sinh **và** trang danh sách học sinh (khu vực giáo viên):

1. Bấm số điện thoại → action sheet với **"Gọi"** và **"Nhắn tin"**.
2. **Gọi** → giữ nguyên hành vi `tel:` hiện có.
3. **Nhắn tin** → mở `sms:<số>?body=<nội_dung_đã_encodeURIComponent>`, điền sẵn nội dung **mới nhất** (bản ghi `da_duyet = true` có `created_at` lớn nhất) của học sinh đó.
4. Học sinh chưa có nội dung nào → "Nhắn tin" vẫn mở được, để trống nội dung, có thể ghi chú nhỏ "Chưa có nội dung tin nhắn cho em này".

**Trang chi tiết học sinh** nên có mục "Lịch sử tin nhắn": liệt kê mọi bản ghi của học sinh đó (mới nhất trước), hiển thị `ghi_chu` nếu có, mỗi dòng có nút "Dùng nội dung này" để mở SMS với đúng nội dung dòng đó thay vì chỉ bản mới nhất.

## 7. Checklist kiểm thử bắt buộc trên trình duyệt thật trước khi đánh dấu hoàn thành

- [ ] Điện thoại thật (Android và iOS nếu có điều kiện): bấm số → hiện đúng action sheet Gọi/Nhắn tin.
- [ ] "Gọi" → mở đúng app gọi điện, đúng số.
- [ ] "Nhắn tin" → mở đúng app nhắn tin, nội dung điền sẵn đúng học sinh, đúng bản mới nhất, tiếng Việt có dấu hiển thị đúng (không lỗi encode).
- [ ] Học sinh chưa có nội dung nào → "Nhắn tin" không lỗi, nội dung để trống.
- [ ] Trang danh sách học sinh: action sheet hoạt động giống trang chi tiết.
- [ ] Import JSON: preview đúng trước khi xác nhận; import xong → mỗi dòng thành 1 bản ghi mới trong `noi_dung_tin_nhan`.
- [ ] Import 2 lần cho cùng 1 học sinh → có 2 bản ghi (không ghi đè); SMS lấy đúng bản mới nhất.
- [ ] `ma_hs` không hợp lệ trong file import → bị chặn/báo lỗi rõ ràng.
- [ ] Vào route công khai `/#/hs/<token>` → xác nhận **không** thấy nội dung tin nhắn hay số điện thoại.
- [ ] Trang "Lịch sử tin nhắn" hiển thị đúng thứ tự thời gian, nút "Dùng nội dung này" hoạt động đúng.

## 8. Ghi log commit

```
| C0XX | `[C0XX] feat(ui+db): thêm Gọi/SMS nhanh cho phụ huynh, import nội dung SMS qua JSON` | Bấm SĐT (trang chi tiết + danh sách học sinh) hiện action sheet Gọi/Nhắn tin; nội dung SMS lấy từ bảng `noi_dung_tin_nhan` (bản mới nhất), import qua màn hình Import sẵn có, mỗi lần import tạo bản ghi mới. | [điền kết quả test thật] |
```
