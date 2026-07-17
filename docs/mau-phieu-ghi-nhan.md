# Mẫu phiếu ghi nhận giấy — In và phát cho ban cán sự lớp

> **Cập nhật quan trọng (12/07/2026)**: thay thế hoàn toàn bản 3 phần + mã trước đó. Bản cũ bắt ban cán sự tra mã (CC/VS/NN/KL...) — quá phức tạp, khiến các em mất tập trung vào việc học chỉ để ghi phiếu. Bản mới: **1 mẫu duy nhất, không mã, ghi tự do** — việc suy luận đúng mã do AI xử lý khi chuyển thành dữ liệu (xem `mau-prompt-chuyen-doi-json.md`), không phải việc của các em.
>
> **Rà soát (17/07/2026)**: sau khi app có DanhMucDiem động, tạo danh mục khi import, so khớp mã hiện hành và unit test import, mẫu phiếu này **vẫn giữ nguyên chủ đích**: không đưa danh mục/mã/dropdown lên giấy. Học sinh hoặc ban cán sự chỉ ghi sự việc thật; AI + màn Import mới là nơi đối chiếu danh mục và xử lý mã.
>
> **Cập nhật (17/07/2026)**: đổi cách ghi từ "mỗi học sinh một dòng" sang **mỗi nội dung ghi nhận một dòng**. Nếu nhiều học sinh cùng một lỗi/thành tích, ghi nội dung một lần và liệt kê các bạn trong cột liên quan để tiết kiệm dòng.

---

## PHIẾU GHI NHẬN HỌC SINH — LỚP 11C5

**Ngày ghi nhận:** ____ / ____ / 2026 &nbsp;&nbsp;&nbsp; **Người ghi nhận (chức vụ):** ______________________

| STT | Tiết | Môn | Loại | Nội dung ghi nhận | Học sinh / tổ / cả lớp liên quan | Ghi chú |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |

### Hướng dẫn ghi (đơn giản, không cần tra cứu gì cả)

1. **Loại**: ghi ngắn `Vi phạm`, `Tích cực` hoặc `Điểm số`. Nếu không chắc, để trống và ghi rõ nội dung.
2. **Nội dung ghi nhận**: ghi sự việc chính một lần — ví dụ *"không mang máy tính"*, *"không bao bìa, dán nhãn sách vở"*, *"giơ tay xây dựng bài"*, *"được 9 điểm miệng Toán"*.
3. **Học sinh / tổ / cả lớp liên quan**: nếu nhiều học sinh cùng nội dung, ghi chung trong một ô, ngăn cách bằng dấu phẩy. Ví dụ: *"An, Bình, Huy"*.
4. Nếu là chuyện của **cả lớp** hoặc **1 tổ**, ghi *"cả lớp"* hoặc *"tổ 2"* ở cột liên quan.
5. **Tiết, Môn**: chỉ điền nếu chuyện xảy ra trong một tiết học cụ thể — không thì để trống.
6. Chỉ ghi dòng có chuyện xảy ra; cuối buổi nộp phiếu cho giáo viên chủ nhiệm hoặc lớp phó phụ trách tổng hợp.

---

### Ghi chú cho giáo viên (không in phần này)

Sau khi thu phiếu, chụp ảnh, đưa vào Claude kèm đúng prompt trong `du-lieu-mau/mau-prompt-chuyen-doi-json.md` — AI sẽ tự đọc mô tả tự do, tự tách một dòng có nhiều học sinh thành nhiều bản ghi JSON cá nhân, tự suy luận đúng mã (CC/VS/NN/KL/KT) và đúng phạm vi (cá nhân/tổ trực/tập thể) dựa vào ngữ cảnh. Sau đó dán JSON vào màn hình Import như quy trình cũ.

> Bảng tra cứu mã (`bang-tra-cuu-ma-diem.md`) từ giờ chỉ dùng **nội bộ cho AI và giáo viên**, không in phát cho ban cán sự nữa.
