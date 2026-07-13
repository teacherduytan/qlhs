# 07 — Danh mục Chỉ số Thống kê Tổng quan

> Đây là bản thiết kế nghiệp vụ do em (kiến trúc sư) xây dựng theo yêu cầu của anh — **AI trong IDE không được tự nghĩ ra chỉ số khác**, chỉ triển khai đúng danh mục này theo đúng phạm vi của **commit C043** ở tài liệu 06. Nếu anh muốn thêm/bớt/đổi thứ tự chỉ số nào, sửa ở đây trước, rồi mới giao cho AI — không sửa trực tiếp trong code.

## Mục tiêu

Một giáo viên chủ nhiệm mở app lên, **không cần bấm vào đâu cả**, nhìn vùng đầu trang Tổng quan trong vài giây phải biết: *lớp mình tuần này ổn không, có ai cần lo ngay không, có việc gì đang treo chưa xử lý không.*

## Cách trình bày

Dạng **dải thẻ (card)** nằm ngang đầu trang Dashboard, chia 2 nhóm rõ rệt — nhóm cần hành động đặt trước, nhóm quan sát đặt sau:

```
┌─────────────────────────────────────────────────────────┐
│  🔴 NHÓM CẦN HÀNH ĐỘNG NGAY                              │
│  [TK02: 3 học sinh    ] [TK03: 2 vi phạm  ] [TK04: 5 sự  │
│  [cần chú ý           ] [nghiêm trọng     ] [kiện chờ xử │
│                                              lý          ] │
├─────────────────────────────────────────────────────────┤
│  ⚪ NHÓM QUAN SÁT CHUNG                                   │
│  [TK01: sĩ số &   ] [TK05: vi phạm   ] [TK06: điểm TB  ] │
│  [học sinh sạch   ] [phổ biến nhất   ] [theo nhóm      ] │
│  [TK07: xu hướng  ] [TK08: nhịp độ ghi nhận] [TK09: tích│
│                                            ] [cực       ] │
└─────────────────────────────────────────────────────────┘
```

## Danh mục chi tiết

### Nhóm A — Cần hành động ngay (ưu tiên hiển thị trước, màu nổi bật hơn)

| Mã | Chỉ số | Cách tính | Ví dụ hiển thị | Bấm vào đi đâu |
|---|---|---|---|---|
| TK02 | **Học sinh cần chú ý** | Đếm học sinh có ≥1 trong 4 thành phần (CC/VS/NN/KL) < 50 điểm trong tuần đang xem | "⚠️ 3 học sinh cần chú ý" + tên rút gọn từng em | Mở nhanh danh sách 3 em đó, bấm tiếp vào 1 em → hồ sơ đầy đủ |
| TK03 | **Vi phạm nghiêm trọng trong tuần** | Đếm `GhiNhan` có `nghiem_trong = true` (các mã trừ 20 điểm) trong tuần đang xem | "🔴 2 vi phạm nghiêm trọng" + tên + mã vi phạm | Mở danh sách 2 vi phạm đó kèm gợi ý xử lý (tài liệu 03 mục 8) |
| TK04 | **Sự kiện tập thể/tổ trực chờ xử lý** | Đếm `GhiNhan` có `pham_vi ≠ ca_nhan` và `trang_thai_xu_ly_tap_the = chua_xu_ly` | "🟡 5 sự kiện đang chờ xử lý" | Nhảy thẳng tới khu xử lý sự kiện tập thể (C021a) |

### Nhóm B — Quan sát chung (bối cảnh, không cần xử lý ngay)

| Mã | Chỉ số | Cách tính | Ví dụ hiển thị | Bấm vào đi đâu |
|---|---|---|---|---|
| TK01 | **Sĩ số & học sinh "sạch"** | Tổng số học sinh đang học (theo `ngay_nhap_hoc`/`ngay_roi_lop`) / số em không có `GhiNhan` nào trong tuần | "36 học sinh — 22 em không có ghi nhận tuần này" | Không cần bấm, chỉ để biết |
| TK05 | **Vi phạm phổ biến nhất tuần** | Chỉ nhóm các mã trừ điểm thuộc CC/VS/NN/KL, đếm số lần, lấy top 3. **Không tính `khen_thuong`/KT và không tính `hoc_tap`**, vì đây không phải vi phạm. | "CC01 (đi trễ): 3 lần — nhiều nhất tuần" | Xem danh sách đầy đủ các lần vi phạm mã đó |
| TK06 | **Điểm trung bình lớp theo từng nhóm** | Trung bình cộng cả lớp cho từng thành phần CC/VS/NN/KL | "CC: 96 · VS: 98 · NN: 97 · KL: 85" (số nào thấp nhất tô đậm) | Không cần bấm, giúp biết lớp đang yếu ở mảng nào |
| TK07 | **Xu hướng so với tuần trước** | So điểm xếp loại trung bình cả lớp tuần đang xem với tuần liền trước | "↓ giảm 4 điểm so với Tuần 1" (ẩn nếu là tuần đầu tiên, chưa có gì để so) | Không cần bấm |
| TK08 | **Nhịp độ ghi nhận** | Ngày gần nhất có ghi nhận + số ngày trong tuần có ít nhất 1 dòng dữ liệu | "Ghi nhận gần nhất: 17/07 — 4/5 ngày có dữ liệu" | Nhảy tới khu "Nhật ký theo ngày" (C033) đúng ngày thiếu |
| TK09 | **Ghi nhận tích cực trong tuần** | Đếm các dòng `GhiNhan` có `loai = khen_thuong` hoặc mã thuộc nhóm `KT`; hiển thị top mã KT/nội dung tích cực nhiều nhất nếu có. | "⭐ 4 ghi nhận tích cực — KT01: 3 lần" | Mở danh sách các ghi nhận tích cực trong tuần, kèm tên học sinh và nội dung |

## Quy tắc hiển thị khi rỗng (tránh vỡ layout)

- Nếu **không có** học sinh cần chú ý / vi phạm nghiêm trọng / sự kiện chờ xử lý → thẻ vẫn hiện, nhưng đổi màu trung tính + nội dung tích cực, ví dụ: *"✅ Không có học sinh nào cần chú ý tuần này"* — không ẩn thẻ đi, để giáo viên biết chắc là "đã kiểm tra rồi, không phải app chưa tải xong".
- TK07 (xu hướng) nếu là tuần đầu tiên chưa có tuần trước để so → ẩn thẻ này, không hiện "0%" hay số âm gây hiểu lầm.

## Có thể mở rộng sau (KHÔNG làm ở C043, chỉ ghi chú trước)

- TK10 (đề xuất, chưa làm): Số học sinh có xu hướng **tiến bộ** (điểm tăng so với tuần trước) — để cân bằng, không chỉ nhìn mặt tiêu cực.
- TK11 (đề xuất, chưa làm): Tỷ lệ đúng giờ chào cờ / chuyên cần toàn lớp theo thời gian (biểu đồ nhỏ nhiều tuần).

Đây chỉ là ghi chú cho tương lai — **không đưa vào phạm vi C043**, tránh việc AI tự làm luôn cả phần chưa cần thiết.
