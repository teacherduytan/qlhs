# Phần mềm Quản lý Học sinh Lớp Chủ nhiệm (QLHS-11)

> Lấy học sinh làm trung tâm. Bắt đầu đơn giản — mở rộng không phá vỡ cấu trúc.

## Bộ tài liệu này gồm những gì?

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 00 | [Bối cảnh & Tầm nhìn](docs/00-boi-canh-va-tam-nhin.md) | Vấn đề, mục tiêu, nguyên tắc thiết kế, phạm vi trong/ngoài giai đoạn 1 |
| 01 | [Kiến trúc & Công nghệ](docs/01-kien-truc-cong-nghe.md) | Chọn công nghệ gì, tại sao, sơ đồ hệ thống, cách mở rộng sau này, bảo mật dữ liệu học sinh |
| 02 | [Mô hình dữ liệu](docs/02-mo-hinh-du-lieu.md) | Cấu trúc các bảng (tab) trong Google Sheets, sơ đồ quan hệ |
| 03 | [Hệ thống điểm rèn luyện 100 điểm](docs/03-he-thong-diem-ren-luyen.md) | Danh mục, tiêu chí, mức trừ/cộng điểm, ngưỡng xếp loại |
| 04 | [Lộ trình Giai đoạn 1 & Commit Roadmap](docs/04-lo-trinh-giai-doan-1.md) | Breakdown công việc, danh sách commit nguyên tử C001–C024 |
| 05 | [Quy tắc làm việc cho AI Agent](docs/05-quy-tac-ai-agent.md) | Luật cho Claude Code / Cursor / Codex khi được giao việc — không tự suy diễn |
| 06 | [Cải tiến sau triển khai](docs/06-cai-tien-sau-trien-khai.md) | **File sống** — nơi duy nhất gom các commit phát sinh sau khi Giai đoạn 1 chạy thật, copy trực tiếp vào IDE cho AI agent đọc tiếp |
| 07 | [Danh mục Chỉ số Thống kê Tổng quan](docs/07-danh-muc-thong-ke-tong-quan.md) | Thiết kế nghiệp vụ cho vùng thống kê trên Dashboard (TK01–TK08) — quyết định nghiệp vụ do mình chốt, AI chỉ triển khai đúng theo đây |
| — | [PROGRESS.md](docs/PROGRESS.md) | Bảng theo dõi tiến độ từng commit |
| — | [Mẫu phiếu ghi nhận giấy](docs/mau-phieu-ghi-nhan.md) | 3 phần: theo tiết / nề nếp đầu buổi / sự kiện tập thể — in ra, phát cho ban cán sự lớp, dùng ngay thứ Hai 13/07/2026 |
| — | [Bảng tra cứu mã tiêu chí](docs/bang-tra-cuu-ma-diem.md) | In kèm phiếu, để ban cán sự tra đúng mã khi ghi nhận |
| — | [Dữ liệu mẫu (36 học sinh thật)](du-lieu-mau/README.md) | Trích từ file điểm danh thật, sẵn sàng nạp cho commit C004 |
| — | [Dữ liệu giả để xem giao diện](du-lieu-mau/du-lieu-gia/README.md) | 21 bản ghi phủ đủ tình huống app hỗ trợ — import để xem app "sống", xoá được chủ động (C036) |

## Cách dùng bộ tài liệu này với AI coding agent

1. Đưa **toàn bộ thư mục `docs/`** vào context của Claude Code / Cursor / Codex.
2. Nói với AI: *"Đọc file 05-quy-tac-ai-agent.md trước, sau đó thực hiện commit C00X theo 04-lo-trinh-giai-doan-1.md"*.
3. AI chỉ được làm đúng phạm vi của commit đó, cập nhật `PROGRESS.md`, rồi dừng lại chờ xác nhận.

**Từ sau khi Giai đoạn 1 đã chạy xong** (như hiện tại): các thay đổi/sửa lỗi mới phát sinh khi anh dùng thử app và trao đổi ở Claude web chat sẽ được gom vào **[tài liệu 06](docs/06-cai-tien-sau-trien-khai.md)** thay vì sửa lại tài liệu 04. Quy trình: bàn ở đây → em thêm commit mới vào cuối tài liệu 06 → anh copy **toàn bộ file 06** dán vào IDE, nói với AI agent: *"Đọc 05-quy-tac-ai-agent.md, sau đó thực hiện các commit trong 06-cai-tien-sau-trien-khai.md đang ở trạng thái Chưa làm trong PROGRESS.md"*.

**Lưu ý về "trí nhớ" của AI trong IDE**: AI trong Claude Code/Cursor chỉ nhớ trong đúng 1 phiên đang mở — đóng/mở lại là mất hết ngữ cảnh, kể cả với chính code nó từng viết. Nếu không chắc phiên cũ còn "nhớ" hay không, luôn mở đầu yêu cầu bằng: *"Đọc code hiện tại trong repo trước để biết đã làm gì, sau đó đọc 06 để biết việc cần làm tiếp, tham khảo 01/02/03/05 khi cần chi tiết kỹ thuật."* — an toàn cho cả 2 trường hợp.

## Việc cần làm ngay (mở, chưa có trong tài liệu)

- [x] ~~File Excel danh sách học sinh~~ — đã nhận `Diem_danh_11C5_11-07-2026...xlsx`. Cột `DIỆN` xác định là **2B/BT/NT** (loại hình học: 2 buổi / bán trú / nội trú), không phải diện chính sách. Dữ liệu 36 học sinh đã trích xuất sẵn ở [`du-lieu-mau/`](du-lieu-mau/README.md), sẵn sàng nạp.
- [x] ~~Tên lớp / sĩ số / năm học~~ — đã xác nhận: **Lớp 11C5, Trường THCS & THPT Lạc Hồng, năm học 2025-2026, sĩ số 36** (20 nữ, 16 nam). Đã cập nhật tên Sheet thành `QLHS_11C5_2025-2026` xuyên suốt tài liệu.
- [ ] Xác nhận trường có hệ thống email Google Workspace cho học sinh hay không (ảnh hưởng đến phương án bảo mật ở tài liệu 01).
- [x] ~~Quy chế điểm thi đua~~ — đã nhận file "NỘI DUNG ĐÁNH GIÁ, XẾP LOẠI THI ĐUA (HÀNG TUẦN)" của trường, đã cập nhật vào tài liệu 03.
- [ ] Xác nhận cách hiểu công thức Điểm học tập: "tổng số tiết trong tuần" tính theo thời khoá biểu cả tuần hay chỉ tiết có ghi điểm số? (chi tiết ở tài liệu 03 mục 3).
- [ ] Xác nhận mốc điểm xếp loại Tốt/Khá/Trung bình/Yếu với nhà trường — văn bản gốc chưa nêu, tài liệu 03 mục 5 đang dùng ngưỡng tạm đề xuất.
- [ ] Lớp có học sinh thuộc đội cờ đỏ không? Nếu có, cần đánh dấu cờ `la_co_do = true` cho đúng học sinh để áp dụng đúng quy tắc nhân đôi điểm trừ (tài liệu 03 mục 2). File dữ liệu mẫu hiện để mặc định `false` cho cả 36 em.
- [ ] Có muốn bật "Điểm cộng khích lệ nội bộ lớp" (không thuộc quy chế chính thức của trường) ngay Giai đoạn 1 không, hay để Giai đoạn 2? (tài liệu 03 mục 6).
- [x] ~~Quy tắc xử lý sự kiện tập thể/tổ trực~~ — đã chốt: giáo viên tự xử lý qua thao tác nhanh trên app (gán 1 học sinh / áp dụng cho tất cả / bỏ qua), không tự động trừ điểm ai. Xem tài liệu 03 mục 2b, tài liệu 04 commit C021a.
- [ ] 2 học sinh thiếu ngày sinh/SĐT trong dữ liệu gốc: **Trần Huy Phúc (HS035)**, **Đỗ Tâm Nhi (HS036)** — cần anh bổ sung trước khi nạp chính thức.
- [ ] File anh gửi còn có hệ thống điểm danh (Chính khóa/Ăn trưa/Ngủ trưa/Liên lạc PH) khá hoàn chỉnh, liên quan trực tiếp tới nhóm điểm **Chuyên cần (CC)** ở tài liệu 03. Anh có muốn tích hợp chính thức hệ thống điểm danh này vào app ở giai đoạn sau không, hay giữ 2 công cụ tách biệt?

## Deadline mốc gần nhất

**Thứ Hai, 13/07/2026** — bắt buộc có: Google Sheet đã tạo tab chuẩn hoá + mẫu phiếu giấy in được để ban cán sự lớp ghi nhận ngay trong ngày (xem Nhóm A trong tài liệu 04).
