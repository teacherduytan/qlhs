# 05 — Quy tắc làm việc cho AI Agent

Áp dụng cho Claude Code, Cursor, Codex và mọi agent được giao triển khai dự án QLHS.

## 1. Trước khi code

1. Đọc [04-lo-trinh-giai-doan-1.md](04-lo-trinh-giai-doan-1.md) để biết commit hiện tại.
2. Đọc các tài liệu liên quan (00–03) nếu commit đụng tới nghiệp vụ hoặc schema.
3. Với mọi yêu cầu mới của người dùng, tự xét yêu cầu đó cần cập nhật tài liệu `.md` nào trong `docs/` (thường là `06-cai-tien-sau-trien-khai.md`, `PROGRESS.md`, và tài liệu nghiệp vụ/thiết kế liên quan), cập nhật và ghi log trước khi sửa code — không chờ người dùng nhắc lại.
4. **Chỉ làm đúng phạm vi một commit** — không nhảy commit, không gộp nhiều commit trừ khi người dùng yêu cầu rõ.

## 2. Trong khi code

| Quy tắc | Chi tiết |
|---|---|
| **Một commit = một mục tiêu** | Tiêu chí hoàn thành lấy từ bảng trong tài liệu 04. |
| **Không đánh số lại roadmap** | Phát sinh việc ngoài dự kiến → thêm hậu tố (`C017a`), không đổi số các commit đã lập. |
| **Data layer trước** | Đọc/ghi dữ liệu qua `src/data/` (interface `DataSource`). Không gọi API trực tiếp từ component. |
| **Feature-based** | Tính năng mới → thư mục `src/features/<tên>/` mới; tránh sửa lan sang feature khác. |
| **Không tự suy diễn nghiệp vụ** | Điểm trừ, phạm vi tập thể, bảo mật… lấy từ tài liệu 02–03. Thiếu thông tin → hỏi hoặc đánh dấu `⛔ Bị chặn` trong PROGRESS. |
| **Giữ diff nhỏ** | Không refactor hoặc đổi công nghệ ngoài phạm vi commit. |
| **Docs trước, code sau** | Khi phát sinh yêu cầu mới, thêm mục commit/log tương ứng vào tài liệu sống trước, rồi mới triển khai. Nếu yêu cầu làm thay đổi hành vi người dùng, cập nhật thêm tài liệu mô tả hành vi đó. |

## 3. Commit message

```
[Cxxx] <loại>: <mô tả tiếng Việt ngắn gọn>
```

Loại: `feat` | `chore` | `docs` | `fix`

Ví dụ: `[C011] feat(data-adapter): xay dung interface DataSource va types`

## 4. Sau mỗi commit

1. Cập nhật [PROGRESS.md](PROGRESS.md): đổi trạng thái thành `✅ Xong`, ghi ngày hoàn thành.
2. Báo ngắn gọn cho người dùng: commit vừa xong, bước tiếp theo là gì.
3. **Dừng lại** chờ xác nhận trước khi sang commit kế tiếp — trừ khi người dùng yêu cầu chạy liên tiếp nhiều commit.

## 5. Những việc không được làm

- Đổi schema Sheet hoặc quy tắc điểm mà không cập nhật tài liệu 02/03 tương ứng.
- Hiển thị SĐT phụ huynh trên giao diện học sinh public (tài liệu 01 mục 6).
- Commit file chứa secret (`.env`, API key).
- `git push --force` lên nhánh chính.
- Bỏ qua hook hoặc sửa `git config` của repo.

## 6. Kiểm thử tối thiểu

- Giai đoạn 1 ưu tiên kiểm thử trên **điện thoại** và **laptop** (tài liệu 00, 01).
- Mỗi commit có tiêu chí hoàn thành trong tài liệu 04 — phải đáp ứng trước khi đánh dấu xong.
