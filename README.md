# Phần mềm Quản lý Học sinh Lớp Chủ nhiệm 11C5

Trường THCS & THPT Lạc Hồng · Năm học 2025-2026 · Sĩ số 36

## Chạy web app

```bash
npm install
npm run dev
```

Tạo `.env` từ `.env.example` và điền URL Apps Script + Supabase:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_SUPABASE_URL=https://zupkcgfjkckrbemptaiv.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Tài khoản giáo viên tạo trong Supabase Dashboard → Authentication → Users. Không đưa `service_role` key vào frontend.

Build kiểm tra trước khi deploy:

```bash
npm run build
```

## Luồng sử dụng chính

1. Tạo Google Sheet bằng `apps-script/SetupSheet.gs`.
2. Nạp dữ liệu ban đầu bằng `apps-script/SeedData.gs`.
3. Deploy `apps-script/Code.gs` thành Web App: **Execute as = Me**, **Who has access = Anyone**.
4. Mở web app React để quản lý học sinh, import JSON, xem dashboard và hồ sơ học sinh.

Khi cập nhật Apps Script, dùng **Deploy → Manage deployments → Edit → New version** để giữ nguyên URL web app. Không tạo deployment mới trừ khi muốn đổi URL.

## Tính năng giai đoạn 1

- Danh sách học sinh: tìm kiếm, thêm, sửa, xoá.
- Import JSON: dán hoặc tải file JSON, xem trước, ghi vào Sheet, lưu Drive và log import.
- Hồ sơ học sinh theo token: vai trò cán sự, ghi nhận hôm nay, lịch sử ghi nhận, điểm thi đua.
- Dashboard giáo viên: điểm thi đua, cảnh báo, gợi ý xử lý, sự kiện lớp/tổ.
- Xử lý sự kiện tập thể: gán cho 1 học sinh, áp dụng cả lớp/tổ, hoặc bỏ qua.
- Tải mẫu phiếu ghi nhận HTML in được từ giao diện.
- Mẫu import: [JSON ghi nhận](du-lieu-mau/mau-import-ghinhan.json) và [prompt chuyển ảnh phiếu sang JSON](du-lieu-mau/mau-prompt-chuyen-doi-json.md).

## Tài liệu

- [Bối cảnh & tầm nhìn](docs/00-boi-canh-va-tam-nhin.md)
- [Kiến trúc & công nghệ](docs/01-kien-truc-cong-nghe.md)
- [Mô hình dữ liệu](docs/02-mo-hinh-du-lieu.md)
- [Hệ thống điểm thi đua](docs/03-he-thong-diem-ren-luyen.md)
- [Lộ trình giai đoạn 1](docs/04-lo-trinh-giai-doan-1.md)
- [Quy tắc AI Agent](docs/05-quy-tac-ai-agent.md)
- [Cải tiến sau triển khai](docs/06-cai-tien-sau-trien-khai.md)
- [Danh mục thống kê tổng quan](docs/07-danh-muc-thong-ke-tong-quan.md)
- [Tiến độ](docs/PROGRESS.md)
- [Hướng dẫn import](docs/huong-dan-quy-trinh-import.md)

## Dùng Với AI Coding Agent

1. Đưa toàn bộ thư mục `docs/` vào context của Claude Code, Cursor hoặc Codex.
2. Nói với AI: "Đọc file `docs/05-quy-tac-ai-agent.md` trước, sau đó thực hiện commit C00X theo `docs/04-lo-trinh-giai-doan-1.md`".
3. AI chỉ làm đúng phạm vi commit đó, cập nhật `docs/PROGRESS.md`, rồi dừng lại chờ xác nhận.

Từ sau khi giai đoạn 1 đã chạy xong, các thay đổi mới phát sinh được gom vào [docs/06-cai-tien-sau-trien-khai.md](docs/06-cai-tien-sau-trien-khai.md), không sửa lại roadmap gốc. Quy trình: đọc code hiện tại, đọc `docs/05-quy-tac-ai-agent.md`, sau đó thực hiện các commit trong tài liệu 06 đang ở trạng thái chưa làm trong `docs/PROGRESS.md`.

Lưu ý: AI trong IDE chỉ nhớ trong phiên đang mở. Nếu mở phiên mới, hãy yêu cầu AI đọc code hiện tại trước, rồi đọc tài liệu 06 và tham khảo 01/02/03/05 khi cần chi tiết kỹ thuật.

## Bảo mật

- Không commit `.env` hoặc secret.
- Vùng giáo viên đăng nhập bằng Supabase Auth; frontend chỉ dùng `anon` key, không dùng `service_role` key.
- Apps Script trong giai đoạn chuyển đổi xác minh `supabase_access_token` bằng Script Properties `SUPABASE_URL` và `SUPABASE_ANON_KEY`.
- Hồ sơ học sinh public theo token không hiển thị SĐT phụ huynh.
- Apps Script cần deploy đúng quyền theo hướng dẫn trong `docs/huong-dan-deploy-apps-script.md`.
