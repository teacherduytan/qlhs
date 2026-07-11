# 08 — Thiết kế Liên kết Chi tiết & Hệ màu Tổng quan

> Cũng là quyết định nghiệp vụ/thiết kế do em chốt trước — AI trong IDE triển khai đúng theo đây (không tự bịa thêm hành vi bấm-vào-đâu hay màu sắc khác).

## Phần 1 — Nguyên tắc liên kết chi tiết (drill-down)

**Nguyên tắc chung**: mọi con số/thẻ tổng hợp hiển thị trên Tổng quan đều phải bấm được, dẫn thẳng tới đúng danh sách chi tiết cấu thành con số đó. Không có "số chết" (hiện số nhưng không bấm được gì).

### Bảng ánh xạ: bấm vào đâu → dẫn tới đâu

| Vùng bấm | Dẫn tới |
|---|---|
| Thẻ **TK02** (Học sinh cần chú ý) | Mở danh sách rút gọn đúng những em đó (tên + điểm thành phần thấp nhất), bấm tiếp vào 1 tên → hồ sơ đầy đủ |
| Thẻ **TK03** (Vi phạm nghiêm trọng) | Mở danh sách các dòng `GhiNhan` nghiêm trọng trong tuần (tên học sinh + mã + ngày + đã xử lý chưa), bấm vào tên → hồ sơ |
| Thẻ **TK04** (Sự kiện tập thể/tổ trực chờ xử lý) | Mở danh sách các sự kiện đó. Xem "Phần 1b" bên dưới để biết bấm vào từng loại sự kiện dẫn tới đâu |
| Thẻ **TK05** (Vi phạm phổ biến nhất) | Mở danh sách toàn bộ các dòng `GhiNhan` mang đúng mã đó trong tuần, kèm tên học sinh liên quan |
| Thẻ **TK01, TK06, TK07, TK08** | Không bắt buộc bấm được (chỉ mang tính thông tin bối cảnh) — nhưng nếu dễ làm, TK06 (điểm TB theo nhóm) nên bấm vào 1 nhóm (VD "KL: 85") → lọc dashboard chỉ hiện các vi phạm nhóm KL trong tuần |
| Bất kỳ badge/chip mã vi phạm (VD `KL09`) xuất hiện ở hồ sơ, nhật ký theo ngày, dashboard... | Bấm vào → popup nhỏ hiện mô tả đầy đủ mã đó (tên, điểm trừ, phạm vi) từ bảng tra cứu — không cần mở file riêng để tra |

### Phần 1b — Bấm vào sự kiện tập thể/tổ trực (TK04) dẫn tới đâu, chi tiết hơn

- **Nếu sự kiện có `pham_vi = to_truc`** (VD: tổ 2 trực nhật muộn): bấm vào → mở màn **"Thông tin Tổ"** gồm:
  - Số tổ, tên tổ trưởng (tra từ `BanCanSu`)
  - Danh sách toàn bộ học sinh có `HocSinh.to` = đúng số tổ đó
  - Lịch sử các sự kiện tổ trực khác của tổ này trong tuần/tháng gần đây (để biết tổ này có hay bị nhắc không, hay chỉ 1 lần)
  - Vẫn giữ nguyên 3 nút xử lý nhanh đã có (Gán 1 học sinh / Áp dụng cho cả tổ / Bỏ qua — từ C021a)
- **Nếu sự kiện có `pham_vi = tap_the`** (VD: cả lớp ồn giờ chào cờ): bấm vào → mở chi tiết sự kiện (mô tả, ngày, mã) kèm 3 nút xử lý nhanh như cũ (Gán 1 học sinh / Áp dụng cho cả lớp / Bỏ qua) — không cần "Thông tin Tổ" vì áp dụng cho cả lớp, không phải 1 tổ riêng.

### Ví dụ cụ thể để AI hiểu đúng

> Giáo viên thấy thẻ TK04 ghi "5 sự kiện đang chờ xử lý", bấm vào → thấy danh sách 5 dòng, trong đó có "Tổ 2 — Vệ sinh không đúng giờ (VS01)". Bấm vào đúng dòng đó → mở ra: *"Tổ 2 (Tổ trưởng: Nguyễn Trọng Hòa) — 12 học sinh: [danh sách tên] — Lịch sử: đây là lần thứ 2 tổ 2 bị nhắc trong tháng"* + 3 nút xử lý.

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

Xem tài liệu 06, mục "Đợt phát hiện #6": **C045** (drill-down cho các thẻ TK), **C046** (màn "Thông tin Tổ"), **C047** (áp dụng hệ màu nhất quán toàn app).
