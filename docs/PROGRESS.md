# Theo dõi tiến độ — Giai đoạn 1

Cập nhật file này sau **mỗi commit hoàn thành** (xem quy trình ở [05-quy-tac-ai-agent.md](05-quy-tac-ai-agent.md)). Danh sách commit đã cập nhật ngày 11/07/2026 theo tài liệu 04 (bản 28 commit, gồm cả C021a).

## Nhóm A — Chuẩn bị dữ liệu (deadline: Thứ Hai 13/07/2026)

| ID | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| C001 | ✅ Xong | 11/07/2026 |  |
| C002 | ✅ Xong | 11/07/2026 |  |
| C003 | ✅ Xong | 11/07/2026 | Script SetupSheet.gs + seed DanhMucDiem |
| C004 | ✅ Xong | 11/07/2026 | 36 HS + 2 tuần trong du-lieu-mau/ |
| C005 | ✅ Xong | 11/07/2026 | Phiếu 3 phần + bảng tra cứu mã |
| C006 | ✅ Xong | 11/07/2026 | huong-dan-quy-trinh-import.md |

## Nhóm B — Khung sườn ứng dụng web

| ID | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| C007 | ✅ Xong | 11/07/2026 | Vite + React + TS strict |
| C008 | ✅ Xong | 11/07/2026 | Tailwind v4 + ResponsiveDemo |
| C009 | ✅ Xong | 11/07/2026 | GitHub Actions deploy-pages |
| C010 | ✅ Xong | 11/07/2026 | HashRouter + Layout |
| C011 | ✅ Xong | 11/07/2026 | DataSource + types |
| C012 | ✅ Xong | 11/07/2026 | Code.gs doGet/doPost |
| C013 | ✅ Xong | 11/07/2026 | Import batch + Drive + log |

## Nhóm C — Tính năng cốt lõi

| ID | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| C014 | ✅ Xong | 11/07/2026 | GoogleSheetsDataSource đọc dữ liệu + trang học sinh kiểm chứng getStudents |
| C015 | ✅ Xong | 11/07/2026 | Trang học sinh có tìm kiếm + thêm/sửa/xoá qua GoogleSheetsDataSource |
| C016 | ✅ Xong | 11/07/2026 | Màn hình Import JSON chung: chọn loại, dán/tải file, preview, xác nhận import |
| C017 | ✅ Xong | 11/07/2026 | Hồ sơ theo token + vai trò BanCanSu, không hiển thị SĐT phụ huynh |
| C018 | ✅ Xong | 11/07/2026 | Hồ sơ hiển thị lịch sử GhiNhan theo học sinh, sắp xếp mới nhất và gom theo tuần |
| C019 | ✅ Xong | 11/07/2026 | Logic tính điểm thi đua: 4 thành phần, học tập, tổng hợp chia 6, bỏ qua tập thể/tổ trực — ~~⚠️ có lỗi 66,67~~ đã sửa ở C031 |
| C020 | ✅ Xong | 11/07/2026 | Hồ sơ hiển thị điểm thi đua, điểm học tập, tổng hợp và xếp loại |
| C021 | ✅ Xong | 11/07/2026 | Dashboard giáo viên: điểm thi đua, cảnh báo, sự kiện tập thể/tổ trực |
| C021a | ✅ Xong | 11/07/2026 | Dashboard xử lý sự kiện tập thể: gán 1 HS, áp dụng lớp/tổ, bỏ qua |
| C022 | ✅ Xong | 11/07/2026 | Gợi ý xử lý sư phạm rule-based trên dashboard |
| C023 | ✅ Xong | 11/07/2026 | Tối ưu hồ sơ di động với khối ghi nhận hôm nay nổi bật |
| C024 | ✅ Xong | 11/07/2026 | Nút tải mẫu phiếu ghi nhận HTML in được từ web app |

## Nhóm D — Hoàn thiện & bảo mật

| ID | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| C025 | ✅ Xong | 11/07/2026 | Ẩn SĐT khỏi giao diện và response hồ sơ public theo token |
| C026 | ✅ Xong | 11/07/2026 | Rà responsive: header/nav tối ưu mobile và laptop |
| C027 | ✅ Xong | 11/07/2026 | README hướng dẫn sử dụng + tag v0.1.0-phase1 |

---

## Cải tiến sau triển khai (xem chi tiết ở [06-cai-tien-sau-trien-khai.md](06-cai-tien-sau-trien-khai.md))

| ID | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| C028 | ✅ Xong | 11/07/2026 | doPost yêu cầu write_secret khớp Script Property QLHS_WRITE_SECRET |
| C029 | ✅ Xong | 11/07/2026 | README/hướng dẫn deploy ghi rõ Execute as Me, Anyone, Manage deployments và write secret |
| C030 | ✅ Xong | 11/07/2026 | Danh sách học sinh mở rộng accordion, xem/copy link hồ sơ |
| C031 | ✅ Xong | 11/07/2026 | Chưa có điểm học tập thì chia 4 thành phần, không còn mặc định 66,67 |
| C032 | ✅ Xong | 11/07/2026 | Thêm trường to cho HocSinh, hiển thị tổ trên danh sách/hồ sơ và xử lý tổ trực |
| C033 | ✅ Xong | 11/07/2026 | Dashboard có nhật ký theo ngày trong tuần, kể cả ngày chưa có ghi nhận |
| C034 | ✅ Xong | 11/07/2026 | Import GhiNhan tự khớp ho_ten sang ma_hs, tự điền tuần/diện/điểm và log lỗi từng dòng |
| C035 | ✅ Xong | 11/07/2026 | Thêm mẫu JSON và prompt chuyển ảnh phiếu sang JSON vào du-lieu-mau |
| C036 | ✅ Xong | 11/07/2026 | Xoá dữ liệu theo lần import: nút xoá trên lịch sử import, Apps Script xoá GhiNhan theo ma_log_import và đánh dấu log da_xoa |
| C037 | ✅ Xong | 11/07/2026 | Bộ chọn tuần dùng chung cho Dashboard và hồ sơ học sinh, mặc định chọn theo CauHinhTuan |
| C038 | ✅ Xong | 11/07/2026 | Hồ sơ mặc định hiển thị toàn bộ lịch sử, có bộ lọc tuần đang chọn và ngày cụ thể |
| C039 | ✅ Xong | 11/07/2026 | Apps Script tự tính tuan_so khi import, cảnh báo nếu ngoài CauHinhTuan và thêm vaLaiTuanSoChoGhiNhan() để vá dữ liệu cũ |
| C040 | ✅ Xong | 11/07/2026 | Thêm bộ chọn ngày cụ thể cho Nhật ký theo ngày và lịch sử ghi nhận hồ sơ |
| C041 | ✅ Xong | 11/07/2026 | Xác minh danh sách học sinh; thêm nút Chi tiết/Thu gọn rõ ràng cho từng dòng |
| C042 | ✅ Xong | 11/07/2026 | Xác minh màn Import bằng Chrome headless: có Lịch sử import và nút Xoá dữ liệu của lần này |
| C043 | ✅ Xong | 11/07/2026 | Dashboard có vùng thống kê tổng quan theo tài liệu 07, chia nhóm hành động ngay và quan sát chung |
| C044 | ✅ Xong | 11/07/2026 | Thêm nút thu gọn/mở rộng cả khối danh sách trên Dashboard và trang Học sinh |
| C045 | ✅ Xong | 11/07/2026 | Drill-down cho các thẻ TK02-TK05 ngay trên Dashboard, mở đúng danh sách chi tiết cấu thành |
| C046 | ✅ Xong | 11/07/2026 | Bấm sự kiện tổ trực mở Thông tin Tổ: tổ trưởng, danh sách học sinh và lịch sử nhắc tổ gần đây |
| C047 | ✅ Xong | 11/07/2026 | Thêm helper màu chung và áp dụng cho Dashboard, hồ sơ, lịch sử ghi nhận, nhật ký ngày, danh sách học sinh |
| C048 | ✅ Xong | 11/07/2026 | Sửa ngưỡng xếp loại theo trạng thái có/chưa có điểm học tập, thêm ghi chú so sánh điểm và dữ liệu đối chiếu cá nhân |
| C049 | ✅ Xong | 12/07/2026 | Thêm khu vực Xem theo Nhóm vi phạm trên Dashboard, có chọn nhóm, hiện đủ/ẩn học sinh sạch và TK06 nhảy tới nhóm Kỷ luật |
| C050 | ✅ Xong | 12/07/2026 | Mở rộng điều hướng TK01/TK06/TK07/TK08 và thêm popup tra cứu mã cho badge ở Dashboard/Hồ sơ |
| C051 | ✅ Xong | 12/07/2026 | Thêm loai_tuan và script taoCauHinhTuanNamHoc() sinh cấu hình tuần cả năm, đánh dấu tuần nghỉ |
| C052 | ✅ Xong | 12/07/2026 | Bộ chọn tuần có nút trước/sau, chọn nhanh nhóm theo tháng/học kỳ và bỏ qua tuần nghỉ |
| C053 | ✅ Xong | 12/07/2026 | Drill-down TK hiển thị bằng modal overlay, đóng bằng X/nền tối/Esc |
| C054 | ✅ Xong | 12/07/2026 | Bấm lại nhóm đang chọn sẽ bỏ lọc và quay về danh sách tổng mặc định |
| C055 | ✅ Xong | 12/07/2026 | Thêm STT cho bảng điểm Dashboard, Xem theo Nhóm và các danh sách học sinh trong modal TK |
| C056 | ✅ Xong | 12/07/2026 | Thêm route giáo viên /quan-ly/hoc-sinh/:maHs có SĐT, tel:, edit trực tiếp; link danh sách trỏ đúng route mới |
| C057 | ✅ Xong | 12/07/2026 | Mẫu phiếu in trong app và docs/mau-phieu-ghi-nhan.md chuyển sang 1 bảng duy nhất, không mã |
| C058 | ✅ Xong | 12/07/2026 | Prompt AI suy luận mã/phạm vi từ phiếu tự do, map thành tích sang KT và bổ sung KT01-KT05 vào seed DanhMucDiem |

---

**Chú thích trạng thái**: `☐ Chưa làm` / `🔄 Đang làm` / `✅ Xong` / `⛔ Bị chặn (cần xác nhận)`
