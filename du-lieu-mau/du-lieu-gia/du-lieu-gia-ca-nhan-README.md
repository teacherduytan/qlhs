# Dữ liệu test cá nhân — có đáp án tính tay để đối chiếu

File `du-lieu-gia-ca-nhan.json` — 10 bản ghi, tập trung vào **3 học sinh chưa xuất hiện trong `du-lieu-gia-tuan2.json`** (không lẫn dữ liệu, dễ đối chiếu). Cùng tuần 2 (13–17/07/2026), import thêm được, không cần xoá dữ liệu tập thể đã có.

Mục đích: không chỉ "xem có dữ liệu" mà **tính tay trước để so khớp với app** — nếu app ra số khác đáp án dưới đây, đó là bug thật.

## Học sinh 1 — Nguyễn Đăng Khoa (HS012): vi phạm rải rác nhẹ, đủ 4 nhóm

| Ngày | Sự kiện | Ảnh hưởng |
|---|---|---|
| 13/07 | CC01 đi trễ | Chuyên cần: 100 → **98** |
| 14/07 | NN03 giày dép sai quy định | Nề nếp: 100 → **95** |
| 15/07 | VS05 xả rác (cá nhân) | Vệ sinh: 100 → **95** |
| 16/07 | Điểm Toán 8.0 | Điểm học tập = (8,0 ÷ 1) × 2 = **16** |
| 17/07 | KL04 đi vào lối đi cấm | Kỷ luật: 100 → **95** |

**Đáp án cuối tuần**: CC=98, VS=95, NN=95, KL=95, Học tập=16 → Điểm xếp loại thi đua = (98+95+95+95+16) ÷ 6 = **66,5**

## Học sinh 2 — Trần Phạm Anh Thư (HS024): 1 vi phạm nghiêm trọng duy nhất

| Ngày | Sự kiện | Ảnh hưởng |
|---|---|---|
| 14/07 | KL09 vô lễ giáo viên (đã xử lý, gọi PH) | Kỷ luật: 100 → **80** (mức trừ nặng nhất, −20) |
| 16/07 | Điểm Văn 9.5 | Điểm học tập = (9,5 ÷ 1) × 2 = **19** |

**Đáp án cuối tuần**: CC=100, VS=100, NN=100, KL=80, Học tập=19 → Điểm xếp loại thi đua = (100+100+100+80+19) ÷ 6 = **66,5**

> **Thú vị**: Học sinh 1 (nhiều lỗi nhỏ) và Học sinh 2 (1 lỗi rất nặng) ra **cùng 1 con số tổng hợp 66,5** — minh chứng rõ vì sao không nên chỉ nhìn 1 con số tổng, phải xem breakdown từng thành phần mới hiểu đúng bản chất. Nếu giao diện hồ sơ chỉ hiện mỗi số tổng mà không hiện breakdown 4+1 thành phần, đây là dấu hiệu cần bổ sung thêm hiển thị chi tiết.

## Học sinh 3 — Vũ Thị Hoài Như (HS016): học sinh gương mẫu, không vi phạm gì, học tốt

| Ngày | Sự kiện | Ảnh hưởng |
|---|---|---|
| 13/07 | Điểm Anh 9.0 | |
| 15/07 | Điểm Toán 8.5 | |
| 17/07 | Điểm Lý 9.5 | |

Điểm học tập = (9,0 + 8,5 + 9,5) ÷ 3 × 2 = 9,0 × 2 = **18**

**Đáp án cuối tuần**: CC=100, VS=100, NN=100, KL=100 (không vi phạm gì), Học tập=18 → Điểm xếp loại thi đua = (100+100+100+100+18) ÷ 6 = **69,67**

> ⚠️ **Lưu ý quan trọng**: dù là học sinh **gương mẫu tuyệt đối, không vi phạm gì, điểm số rất cao**, điểm xếp loại thi đua cuối cùng vẫn chỉ là **69,67**, không phải 100. Đây **đúng theo công thức gốc của trường** (xem tài liệu 03 mục 5 — đã cập nhật cảnh báo và điều chỉnh lại ngưỡng xếp loại). Nếu anh thấy con số này lần đầu mà không có ghi chú này, rất dễ tưởng app bị lỗi tính sai — thực ra không phải.

## Sau khi import, kiểm tra gì

1. Hồ sơ 3 học sinh trên — đối chiếu đúng từng con số ở bảng "Đáp án cuối tuần".
2. Riêng Học sinh 1 và 2 — xác nhận hồ sơ hiện rõ breakdown 4 thành phần + học tập, không chỉ mỗi số tổng 66,5 (nếu chỉ hiện số tổng, 2 em này sẽ trông "giống hệt nhau" dù bản chất vi phạm hoàn toàn khác).
3. Học sinh 3 — xác nhận không có cảnh báo "điểm thấp" nào hiện ra dù chỉ đạt 69,67 (đây không phải điểm thấp, vì đã không vi phạm gì — ngưỡng xếp loại đã điều chỉnh ở tài liệu 03 mục 5 phải phản ánh đúng: 69,67 nằm trong khoảng "Tốt" theo bảng ngưỡng mới, không phải "Yếu").
