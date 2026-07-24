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
| C028 | ✅ Xong | 11/07/2026 | Cơ chế write_secret ban đầu cho doPost; đã được thay thế bởi đăng nhập giáo viên + session token ở C060 |
| C029 | ✅ Xong | 11/07/2026 | README/hướng dẫn deploy ghi rõ Execute as Me, Anyone, Manage deployments; phần bảo mật đã cập nhật lại theo C060 |
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
| C056a | ✅ Xong | 12/07/2026 | Sửa lỗi SĐT từ Sheet trả về dạng số làm trang chi tiết giáo viên crash khi bấm Xem hồ sơ đầy đủ |
| C057 | ✅ Xong | 12/07/2026 | Mẫu phiếu in trong app và docs/mau-phieu-ghi-nhan.md chuyển sang 1 bảng duy nhất, không mã |
| C058 | ✅ Xong | 12/07/2026 | Prompt AI suy luận mã/phạm vi từ phiếu tự do, map thành tích sang KT và bổ sung KT01-KT05 vào seed DanhMucDiem |
| C059 | ✅ Xong | 12/07/2026 | Cập nhật Vite base path thành /qlhs/ cho GitHub Pages repo teacherduytan/qlhs |
| C059a | ✅ Xong | 12/07/2026 | Hoàn thiện CI/CD GitHub Pages: deploy bằng Actions, tránh trùng artifact và đọc VITE_APPS_SCRIPT_URL từ GitHub Secrets |
| C060 | ✅ Xong | 13/07/2026 | Thêm đăng nhập giáo viên thật qua Apps Script, session token lưu sessionStorage, bỏ VITE write_secret khỏi bundle, ẩn lối điều hướng từ hồ sơ học sinh sang vùng giáo viên |
| C061 | ✅ Xong | 13/07/2026 | Sửa prompt tách điểm số thành dòng hoc_tap riêng; import cảnh báo/bỏ qua diem_so_mon sai loại và Điểm học tập chỉ đọc loai=hoc_tap |
| C062 | ✅ Xong | 13/07/2026 | Đưa ghi nhận của học sinh thành nội dung nổi bật đầu trang hồ sơ public; thông tin cá nhân chuyển vào tab phụ |
| C063 | ✅ Xong | 13/07/2026 | Tách khen thưởng/KT khỏi Vi phạm phổ biến và thêm ghi nhận tích cực trên Dashboard |
| C064 | ✅ Xong | 13/07/2026 | Phân màu nền/viền các section Dashboard và hồ sơ học sinh theo khối nội dung |
| C065 | ✅ Xong | 13/07/2026 | Lọc/sắp xếp bảng, tổng tích cực/tiêu cực, đếm lặp vi phạm và gợi ý xử lý |
| C066 | ✅ Xong | 13/07/2026 | Thêm điều hướng nhanh tới section và nút thu gọn/mở rộng từng section |
| C067 | ✅ Xong | 13/07/2026 | TK05 đếm/mở đầy đủ danh sách vi phạm và đổi nhãn tiêu cực thành vi phạm |
| C068 | ✅ Xong | 13/07/2026 | Đưa vi phạm học tập tự do như quên dụng cụ vào Xem theo Nhóm vi phạm |
| C069 | ✅ Xong | 13/07/2026 | Xem theo Nhóm vi phạm hiển thị nội dung vi phạm thay vì chỉ mã |
| C070 | ✅ Xong | 13/07/2026 | Phân loại Tích cực/Vi phạm ngay trong cột Nội dung vi phạm/ghi nhận |
| C071 | ✅ Xong | 13/07/2026 | Thêm trang quản lý danh mục vi phạm/tích cực và CRUD tab DanhMucDiem |
| C072 | ✅ Xong | 13/07/2026 | Gắn ghi nhận vi phạm/tích cực lên học sinh theo cá nhân, tổ hoặc cả lớp |
| C073 | ✅ Xong | 13/07/2026 | Đồng bộ logic ghi nhận tay với import JSON và chỉ gắn danh mục cá nhân lên học sinh |
| C074 | ✅ Xong | 13/07/2026 | Liên kết nội dung Xem theo nhóm vi phạm với DanhMucDiem |
| C075 | ✅ Xong | 14/07/2026 | Xoá ghi nhận/vi phạm trong hồ sơ giáo viên của học sinh |
| C076 | ✅ Xong | 14/07/2026 | Báo rõ lỗi xoá ghi nhận khi Apps Script chưa deploy action delete_record |
| C077 | ✅ Xong | 14/07/2026 | Thêm health check Apps Script và lỗi xoá ghi nhận chi tiết hơn |
| C078 | ✅ Xong | 14/07/2026 | Chuyển đăng nhập/kiểm tra phiên giáo viên sang GET để tránh Failed to fetch |
| C079 | ✅ Xong | 14/07/2026 | Cập nhật Web App URL Apps Script hiện hành và hướng dẫn đồng bộ endpoint |
| C080 | ✅ Xong | 15/07/2026 | Xoá học sinh/ghi nhận khỏi danh mục theo chiều ngược và hỗ trợ xoá nhiều dòng |
| C081 | ✅ Xong | 15/07/2026 | Đổi danh sách học sinh theo danh mục sang modal thay vì section dưới bảng |
| C082 | ✅ Xong | 15/07/2026 | Rà và ép import GhiNhan khớp DanhMucDiem động, cảnh báo mã chưa có |
| C083 | ✅ Xong | 15/07/2026 | Rà soát dữ liệu mẫu/dữ liệu giả, cập nhật prompt AI theo import danh mục động |
| C084 | ✅ Xong | 15/07/2026 | Cập nhật prompt AI: đối chiếu DanhMucDiem hiện hành và đề xuất danh mục mới từ mô tả thô |
| C085 | ✅ Xong | 15/07/2026 | Tạo nhanh danh mục từ đề xuất AI ngay trong màn hình Import |
| C086 | ✅ Xong | 15/07/2026 | Chuẩn hoá luồng tạo mới bằng modal và wizard |
| C087 | ✅ Xong | 15/07/2026 | Tự sinh mã danh mục không trùng theo nhóm |
| C088 | ✅ Xong | 15/07/2026 | Cập nhật prompt: cung cấp danh sách học sinh để AI khớp tên viết tay/viết tắt |
| C089 | ✅ Xong | 15/07/2026 | Cập nhật prompt: AI đọc ngữ cảnh phiếu viết tay không đúng cấu trúc |
| C090 | ✅ Xong | 15/07/2026 | Cập nhật prompt: bắt AI tự kiểm tra mã danh mục và mã học sinh trước khi xuất JSON |
| C091 | ✅ Xong | 15/07/2026 | Đồng bộ bản prompt cũ trong docs với bản chuẩn ở du-lieu-mau để tránh lấy nhầm |
| C092 | ✅ Xong | 15/07/2026 | Làm rõ cách import xử lý dòng JSON có ma_hs null |
| C093 | ✅ Xong | 15/07/2026 | Màn Import tự xử lý dòng ma_hs null bằng gắn/tạo học sinh với mã tự sinh; prompt không bắt AI tự quyết ma_hs |
| C094 | ✅ Xong | 15/07/2026 | Màn Import tạo danh mục thiếu từ mã JSON và cho import trước các dòng đủ điều kiện |
| C095 | ✅ Xong | 15/07/2026 | Sửa hồi quy C094 để logic xử lý ma_hs null của C093 vẫn nhận diện dòng cá nhân theo ma_hs/ho_ten |
| C096 | ✅ Xong | 15/07/2026 | Sửa nhãn hồ sơ/chi tiết học sinh để mã KT hoặc điểm dương hiển thị là Tích cực/thành tích |
| C097 | ✅ Xong | 15/07/2026 | Đồng bộ giao diện chi tiết học sinh của giáo viên với hồ sơ học sinh |
| C098 | ✅ Xong | 15/07/2026 | Làm rõ màu sắc tích cực và vi phạm trên trang quản lý học sinh |
| C099 | ✅ Xong | 15/07/2026 | Đổ màu toàn bộ dòng học sinh theo tích cực/vi phạm trong danh sách quản lý |
| C100 | ✅ Xong | 15/07/2026 | Đổ màu tích cực/vi phạm trong trang chi tiết học sinh |
| C101 | ✅ Xong | 15/07/2026 | Cập nhật prompt để không dùng mã NN08/NN09 cho lỗi không mang dụng cụ học tập |
| C102 | ✅ Xong | 15/07/2026 | Import cho so sánh đề xuất danh mục mới với danh mục cũ và chọn dùng mã có sẵn |
| C103 | ✅ Xong | 15/07/2026 | Bổ sung mô tả và đề xuất xử lý/phạt cho danh mục vi phạm/tích cực |
| C104 | ✅ Xong | 15/07/2026 | Cập nhật prompt AI để đề xuất danh mục mới có mô tả và đề xuất xử lý |
| C105 | ✅ Xong | 15/07/2026 | Tạo danh mục mã đề xuất xử lý/phạt và liên kết từ danh mục điểm/import |
| C106 | ✅ Xong | 15/07/2026 | Báo lỗi rõ khi Apps Script chưa deploy action DanhMucXuLy |
| C107 | ✅ Xong | 15/07/2026 | Chặn tạo mã xử lý/phạt trùng nội dung khi người dùng bấm lặp |
| C108 | ✅ Xong | 16/07/2026 | Sửa luồng import từng phần để tiếp tục xử lý các dòng còn lại |
| C109 | ✅ Xong | 16/07/2026 | Tự gợi ý/gắn danh mục cho dòng import thiếu ma_danh_muc |
| C110 | ✅ Xong | 16/07/2026 | Chặn spam bấm import gây tạo dư dữ liệu |
| C111 | ✅ Xong | 16/07/2026 | Cập nhật prompt để AI không đưa ghi chú đối chiếu DanhMucDiem vào nội dung |
| C112 | ✅ Xong | 16/07/2026 | Cập nhật prompt bằng ngữ cảnh DanhMucDiem và logic import hiện tại |
| C113 | ✅ Xong | 16/07/2026 | Thêm unit test cho logic so khớp DanhMucDiem khi import |
| C114 | ✅ Xong | 17/07/2026 | Rà soát nút Tải phiếu mẫu sau các thay đổi import/danh mục |
| C115 | ✅ Xong | 17/07/2026 | Chuyển phiếu ghi nhận sang dạng ghi theo nội dung, nhiều học sinh chung một dòng |
| C116 | ✅ Xong | 20/07/2026 | Xây dựng tính năng Báo cáo sĩ số từ spec |
| C117 | ✅ Xong | 20/07/2026 | Thiết kế lại bộ lọc thời gian Dashboard và tự mở rộng CauHinhTuan theo ngày thực tế |
| C118 | ✅ Xong | 22/07/2026 | Tạo migration Supabase theo schema thật đã đối chiếu từ Apps Script và docs |
| C119 | ✅ Xong | 22/07/2026 | Chuyển đăng nhập giáo viên sang Supabase Auth và gửi access token cho Apps Script |
| C120 | ✅ Xong | 23/07/2026 | Chuyển lớp đọc/ghi dữ liệu chính sang SupabaseDataSource; Apps Script chỉ còn bridge cho hồ sơ công khai và báo cáo sĩ số |
| C121 | ⛔ Bị chặn (cần xác nhận) | 23/07/2026 | Export/import dữ liệu thật sang Supabase: enum sạch, 36 học sinh và 29 ghi nhận đã nhập; còn lệch DanhMucXuLy do 3 dòng trùng unique và chưa kiểm UI đăng nhập thật |
| C122 | ✅ Xong | 23/07/2026 | Bỏ unique sai trên DanhMucXuLy.noi_dung_xu_ly và import đủ 7/7 mã xử lý; NN09 vẫn tham chiếu XL05 |
| C123 | ✅ Xong | 23/07/2026 | Chuyển hồ sơ học sinh public sang RPC Supabase SECURITY DEFINER theo token, không mở select anon trực tiếp |
| C124 | ✅ Xong | 23/07/2026 | Siết RPC hồ sơ public: bỏ to_jsonb, liệt kê rõ cột public cho records/catalog/ban_can_su/week_config |
| C125 | ✅ Xong | 23/07/2026 | Ghi nhận cách sinh token hồ sơ public hiện tại và khuyến nghị nâng độ dài token ở bước sau |
| C126 | ✅ Xong | 23/07/2026 | Cập nhật GitHub Pages workflow để truyền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào bước build |
| C127 | ✅ Xong | 23/07/2026 | Tạo schema điểm danh Supabase, seed nhóm điểm danh và chuyển báo cáo sĩ số chính khóa sang RPC tinh_bao_cao_si_so |
| C128 | ✅ Xong | 23/07/2026 | Import CSV điểm danh thật 4 tuần: 22 ngoại lệ vào diem_danh và 22 dòng liên lạc phụ huynh; RPC sĩ số 09/07/2026 buổi sáng trả đúng danh sách vắng |
| C129 | ⛔ Bị chặn (cần xác nhận) | 23/07/2026 | Chưa tự bấm UI trang Sĩ số bằng trình duyệt tự động vì .env không có tài khoản/session giáo viên Supabase; đã kiểm DB/RPC là nguồn dữ liệu frontend sẽ gọi |
| C130 | ✅ Xong | 24/07/2026 | Tạo trang Điểm danh giáo viên chính khóa: số liệu ngày/tuần/tháng, lưới tuần, sửa vắng/trễ qua RPC upsert_diem_danh và ghi liên lạc phụ huynh |
| C131 | ⛔ Bị chặn (cần xác nhận) | 24/07/2026 | Chưa tự bấm UI Điểm danh bằng trình duyệt đăng nhập thật vì .env không có tài khoản/session giáo viên Supabase; đã kiểm build, test và DB rollback |

---

**Chú thích trạng thái**: `☐ Chưa làm` / `🔄 Đang làm` / `✅ Xong` / `⛔ Bị chặn (cần xác nhận)`
