# 08 — Thiết kế Liên kết Chi tiết & Hệ màu Tổng quan

> Cũng là quyết định nghiệp vụ/thiết kế do em chốt trước — AI trong IDE triển khai đúng theo đây (không tự bịa thêm hành vi bấm-vào-đâu hay màu sắc khác).

## Phần 1 — Nguyên tắc liên kết chi tiết (drill-down)

> **Cập nhật (11/07/2026)**: nâng thành nguyên tắc **bắt buộc tuyệt đối, không còn ngoại lệ** — trước đây TK01/TK06/TK07/TK08 được ghi "không bắt buộc bấm được", nay **tất cả đều bắt buộc**. Không có "số chết" nào trên toàn bộ báo cáo.

**Nguyên tắc chung**: mọi con số/thẻ/badge hiển thị trên Tổng quan, hồ sơ học sinh, Nhật ký theo ngày, danh sách học sinh đều phải:
1. Đổi con trỏ thành hình bàn tay khi rê chuột qua (`cursor: pointer`).
2. Có phản hồi thị giác nhỏ khi hover (gạch chân nhạt hoặc đổi nền nhạt hơn) — để người dùng biết chỗ đó bấm được mà không cần đoán.
3. Bấm vào → dẫn đúng tới danh sách/màn chi tiết cấu thành con số đó.

### Bảng ánh xạ: bấm vào đâu → dẫn tới đâu (đã cập nhật — không còn mục "không bắt buộc")

| Vùng bấm | Dẫn tới |
|---|---|
| Thẻ **TK01** (Sĩ số & học sinh "sạch") | Bấm vào số "22 em không có ghi nhận" → mở danh sách đúng các em đó (để biết ai đang ổn, cũng hữu ích) |
| Thẻ **TK02** (Học sinh cần chú ý) | Mở danh sách rút gọn đúng những em đó (tên + điểm thành phần thấp nhất), bấm tiếp vào 1 tên → hồ sơ đầy đủ |
| Thẻ **TK03** (Vi phạm nghiêm trọng) | Mở danh sách các dòng `GhiNhan` nghiêm trọng trong tuần (tên học sinh + mã + ngày + đã xử lý chưa), bấm vào tên → hồ sơ |
| Thẻ **TK04** (Sự kiện tập thể/tổ trực chờ xử lý) | Mở danh sách các sự kiện đó. Xem "Phần 1b" để biết bấm vào từng loại sự kiện dẫn tới đâu |
| Thẻ **TK05** (Vi phạm phổ biến nhất) | Mở danh sách toàn bộ các dòng `GhiNhan` mang đúng mã đó trong tuần, kèm tên học sinh liên quan |
| Thẻ **TK06** (Điểm trung bình theo nhóm, VD "KL: 85") | Bấm vào 1 nhóm → nhảy thẳng tới khu vực **"Xem theo Nhóm vi phạm"** (Phần 1c, mới) với đúng nhóm đó đã chọn sẵn |
| Thẻ **TK07** (Xu hướng so tuần trước) | Bấm vào → mở bảng so sánh chi tiết từng nhóm giữa tuần đang xem và tuần liền trước (không chỉ 1 con số chênh lệch chung) |
| Thẻ **TK08** (Nhịp độ ghi nhận) | Bấm vào → nhảy tới khu "Nhật ký theo ngày" (C033/C040), tự động chọn sẵn ngày gần nhất có ghi nhận |
| Bất kỳ badge/chip mã vi phạm (VD `KL09`) ở bất kỳ đâu | Bấm vào → popup nhỏ hiện mô tả đầy đủ mã đó (tên, điểm trừ, phạm vi) từ bảng tra cứu |

### Phần 1b — Bấm vào sự kiện tập thể/tổ trực (TK04) dẫn tới đâu, chi tiết hơn

- **Nếu sự kiện có `pham_vi = to_truc`** (VD: tổ 2 trực nhật muộn): bấm vào → mở màn **"Thông tin Tổ"** gồm:
  - Số tổ, tên tổ trưởng (tra từ `BanCanSu`)
  - Danh sách toàn bộ học sinh có `HocSinh.to` = đúng số tổ đó
  - Lịch sử các sự kiện tổ trực khác của tổ này trong tuần/tháng gần đây (để biết tổ này có hay bị nhắc không, hay chỉ 1 lần)
  - Vẫn giữ nguyên 3 nút xử lý nhanh đã có (Gán 1 học sinh / Áp dụng cho cả tổ / Bỏ qua — từ C021a)
- **Nếu sự kiện có `pham_vi = tap_the`** (VD: cả lớp ồn giờ chào cờ): bấm vào → mở chi tiết sự kiện (mô tả, ngày, mã) kèm 3 nút xử lý nhanh như cũ (Gán 1 học sinh / Áp dụng cho cả lớp / Bỏ qua) — không cần "Thông tin Tổ" vì áp dụng cho cả lớp, không phải 1 tổ riêng.

### Phần 1c — Khu vực "Xem theo Nhóm vi phạm" (mới)

Trả lời đúng câu hỏi "lỗi của ai thuộc nhóm nào" — 1 khu vực/tab riêng trên Dashboard (cạnh "Tổng quan" và "Nhật ký theo ngày"):

1. **Bộ chọn nhóm**: 5 nút — Chuyên cần / Vệ sinh / Nề nếp / Kỷ luật / Học tập — dùng đúng màu tương ứng theo Phần 2 bên dưới, để bấm nhanh bằng mắt không cần đọc chữ.
2. **Khi chọn 1 nhóm** (VD: Kỷ luật): hiện danh sách toàn bộ học sinh có ít nhất 1 ghi nhận thuộc nhóm đó trong tuần đang xem, **sắp xếp điểm thấp nhất lên đầu** (tệ nhất trước). Mỗi dòng gồm: tên học sinh, điểm hiện tại của nhóm đó, số lần vi phạm, danh sách mã vi phạm cụ thể (dạng badge màu). Bấm vào 1 dòng → hồ sơ đầy đủ của em đó.
3. Học sinh không có vi phạm nhóm đó (còn nguyên 100 điểm) mặc định **không hiện** trong danh sách này (để tập trung vào ai cần chú ý) — có 1 công tắc nhỏ "Hiện cả học sinh không vi phạm" nếu giáo viên muốn xem đủ 36 em.
4. Nhóm **Học tập** hiển thị khác 1 chút (không phải "vi phạm"): sắp xếp điểm học tập từ thấp đến cao, mỗi dòng hiện điểm trung bình + danh sách điểm số từng môn trong tuần.

## Phần 2 — Hệ màu theo nhóm nội dung (dùng nhất quán toàn app)

**Mục tiêu**: nhìn màu là biết ngay thuộc nhóm nào, không cần đọc chữ — áp dụng cho mọi nơi có hiển thị mã/nhóm: badge trong lịch sử ghi nhận, nhật ký theo ngày, dashboard, hồ sơ học sinh, kể cả bảng tra cứu mã.

| Nhóm | Màu nền/chữ (Tailwind gợi ý) | Icon gợi ý |
|---|---|---|
| **CC** — Chuyên cần | Xanh dương (`blue-100` nền / `blue-700` chữ) | 🕐 |
| **VS** — Vệ sinh | Xanh lá (`green-100` / `green-700`) | 🧹 |
| **NN** — Nề nếp, tác phong | Tím (`purple-100` / `purple-700`) | 👔 |
| **KL** — Trật tự, kỷ luật (mức thường, −5/−10) | Cam (`orange-100` / `orange-700`) | ⚠️ |
| **KL nghiêm trọng** (mức −20, `nghiem_trong = true`) | Đỏ đậm (`red-100` nền / `red-700` chữ, thêm viền `border-red-500`) | 🔴 |
| **HT** — Học tập | Vàng (`yellow-100` / `yellow-700`) | 📘 |
| **Sự kiện tập thể/tổ trực** (bất kể nhóm nào) | Xám xanh trung tính (`slate-100` / `slate-600`), thêm icon riêng để phân biệt với vi phạm cá nhân dù cùng nhóm nội dung | 👥 |
| **KT** — Điểm cộng (nếu bật, tài liệu 03 mục 6) | Xanh ngọc (`teal-100` / `teal-700`) | ⭐ |

### Quy tắc phối màu cho thẻ Tổng quan (khác với màu theo nhóm ở trên)

- **Nhóm thẻ "Cần hành động ngay"** (TK02, TK03, TK04): nền nhạt màu đỏ/cam (`red-50` hoặc `orange-50`), viền `border-red-200`, để nổi bật cần chú ý.
- **Nhóm thẻ "Quan sát chung"** (TK01, TK05–TK08): nền trung tính xám nhạt (`slate-50`), viền `border-slate-200`.
- Khi 1 thẻ "Cần hành động" đang ở trạng thái rỗng/tích cực (VD "Không có học sinh nào cần chú ý"): đổi nền sang xanh lá nhạt (`green-50`), viền `border-green-200` — để phân biệt rõ "tốt" khỏi "đang có vấn đề".

## Phần 3 — Commit liên quan

Xem tài liệu 06, mục "Đợt phát hiện #6" và "#7": **C045** (drill-down cơ bản cho các thẻ TK), **C046** (màn "Thông tin Tổ"), **C047** (áp dụng hệ màu nhất quán toàn app), **C049** (khu vực "Xem theo Nhóm vi phạm"), **C050** (áp dụng nguyên tắc điều hướng bắt buộc toàn bộ, không còn ngoại lệ).
