# Phần mềm Quản lý Học sinh Lớp Chủ nhiệm (QLHS-11C5)

> Lấy học sinh làm trung tâm. Bắt đầu đơn giản — mở rộng không phá vỡ cấu trúc.

**Lớp 11C5** · Trường THCS & THPT Lạc Hồng · Năm học 2025–2026 · Sĩ số 36

## Cấu trúc dự án

```
├── src/              # Web app (Vite + React + TypeScript)
│   ├── data/         # DataSource interface & adapters
│   ├── features/     # students, records, scoring, dashboard
│   └── components/   # UI dùng chung
├── apps-script/      # Google Apps Script API trung gian
├── docs/             # Tài liệu kiến trúc & nghiệp vụ
└── du-lieu-mau/      # Dữ liệu seed (36 học sinh thật)
```

## Bộ tài liệu

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 00 | [Bối cảnh & Tầm nhìn](docs/00-boi-canh-va-tam-nhin.md) | Mục tiêu, nguyên tắc, phạm vi giai đoạn 1 |
| 01 | [Kiến trúc & Công nghệ](docs/01-kien-truc-cong-nghe.md) | Stack, sơ đồ hệ thống, bảo mật |
| 02 | [Mô hình dữ liệu](docs/02-mo-hinh-du-lieu.md) | Schema Google Sheets (7 tab) |
| 03 | [Hệ thống điểm thi đua](docs/03-he-thong-diem-ren-luyen.md) | Quy chế trường, công thức tính điểm |
| 04 | [Lộ trình & Commit](docs/04-lo-trinh-giai-doan-1.md) | Roadmap C001–C027 |
| 05 | [Quy tắc AI Agent](docs/05-quy-tac-ai-agent.md) | Luật làm việc cho Cursor/Claude Code |
| — | [PROGRESS](docs/PROGRESS.md) | Theo dõi tiến độ từng commit |

## Tiến độ

Xem [docs/PROGRESS.md](docs/PROGRESS.md).

## Deadline gần nhất

**Thứ Hai 13/07/2026** — Google Sheet chuẩn hóa + phiếu giấy in được (Nhóm A, commit C003–C005).
