# Phần mềm Quản lý Học sinh Lớp Chủ nhiệm 11C5

Trường THCS & THPT Lạc Hồng · Năm học 2025-2026 · Sĩ số 36

## Chạy web app

```bash
npm install
npm run dev
```

Tạo `.env` từ `.env.example` và điền URL Apps Script:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_APPS_SCRIPT_WRITE_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
```

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

## Tài liệu

- [Bối cảnh & tầm nhìn](docs/00-boi-canh-va-tam-nhin.md)
- [Kiến trúc & công nghệ](docs/01-kien-truc-cong-nghe.md)
- [Mô hình dữ liệu](docs/02-mo-hinh-du-lieu.md)
- [Hệ thống điểm thi đua](docs/03-he-thong-diem-ren-luyen.md)
- [Lộ trình giai đoạn 1](docs/04-lo-trinh-giai-doan-1.md)
- [Tiến độ](docs/PROGRESS.md)
- [Hướng dẫn import](docs/huong-dan-quy-trinh-import.md)

## Bảo mật

- Không commit `.env` hoặc secret.
- `doPost` yêu cầu `write_secret`; đặt Script Property `QLHS_WRITE_SECRET` trong Apps Script và dùng cùng giá trị cho `VITE_APPS_SCRIPT_WRITE_SECRET`.
- Hồ sơ học sinh public theo token không hiển thị SĐT phụ huynh.
- Apps Script cần deploy đúng quyền theo hướng dẫn trong `docs/huong-dan-deploy-apps-script.md`.
