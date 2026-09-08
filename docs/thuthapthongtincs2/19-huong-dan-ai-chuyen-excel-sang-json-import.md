# 19. Hướng dẫn dùng AI web chuyển file Excel danh sách học sinh sang JSON để import vào hệ thống CS2

> Mục đích: file này KHÔNG phải để đưa cho Claude Code/IDE AI đọc — đây là **prompt để dán cho một AI web khác** (ChatGPT, Gemini, Claude.ai...) kèm theo file Excel, nhờ AI đó đọc và xuất ra đúng 1 file JSON theo cấu trúc mà tính năng "Import DS" của trang quản trị CS2 (`/cs2/quan-tri` → tab "Import DS") đang chấp nhận.
>
> Dùng khi: có 1 lớp (hoặc nhiều lớp) cần **thêm mới/thay thế toàn bộ danh sách** — ví dụ lớp 10 vừa đổi danh sách, xoá lớp cũ (xem mục 6.4 trang quản trị — nút "Xoá cả lớp") rồi import lại file JSON mới theo đúng hướng dẫn này.

---

## Cách dùng file này

1. Copy toàn bộ nội dung từ mục **"PROMPT — DÁN TỪ ĐÂY"** bên dưới.
2. Mở AI web bạn muốn dùng, đính kèm file Excel danh sách học sinh lớp 10 mới.
3. Dán prompt đã copy vào, gửi đi.
4. AI trả về 1 khối JSON — tải/copy nó ra thành 1 file `.json` (đặt tên gì cũng được, ví dụ `ds-lop-10-moi.json`).
5. Vào `/cs2/quan-tri` (đăng nhập `admincs2`/mật khẩu quản trị) → tab **"Import DS"** → chọn file JSON vừa tạo → làm theo màn hình xem trước → xác nhận import.

---

## PROMPT — DÁN TỪ ĐÂY

```
Tôi có 1 file Excel đính kèm chứa danh sách học sinh. Nhiệm vụ của bạn: đọc file Excel này
và xuất ra ĐÚNG 1 file JSON theo CHÍNH XÁC cấu trúc dưới đây, không thêm/bớt field nào khác,
không giải thích gì thêm ngoài khối JSON.

## Cấu trúc JSON bắt buộc

{
  "dataset_type": "exam_candidate_list",
  "dataset_name": "<tên gợi nhớ, ví dụ: DS học sinh lớp 10 mới>",
  "groups": [
    {
      "id": "dot-1",
      "name": "<tên đợt, ví dụ: Danh sách lớp 10 mới>",
      "students": [
        { "sbd": "<mã số>", "ho_ten": "<họ và tên đầy đủ>", "lop": "<tên lớp>" }
      ]
    }
  ]
}

## Quy tắc map dữ liệu (BẮT BUỘC tuân thủ)

1. `dataset_type` LUÔN LUÔN là chuỗi cố định "exam_candidate_list" - không đổi.
2. `groups` là 1 mảng - nếu file Excel chỉ có 1 lớp/1 đợt, chỉ cần đúng 1 phần tử trong mảng
   này chứa TẤT CẢ học sinh trong "students".
3. Mỗi học sinh trong "students" bắt buộc có đủ 3 field, không được thiếu field nào:
   - "sbd": mã số định danh của học sinh trong file Excel (số báo danh, mã học sinh, STT
     toàn trường, hoặc bất kỳ cột nào đóng vai trò "mã số duy nhất" của học sinh đó).
     - Luôn để dạng CHUỖI (string), kể cả khi trong Excel là số - ví dụ 262305 phải xuất ra
       "262305" (có dấu ngoặc kép), không phải 262305 (không dấu ngoặc kép).
     - Nếu Excel có cột mã số sẵn (ví dụ "SBD", "Mã HS", "STT") thì dùng đúng cột đó.
     - Nếu Excel KHÔNG có cột mã số nào, tự đánh số tuần tự bắt đầu từ 1 cho toàn bộ học
       sinh trong file (dạng chuỗi "1", "2", "3"...) và NÓI RÕ ĐIỀU NÀY ở cuối câu trả lời
       (sau khối JSON) để tôi biết mà xử lý.
     - Giá trị này phải DUY NHẤT cho từng học sinh trong cùng 1 file - không được trùng.
   - "ho_ten": họ và tên đầy đủ của học sinh, viết hoa CHỮ CÁI ĐẦU mỗi từ theo đúng chuẩn
     tiếng Việt (ví dụ "Nguyễn Văn A", không phải "NGUYỄN VĂN A" hay "nguyễn văn a").
     Nếu Excel có 2 cột riêng (Họ và Tên), ghép lại thành 1 chuỗi đầy đủ, cách nhau 1 dấu cách.
   - "lop": tên lớp học sinh đó đang học, viết HOA TOÀN BỘ và không có khoảng trắng thừa -
     ví dụ "10A21" (không phải "10a21", không phải "10 A21", không phải "Lớp 10A21").
     Giữ NGUYÊN VẸN đúng tên lớp có trong Excel, chỉ chuẩn hoá viết hoa/khoảng trắng, KHÔNG
     tự ý đổi tên lớp hay gộp/tách lớp.
4. Nếu 1 dòng trong Excel bị thiếu bất kỳ thông tin nào trong 3 mục trên (thiếu tên, thiếu
   lớp, hoặc không xác định được mã số), BỎ QUA dòng đó (không đưa vào "students") và liệt
   kê rõ những dòng bị bỏ qua (số thứ tự dòng trong Excel + lý do) ở cuối câu trả lời, SAU
   khối JSON.
5. Giữ NGUYÊN dấu tiếng Việt, không được làm sai lệch/mất dấu bất kỳ ký tự nào. Đầu ra PHẢI
   là JSON hợp lệ, mã hoá UTF-8 chuẩn - dấu tiếng Việt phải hiển thị đúng (ví dụ "Nguyễn",
   không phải dạng lỗi font kiểu "Nguyá»…n" hay "NguyOn").
6. Nếu file Excel có nhiều sheet/nhiều lớp khác nhau, có thể gộp chung tất cả học sinh vào
   1 "group" duy nhất (mỗi học sinh vẫn ghi đúng "lop" của mình) - không bắt buộc phải tách
   nhiều group theo lớp.
7. Chỉ trả về ĐÚNG 1 khối JSON (bọc trong dấu ```json ... ```), không thêm chữ nào trước
   khối JSON. Sau khối JSON, nếu có ghi chú (theo mục 3 hoặc 4 ở trên) thì viết ngắn gọn.

Hãy đọc file Excel tôi đính kèm và xuất JSON theo đúng cấu trúc/quy tắc trên.
```

---

## Sau khi có file JSON — tự kiểm tra nhanh trước khi import

- [ ] File mở được bằng trình duyệt/VS Code, không báo lỗi cú pháp JSON.
- [ ] `dataset_type` đúng là `"exam_candidate_list"`.
- [ ] Mở vài dòng bất kỳ trong `students`, xác nhận dấu tiếng Việt hiển thị đúng (không bị lỗi font kiểu "Nguyá»…n").
- [ ] `sbd` của mỗi học sinh là DUY NHẤT trong file (không trùng nhau) - đây sẽ là **mã học sinh chính thức, vĩnh viễn** trong hệ thống, không đổi lại được sau này.
- [ ] `lop` viết hoa toàn bộ, đúng tên lớp thật (ví dụ "10A21") - vì tên lớp này còn được dùng làm **tài khoản đăng nhập cho GVCN** ở tab "Giáo viên theo dõi tiến độ" (trang tra cứu công khai), phải khớp chính xác.

## Lưu ý khi import

- Nếu lớp đó **đã có sẵn dữ liệu cũ** trong hệ thống (ví dụ đang thay danh sách lớp 10 cũ bằng danh sách mới): vào `/cs2/quan-tri` → tab "Danh sách theo lớp" → chọn đúng lớp → bấm **"🗑️ Xoá cả lớp"** (gõ lại tên lớp để xác nhận) → xoá xong mới sang tab "Import DS" nhập file JSON mới, tránh bị trùng/lẫn dữ liệu cũ-mới.
- Màn hình "Import DS" sẽ tự hiện bảng xem trước theo từng lớp trước khi xác nhận — kiểm tra kỹ số lượng học sinh khớp với file Excel gốc rồi mới bấm xác nhận.
