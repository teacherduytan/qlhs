# Dữ liệu giả để xem giao diện — Tuần 2 (13–17/07/2026)

File `du-lieu-gia-tuan2.json` — nhập thẳng qua màn hình Import (chọn loại "Ghi nhận"), **bỏ qua bước phiếu giấy → AI chuyển đổi**, coi như dữ liệu đã được chuyển sẵn. 22 bản ghi, phủ toàn bộ tình huống hiện app đang đảm nhận; trong đó có 1 dòng cố ý sai chính tả tên học sinh để test log lỗi import.

## Bảng đối chiếu — mỗi dòng test cái gì

| Ngày | Học sinh / Sự kiện | Test cái gì |
|---|---|---|
| 13/07 | Bùi Vân Anh — đi trễ (CC01) | Vi phạm cá nhân cơ bản, chuyên cần |
| 13/07 | Lại Gia Huy — điện thoại (KL08), đã xử lý | Trường `đã xử lý` / `hình thức xử lý` / `gọi phụ huynh` hiển thị đúng |
| 13/07 | Nguyễn Ngọc Trần Kim Ngân — điểm Toán 9.0 | Ghi nhận điểm học tập (`loai=hoc_tap`) |
| 13/07 | Tổ 2 trực nhật muộn (VS01, tổ trực) | Sự kiện **tổ trực** — chờ xử lý trên dashboard (C021a) |
| 13/07 | Cả lớp chào cờ muộn (KL01, tập thể) | Sự kiện **tập thể** — chờ xử lý trên dashboard (C021a) |
| 14/07 | Bùi Vân Anh — đi trễ lần 2 | Cùng 1 học sinh vi phạm lặp lại (chuẩn bị test rule "≥3 lần") |
| 14/07 | Phạm Phước Thịnh — vô lễ GV (KL09, −20) | Vi phạm **nghiêm trọng** → cờ cảnh báo ngay, không chờ cuối tuần |
| 14/07 | Nguyễn Hoàng Tâm Vy — tóc (NN04) | Nhóm Nề nếp |
| 14/07 | Nguyễn Ngọc Trần Kim Ngân — điểm Văn 7.5 | Điểm học tập lần 2 → test tính trung bình nhiều môn |
| 14/07 | Đặng Tấn Khang — mang đồ ăn (VS03) | Vệ sinh cá nhân |
| 15/07 | Bùi Vân Anh — đi trễ lần 3 | Đủ 3 lần cùng mã CC01 trong tuần → **phải** thấy gợi ý "vi phạm lặp lại" (tài liệu 03 mục 8) |
| 15/07 | *(không có gì khác)* | Ngày gần như trắng — test khu vực "Nhật ký theo ngày" (C033) vẫn hiện đủ ngày 15/07 dù ít dữ liệu |
| 16/07 | Lê Huỳnh Quốc Giang — đánh nhau (KL11, −20) | Vi phạm nghiêm trọng khác + chuẩn bị test cờ đỏ nhân đôi (xem lưu ý bên dưới) |
| 16/07 | Tổ 3 hành lang bẩn (VS04, tổ trực) | Sự kiện tổ trực thứ 2 |
| 16/07 | Nguyễn Như Quỳnh — điểm Hoá 6.0 | Điểm học tập |
| 16/07 | Lê Nguyễn Vy Oanh — không bảng tên (NN02) | Nề nếp |
| 17/07 | Cả lớp nhận cơm trễ (KL15, tập thể) | Sự kiện tập thể thứ 2 |
| 17/07 | Bán trú ăn trưa bẩn (VS06, tập thể) | Sự kiện tập thể thứ 3 |
| 17/07 | Bùi Vân Anh — điểm Anh 8.0 | Học sinh vừa có vi phạm (CC01×3) vừa có điểm học tập → test điểm tổng hợp đầy đủ |
| 17/07 | Lê Huỳnh Quốc Giang — điểm Sinh 5.5 | Học sinh vi phạm nghiêm trọng nhưng vẫn có điểm học tập song song |
| 17/07 | Vũ Quang Tùng — thuốc lá điện tử (KL06, −20), đã xử lý | Vi phạm nghiêm trọng đã xử lý xong |
| 17/07 | Lại Gia Huy — cờ đỏ bỏ trực (CC04) | Test mã dành riêng cờ đỏ |
| 17/07 | **"Nguyễn Văn Chinh"** (cố ý sai chính tả) — đi trễ | **Cố ý** để test cơ chế báo lỗi khớp tên (C034) — dòng này phải bị từ chối, xuất hiện trong log lỗi của `NhatKyImport`, không được tự động gán nhầm cho "Nguyễn Văn Chính" (HS003) |

## Học sinh KHÔNG xuất hiện trong bất kỳ dòng nào (cố ý)

**Đỗ Tâm Nhi (HS036)** không có bất kỳ ghi nhận nào cả tuần — dùng để kiểm tra: học sinh "sạch" phải hiện **4 thành phần đều 100 điểm**, điểm học tập hiện **"Chưa có dữ liệu"** (không phải số 0), và điểm tổng hợp phải là **100** — đúng bản sửa lỗi 66,67 ở C031. Nếu em này vẫn hiện dưới 100, nghĩa là C031 chưa thực sự sửa đúng.

## Cần làm tay trước khi import (không nằm trong file JSON)

- Để thấy đúng hệ số **nhân đôi điểm trừ cờ đỏ** ở dòng CC04 của Lại Gia Huy (HS010): vào Sheet, sửa `la_co_do` của HS010 thành `true` **trước khi** import file này. Nếu không sửa, dòng đó vẫn ghi nhận bình thường nhưng chỉ trừ đúng 10 điểm (không nhân đôi).

## Sau khi import xong, nên kiểm tra

1. Hồ sơ học sinh Bùi Vân Anh: điểm Chuyên cần phải giảm đúng 3 lần −2 (còn 94), điểm tổng hợp tính đủ 6 phần vì đã có điểm học tập.
2. Dashboard giáo viên: có đúng 2 học sinh bị cờ cảnh báo ngay (Phạm Phước Thịnh, Lê Huỳnh Quốc Giang, Vũ Quang Tùng — vi phạm mức −20).
3. Dashboard: khu vực "Sự kiện của lớp/tổ" phải có đúng 5 sự kiện đang chờ xử lý (2 tổ trực + 3 tập thể) — thử cả 3 thao tác (gán 1 học sinh / áp dụng cho tất cả / bỏ qua) trên từng sự kiện khác nhau để test đủ.
4. Khu vực "Nhật ký theo ngày": đủ 5 ngày (13–17/07), ngày 15/07 gần như trống vẫn phải hiện rõ, không bị ẩn.
5. Lịch sử import (`NhatKyImport`): có đúng 1 dòng lỗi ứng với "Nguyễn Văn Chinh".

## Xoá bộ dữ liệu này sau khi xem xong

Xem tính năng mới **C036** ở tài liệu 06 — xoá theo đúng lần import này, không đụng dữ liệu khác.
