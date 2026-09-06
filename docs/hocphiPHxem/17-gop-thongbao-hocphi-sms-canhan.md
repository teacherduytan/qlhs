# 17 — Ghép thông báo học phí (cột động) với SMS cá nhân hoá kèm link xem chi tiết

> **Gửi AI coding agent (Claude Code/Cursor).** Tài liệu mô tả yêu cầu và thiết kế đề xuất, không phải diff — đọc kỹ,
> kiểm tra codebase hiện tại trước khi sửa, **không tự đoán tên file/route nếu chưa xác nhận được qua tìm kiếm
> codebase**. Đọc trước 2 tài liệu liên quan bắt buộc, tài liệu này build trực tiếp trên 2 cái đó, không lặp lại
> nội dung đã mô tả ở đó:
> - `docs/10-tinh-nang-goi-sms-phu-huynh-v2.md` — bảng `noi_dung_tin_nhan`, action sheet Gọi/Nhắn tin, route
>   `/#/quan-ly/hoc-sinh/<ma_hs>`.
> - `docs/16-nguyen-tac-de-ai-tao-json-hoc-phi.md` — import "Học phí (cột động)", `ImportPage.tsx`,
>   `dataSource.upsertHocPhiKy()`, route công khai `/#/hs/<token>` (hoặc `/ph/:token` — **xác nhận đúng route thật
>   trong codebase, 2 tài liệu trước ghi hơi khác nhau, agent phải tự soát lại chứ không suy đoán**).
>
> ⚠️ Đổi tên file này thành đúng số thứ tự tiếp theo trong `docs/` trước khi lưu vào repo.

---

## 1. Vấn đề hiện tại

Hai luồng thông báo phụ huynh đang **tách rời hoàn toàn**:

1. Import "Học phí (cột động)" (tài liệu 16) → tạo thông báo dùng chung 1 câu cho cả kỳ (`ten_ky`), phụ huynh
   phải tự vào `/ph/:token` mới thấy số tiền/chi tiết. **SMS/Zalo không tự gửi được gì từ luồng này.**
2. Import "Tin nhắn phụ huynh" (tài liệu 10) → giáo viên tự soạn tay `noi_dung` cho từng học sinh, dùng để điền
   sẵn SMS qua action "Nhắn tin". Nhưng nội dung này **không có số liệu học phí thật** trừ khi giáo viên tự gõ
   tay số tiền vào — không tận dụng được dữ liệu đã nhập qua đường (1).

Giáo viên phải làm việc 2 lần cho cùng 1 việc: nhập số liệu học phí (1), rồi tự soạn lại nội dung nhắn tin có số
tiền cho (2). Yêu cầu: **1 lần import học phí, tự động có luôn nội dung SMS kèm link xem chi tiết cho đúng
phụ huynh của đúng học sinh đó.**

## 2. Nguyên tắc thiết kế — không phá vỡ giới hạn đã công bố ở tài liệu 16

Tài liệu 16 mục 4 đã nói rõ: **app không hỗ trợ nội dung thông báo cá nhân hoá riêng theo từng học sinh** trong
JSON học phí cột động — mọi học sinh cùng 1 `ma_ky` nhận chung 1 câu theo `ten_ky`. Tài liệu này **giữ nguyên**
giới hạn đó, **không** thêm field tự do kiểu `noi_dung_rieng` vào JSON học phí — vì nếu cho phép, JSON học phí sẽ
dần biến thành nơi giáo viên/AI nhét văn phong tuỳ ý, đi ngược tinh thần "schema tối giản, rõ nghĩa" của tài liệu
16.

Thay vào đó, cách ghép đúng là: **giữ câu thông báo dùng chung** (tự sinh từ `ten_ky` như hiện tại), chỉ thêm
**link cá nhân hoá theo token của từng học sinh** vào cuối câu đó khi dùng làm nội dung SMS. Link cá nhân hoá đã
đủ để phụ huynh thấy đúng số tiền của con mình — không cần soạn lại câu chữ theo từng em.

## 3. Thiết kế đề xuất

### 3.1. Không đổi schema JSON học phí cột động

JSON import ở tài liệu 16 **giữ nguyên 100%**, không thêm/bớt field. Việc ghép SMS diễn ra ở tầng hiển thị/gửi
tin, không phải ở tầng import.

### 3.2. Hàm sinh nội dung SMS từ học phí — nguồn dữ liệu mới cho action "Nhắn tin"

Bổ sung 1 hàm (ví dụ `buildSmsFromHocPhiKy(hocSinh, hocPhiKy)`), agent tự đặt tên đúng quy ước code hiện có:

```
noi_dung_sms = `${hoc_phi_ky.ten_ky}. Xem chi tiet va so tien cu the tai: ${BASE_URL}/ph/${hoc_sinh.token}`
```

- `BASE_URL` lấy từ cấu hình env hiện có của app (agent tự tìm biến môi trường domain đang dùng, không tự bịa).
- Bản không dấu cho SMS: áp dụng đúng hàm bỏ dấu đã có trong codebase nếu tồn tại (kiểm tra trước khi viết hàm
  mới, tránh trùng logic).
- Hàm này chỉ cần `hoc_sinh` đã khớp được `ma_hs` thật (tài liệu 16 mục 5) — học sinh rơi vào danh sách "cần rà
  soát" (chưa khớp) thì **không** sinh được SMS, giữ nguyên hành vi cũ (bỏ qua, không lỗi).

### 3.3. Thứ tự ưu tiên nội dung khi bấm "Nhắn tin" (mở rộng hành vi mục 6 tài liệu 10)

Khi giáo viên bấm số điện thoại → "Nhắn tin", nội dung điền sẵn theo thứ tự ưu tiên:

1. Nếu có bản ghi mới nhất trong `noi_dung_tin_nhan` (`da_duyet = true`) **mới hơn** kỳ học phí gần nhất → dùng
   bản đó (giữ nguyên hành vi tài liệu 10 — giáo viên tự soạn tay vẫn được ưu tiên khi họ chủ động làm việc đó
   sau).
2. Ngược lại, nếu có kỳ học phí (`hoc_phi_ky`) mà học sinh này có mặt trong `hoc_sinh[]` → dùng
   `buildSmsFromHocPhiKy()` ở mục 3.2.
3. Không có cả hai → để trống, giữ nguyên ghi chú "Chưa có nội dung tin nhắn cho em này" (tài liệu 10 mục 6.4).

So sánh "mới hơn" dựa vào `created_at` của bản ghi `noi_dung_tin_nhan` gần nhất so với `ngay_cap_nhat` (hoặc thời
điểm import) của `hoc_phi_ky` gần nhất — agent kiểm tra field thời gian thật đang lưu cho `hoc_phi_ky` trong
codebase trước khi implement, tài liệu 16 không mô tả rõ tên field này ở tầng lưu trữ (chỉ có trong JSON import).

### 3.4. Ví dụ cụ thể

Với `ten_ky = "Học phí tháng 9/2026"`, học sinh Bùi Vân Anh có `token = "a1b2c3..."`:

```
Hoc phi thang 9/2026. Xem chi tiet va so tien cu the tai: https://<domain>/ph/a1b2c3...
```

Không còn cảnh mỗi học sinh 1 câu tự soạn tay dài dòng như file JSON cũ (`ma_hs/noi_dung/ghi_chu` thủ công) —
nội dung ngắn, đồng nhất, nhưng link dẫn tới đúng số tiền riêng của từng em.

## 4. ⚠️ Cảnh báo bảo mật — bắt buộc kiểm tra trước khi làm

Route công khai xem chi tiết học phí (`/ph/:token`) **không yêu cầu đăng nhập** (đúng theo tài liệu 16). Một khi
link này được gửi qua SMS, `token` chính là **toàn bộ lớp bảo vệ** cho dữ liệu tài chính của phụ huynh.

- **Bắt buộc xác nhận**: `token` hiện tại có phải chuỗi ngẫu nhiên đủ dài (UUID hoặc tương đương) hay không. Nếu
  hiện tại `token` đang trùng hoặc suy ra được từ `ma_hs` (ví dụ dựa trên `HS001`, dễ đoán tuần tự) thì đây là lỗ
  hổng nghiêm trọng — **phải đổi sang giá trị ngẫu nhiên không đoán được trước khi triển khai tính năng này**, vì
  giờ đây link sẽ được gửi hàng loạt qua SMS cho nhiều số điện thoại, tăng khả năng bị dò/đoán token của học sinh
  khác.
- Bảng `noi_dung_tin_nhan` (tài liệu 10) đã có RLS chỉ cho giáo viên đăng nhập — route `/ph/:token` không dùng RLS
  kiểu đó (theo thiết kế), nên **không** được để lộ số điện thoại/tên đầy đủ phụ huynh khác qua route này (đúng
  điều đã ghi ở tài liệu 10 mục 4, nhắc lại ở đây vì tính năng mới làm tăng mức độ lộ nếu token yếu).

## 5. Checklist kiểm thử bổ sung (thêm vào checklist tài liệu 10, không thay thế)

- [ ] Import 1 kỳ học phí cột động → bấm "Nhắn tin" cho 1 học sinh chưa có `noi_dung_tin_nhan` nào → nội dung điền
      sẵn đúng dạng `{ten_ky}. Xem chi tiet...{link}`, link mở đúng đúng trang chi tiết của đúng học sinh đó.
- [ ] Học sinh có cả `noi_dung_tin_nhan` tự soạn MỚI HƠN kỳ học phí → "Nhắn tin" ưu tiên đúng bản tự soạn, không
      bị ghi đè bởi nội dung tự sinh.
- [ ] Học sinh nằm trong danh sách "cần rà soát" (chưa khớp `ma_hs` khi import học phí) → "Nhắn tin" không lỗi,
      không sinh link (vì không có token/dữ liệu khớp).
- [ ] Bấm link `/ph/:token` từ 1 tài khoản/thiết bị khác (không phải điện thoại phụ huynh đó) → vẫn xem được nội
      dung (route public theo thiết kế) nhưng **không suy đoán được token của học sinh khác** từ token đang có.
- [ ] SMS không dấu, không lỗi encode ký tự Việt khi mở trên điện thoại thật.

## 6. Ghi log commit

```
| C0XX | `[C0XX] feat(sms): tu sinh noi dung SMS tu hoc phi ky moi nhat kem link chi tiet ca nhan (/ph/:token)` | Bam "Nhan tin" uu tien noi_dung_tin_nhan tu soan neu moi hon, fallback dung cau tu sinh tu hoc_phi_ky.ten_ky + link token hoc sinh. Khong doi schema JSON hoc phi cot dong. | [dien ket qua test that + xac nhan da kiem tra do ngau nhien cua token] |
```
