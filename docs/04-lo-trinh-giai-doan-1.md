# 04 — Lộ trình Giai đoạn 1 & Commit Roadmap

> **Cập nhật**: danh sách commit dưới đây đã được **viết lại từ đầu** (không dùng hậu tố chắp vá) để phản ánh đầy đủ các yêu cầu bổ sung: CRUD học sinh, tính năng Import JSON, lưu trữ + nhật ký import, hệ thống điểm theo đúng quy chế trường thật, hiển thị vai trò cán sự lớp, và nút tải mẫu phiếu từ app. Vì `PROGRESS.md` trước đó chưa có commit nào đánh dấu "Xong", việc đánh số lại toàn bộ là an toàn. **Từ thời điểm commit đầu tiên được thực hiện trở đi, mọi thay đổi phạm vi tiếp theo phải dùng hậu tố (`C0xxa`) theo đúng quy tắc ở tài liệu 05, không đánh số lại nữa.**

Tổng cộng **27 commit nguyên tử** (C001–C027), chia thành 4 nhóm.

Định dạng commit message bắt buộc: `[Cxxx] <loại>: <mô tả tiếng Việt ngắn gọn>`
Loại: `feat` (tính năng mới) / `chore` (hạ tầng, cấu hình) / `docs` (tài liệu) / `fix` (sửa lỗi).

---

## Nhóm A — Chuẩn bị dữ liệu (BẮT BUỘC xong trước Thứ Hai 13/07/2026)

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C001 | `[C001] chore: khởi tạo repo và cấu trúc thư mục dự án` | Tạo repo git, cấu trúc `src/`, `docs/`, `apps-script/` như tài liệu 01 mục 4. | Repo có thể clone, cấu trúc thư mục đúng, README hiển thị được. |
| C002 | `[C002] docs: thêm bộ tài liệu kiến trúc và nghiệp vụ` | Copy toàn bộ file trong `docs/` (bản mới nhất, đã cập nhật theo quy chế trường) vào repo. | Tất cả file tài liệu có trong repo, link nội bộ không lỗi. |
| C003 | `[C003] feat(data): tạo Google Sheet chuẩn hoá theo tài liệu 02` | Tạo file Sheet `QLHS_11C5_2025-2026`, tạo đủ 7 tab: HocSinh, PhuHuynh, BanCanSu, DanhMucDiem, CauHinhTuan, GhiNhan, NhatKyImport. Nạp sẵn `DanhMucDiem` theo đúng quy chế trường, **kèm cột `pham_vi`** (ca_nhan/tap_the/to_truc) cho từng mục theo bảng phân loại tài liệu 03 mục 2b. | Mở Sheet thấy đủ 7 tab, đúng tên cột như tài liệu 02, `DanhMucDiem` có đủ 31 mục CC/VS/NN/KL theo văn bản trường, mỗi dòng có `pham_vi` đúng. |
| C004 | `[C004] feat(data): nạp danh sách học sinh ban đầu vào tab HocSinh` | Dùng ngay `du-lieu-mau/hocsinh_seed.json` (đã trích xuất sẵn từ file điểm danh thật, 36 học sinh, đúng cấu trúc tab `HocSinh`) — import hoặc dán vào Sheet. Đồng thời nạp `CauHinhTuan`: Tuần 1 (06/07–10/07/2026), Tuần 2 (13/07–17/07/2026), đúng dữ liệu thật đã có. | Toàn bộ 36 học sinh có trong tab HocSinh, không thiếu/trùng `ma_hs`; tab `CauHinhTuan` có đủ 2 tuần đầu. |
| C005 | `[C005] feat(form): thiết kế mẫu phiếu ghi nhận giấy in được (3 phần) + bảng tra cứu mã` | `docs/mau-phieu-ghi-nhan.md` (3 phần: theo tiết / nề nếp đầu buổi / sự kiện tập thể) và `docs/bang-tra-cuu-ma-diem.md`, xuất bản in (PDF/Word nếu cần). | Ban cán sự lớp cầm 2 tờ (phiếu + bảng tra cứu) điền được ngay, đủ trường khớp tab `GhiNhan`, phân biệt rõ việc cá nhân và tập thể. |
| C006 | `[C006] docs: hướng dẫn quy trình thu phiếu, chuyển JSON qua AI, và import` | Hướng dẫn ngắn cho giáo viên: chụp ảnh phiếu, prompt gửi Claude để xuất JSON, quy trình dùng màn hình Import (không dán tay vào Sheet). | Anh có thể tự thực hiện quy trình mà không cần hỏi lại. |

> ⏰ **Mốc Thứ Hai 13/07/2026**: hoàn thành đến hết C005 là đủ để ban cán sự bắt đầu ghi nhận bằng giấy. C006 nên xong trước cuối ngày thứ Hai để anh xử lý dữ liệu thu về buổi tối (màn hình Import thật sự chỉ có sau khi xong Nhóm B/C — trong lúc chờ, có thể tạm nhập tay vào Sheet cho tuần đầu nếu Import chưa kịp xong).

---

## Nhóm B — Khung sườn ứng dụng web

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C007 | `[C007] chore: khởi tạo dự án Vite + React + TypeScript` | `npm create vite`, cấu hình TypeScript strict. | `npm run dev` chạy được trang trắng không lỗi. |
| C008 | `[C008] chore: cấu hình TailwindCSS, ưu tiên breakpoint di động và laptop` | Cài đặt Tailwind; khai báo breakpoint, tập trung kiểm thử ở khổ di động (~375–430px) và laptop (~1280–1440px) trước, tablet/desktop lớn sau. | Một component test đổi layout đúng, đặc biệt mượt ở di động và laptop. |
| C009 | `[C009] chore: cấu hình GitHub Actions build và deploy GitHub Pages` | Workflow build → deploy nhánh `gh-pages` khi push `main`. | Truy cập được URL GitHub Pages, thấy trang trắng đã deploy. |
| C010 | `[C010] feat(routing): thiết lập HashRouter và layout chính` | Header, Nav, Footer, khung layout responsive. | Điều hướng qua lại giữa các route giả không lỗi, đúng trên di động và laptop. |
| C011 | `[C011] feat(data-adapter): xây dựng interface DataSource và types` | `data/DataSource.ts`, `data/types.ts` theo tài liệu 02: bao gồm CRUD học sinh (`getStudents`, `addStudent`, `updateStudent`, `deleteStudent`), đọc ghi nhận (`getRecords`), đọc danh mục điểm (`getPointCatalog`), và **import** (`importJson(loai, jsonData)`). | Interface định nghĩa đủ method liệt kê trên, có kiểu dữ liệu rõ ràng cho từng entity kể cả `NhatKyImport`. |
| C012 | `[C012] feat(backend): viết Google Apps Script Web App cơ bản` | `apps-script/Code.gs`: `doGet` trả JSON đọc từ các tab Sheet; `doPost` ghi 1 dòng đơn lẻ. | Gọi URL Apps Script trả về JSON đúng cấu trúc; test thêm 1 dòng qua `doPost` thành công. |
| C013 | `[C013] feat(backend): mở rộng Apps Script xử lý import hàng loạt + lưu Drive + ghi log` | `doPost` nhận mảng JSON nhiều dòng cho 1 loại dữ liệu (`hoc_sinh`/`ghi_nhan`/...), ghi hàng loạt vào Sheet tương ứng; đồng thời lưu file JSON gốc vào thư mục Google Drive theo cấu trúc tài liệu 02 Tab 6, và ghi 1 dòng vào `NhatKyImport`. | Import thử 5 dòng `GhiNhan` bằng JSON mẫu → cả 5 dòng xuất hiện đúng trong Sheet, file JSON gốc xuất hiện trong Drive đúng thư mục, có 1 dòng log mới trong `NhatKyImport`. |

---

## Nhóm C — Tính năng cốt lõi Giai đoạn 1

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C014 | `[C014] feat(data): triển khai GoogleSheetsDataSource (đọc)` | Implement các method đọc của interface `DataSource`, gọi tới Apps Script API ở C012. | `getStudents()` từ frontend trả về đúng danh sách học sinh thật từ Sheet. |
| C015 | `[C015] feat(students): trang danh sách học sinh + CRUD cho giáo viên` | Bảng/list danh sách học sinh, tìm kiếm nhanh theo tên, thêm/sửa/xoá trực tiếp (gọi `addStudent`/`updateStudent`/`deleteStudent`). | Giáo viên thêm/sửa/xoá 1 học sinh thử → Sheet cập nhật đúng, responsive tốt trên di động và laptop. |
| C016 | `[C016] feat(import): màn hình Import JSON chung` | Chọn loại dữ liệu (học sinh / ghi nhận / phụ huynh / ban cán sự), dán hoặc tải file JSON, xem trước dữ liệu, xác nhận gửi qua `importJson()`. | Import thử 1 file JSON `GhiNhan` mẫu (do Claude tạo từ ảnh phiếu) → dữ liệu xuất hiện đúng trên web app sau khi tải lại. |
| C017 | `[C017] feat(student-profile): trang hồ sơ chi tiết học sinh theo link riêng` | Route `/#/hs/:token`, hiển thị thông tin cá nhân, **vai trò cán sự lớp** (lấy `chuc_vu` từ `BanCanSu`, mặc định "Học sinh" nếu không có) — ẩn SĐT phụ huynh theo tài liệu 01 mục 6. | Mở đúng link riêng của 1 học sinh, thấy đúng vai trò (ví dụ "Lớp trưởng" hoặc "Học sinh"), không thấy được nếu không có token. |
| C018 | `[C018] feat(records): hiển thị lịch sử ghi nhận theo học sinh` | Danh sách các bản ghi từ tab `GhiNhan`, lọc theo `ma_hs`, sắp xếp theo ngày mới nhất, gom theo tuần (`tuan`). | Hồ sơ học sinh hiển thị đúng lịch sử ghi nhận thật từ Sheet, đúng theo tuần. |
| C019 | `[C019] feat(scoring): logic tính điểm thi đua theo quy chế trường thật` | Áp dụng công thức tài liệu 03 mục 7: 4 thành phần (CC/VS/NN/KL) + Điểm học tập + Điểm xếp loại thi đua tổng hợp (chia 6). Áp dụng hệ số nhân đôi cho `la_co_do = true`. **Chỉ cộng dồn các dòng `pham_vi = ca_nhan`** — bỏ qua `tap_the`/`to_truc` khỏi điểm cá nhân theo mặc định tài liệu 03 mục 2b. | Với dữ liệu thử trong Sheet, cả 5 con số + điểm tổng hợp tính đúng theo công thức tài liệu 03; 1 dòng `tap_the` thử không làm thay đổi điểm học sinh nào. |
| C020 | `[C020] feat(student-profile): hiển thị điểm thi đua và xếp loại` | Hiển thị 4 thành phần + điểm học tập + điểm xếp loại thi đua + nhãn xếp loại (Tốt/Khá/TB/Yếu, tài liệu 03 mục 5). | Đổi dữ liệu trong Sheet → toàn bộ số liệu và xếp loại trên trang cập nhật đúng. |
| C021 | `[C021] feat(dashboard): trang tổng quan giáo viên` | Danh sách học sinh sắp xếp theo điểm xếp loại thi đua, đánh dấu học sinh cần chú ý (`can_canh_bao_ngay = true` hoặc thành phần nào < 50). Thêm khu vực riêng "Sự kiện của lớp/tổ" hiển thị các dòng `pham_vi = tap_the/to_truc`. | Giáo viên mở 1 trang thấy toàn bộ tình hình lớp lẫn các sự kiện tập thể, không cần bấm vào từng học sinh. |
| C021a | `[C021a] feat(dashboard): thao tác nhanh xử lý sự kiện tập thể` | Mỗi "Sự kiện của lớp/tổ" đang `chua_xu_ly` có 3 nút: **(1) Gán cho 1 học sinh** — chọn tên, xác nhận → tạo 1 dòng `GhiNhan` cá nhân mới (`pham_vi=ca_nhan`, `su_kien_goc` trỏ về sự kiện gốc); **(2) Áp dụng cho tất cả** — xác nhận (có xem trước số học sinh bị ảnh hưởng: cả lớp nếu `tap_the`, cả tổ nếu `to_truc`) → tạo N dòng cá nhân tương ứng; **(3) Bỏ qua** — đánh dấu `bo_qua`, không tạo dòng nào. Sau khi xử lý, sự kiện cập nhật `trang_thai_xu_ly_tap_the` và biến mất khỏi danh sách chờ. | Thử 1 sự kiện `tap_the` mẫu: bấm "Gán cho 1 học sinh" → đúng 1 dòng cá nhân mới, điểm học sinh đó cập nhật đúng. Thử 1 sự kiện khác, bấm "Áp dụng cho tất cả" → đúng N dòng xuất hiện (N = sĩ số lớp hoặc số học sinh trong tổ), điểm tất cả học sinh liên quan cập nhật đúng, không dòng nào bị trùng. |
| C022 | `[C022] feat(dashboard): gợi ý xử lý sư phạm rule-based` | Áp dụng bảng quy tắc ở tài liệu 03 mục 8. | Với dữ liệu thử đúng điều kiện, gợi ý đúng hiển thị cạnh tên học sinh. |
| C023 | `[C023] feat(mobile): tối ưu giao diện học sinh cho di động, kiểm thử thêm trên laptop` | Trang hồ sơ hiển thị "hôm nay bị ghi nhận gì" nổi bật, cảnh báo điểm kịp thời; kiểm thử kỹ trên di động và laptop theo đúng ưu tiên giai đoạn này. | Kiểm tra trên điện thoại thật và trình duyệt laptop, thao tác một tay dễ dàng trên di động. |
| C024 | `[C024] feat(form): nút tải mẫu phiếu ghi nhận trực tiếp từ web app` | Nút "Tải mẫu phiếu" trên giao diện giáo viên, xuất file in được (PDF hoặc HTML in) đúng nội dung `docs/mau-phieu-ghi-nhan.md`. | Bấm nút, tải về đúng mẫu phiếu, in ra dùng được ngay — không cần mở lại file markdown thủ công. |

---

## Nhóm D — Hoàn thiện & bảo mật

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C025 | `[C025] feat(security): áp dụng token ngẫu nhiên, ẩn trường nhạy cảm` | Rà soát toàn bộ giao diện public, đảm bảo không rò rỉ SĐT/thông tin nhạy cảm theo tài liệu 01 mục 6. | Kiểm tra thủ công: không trường nhạy cảm nào xuất hiện trong HTML render ra cho học sinh. |
| C026 | `[C026] fix: rà soát responsive — ưu tiên di động và laptop, sau đó tablet/desktop` | Test kỹ trên di động và laptop trước (đúng ưu tiên giai đoạn này), sau đó kiểm tra nhanh tablet/desktop lớn. | Không có lỗi vỡ layout, đặc biệt trên di động và laptop. |
| C027 | `[C027] docs: cập nhật README hướng dẫn sử dụng + gắn tag v0.1.0-phase1` | Hướng dẫn sử dụng ngắn gọn (bao gồm cách Import, cách tải mẫu phiếu), gắn git tag đánh dấu hoàn thành giai đoạn 1. | Repo có tag `v0.1.0-phase1`, README đủ để người khác (đồng nghiệp) tự vận hành được. |

---

## Tổng kết breakdown

| Nhóm | Số commit | Mục tiêu |
|---|---|---|
| A — Chuẩn bị dữ liệu | 6 (C001–C006) | Sẵn sàng ghi nhận thứ Hai 13/07 |
| B — Khung sườn | 7 (C007–C013) | Nền tảng kỹ thuật + backend import/lưu trữ/log |
| C — Tính năng cốt lõi | 12 (C014–C024, gồm cả C021a) | CRUD học sinh, Import JSON, hồ sơ học sinh, tổng quan giáo viên, xử lý sự kiện tập thể, điểm thi đua thật, tải phiếu từ app |
| D — Hoàn thiện | 3 (C025–C027) | Bảo mật, responsive, bàn giao |
| **Tổng** | **28 commit** (C001–C027 + C021a) | |

> Từ sau khi commit đầu tiên được thực hiện, nếu phát sinh công việc ngoài dự kiến, đặt tên hậu tố (ví dụ `C017a`) thay vì đánh số lại — giữ nguyên thứ tự đã lập kế hoạch, tránh AI agent tự đánh số lại toàn bộ (xem tài liệu 05).
