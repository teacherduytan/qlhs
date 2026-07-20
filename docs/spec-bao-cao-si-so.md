# Spec: Tính năng "Báo cáo sĩ số" trên Web App

## 1. Mục tiêu

Chuyển tính năng đang chạy ở script Python (`bao_cao_si_so.py`, chạy local, mở link Google Form đã điền sẵn) thành một tính năng trên web app, để giáo viên chủ nhiệm (GVCN) không cần cài Python, chỉ cần mở trình duyệt.

**Luồng người dùng mong muốn:**
1. Mở trang web → chọn **Ngày** + **Buổi** (Sáng/Chiều)
2. App tự tính sĩ số (Nội trú / Bán trú / 2 buổi có mặt, danh sách vắng) từ dữ liệu điểm danh
3. Người dùng xem lại số liệu trên màn hình (có thể sửa tay nếu cần)
4. Người dùng tự điền thêm 4+4 ô "Số món ăn" (không có trong nguồn dữ liệu)
5. Bấm nút **"Mở Google Form đã điền sẵn"** → mở form thật (tab mới), đã điền sẵn toàn bộ, người dùng tự xem lại và bấm Gửi

**Nguyên tắc bắt buộc: app KHÔNG được tự động bấm Gửi thay người dùng.** Chỉ tạo link đã điền sẵn (prefill), việc gửi luôn do người dùng chủ động thực hiện trên chính Google Form.

---

## 2. Nguồn dữ liệu

Dữ liệu điểm danh hiện đang nằm trong 1 file Excel/Google Sheet tên `Diem_danh_11C5` (đang dùng song song trên Google Sheets). Cấu trúc liên quan:

### Sheet `Cấu hình tuần`
Bảng tra "ngày nào thuộc tuần nào":

| Cột A | Cột B | Cột C |
|---|---|---|
| Tuần (số) | Từ ngày | Đến ngày |

- Dữ liệu bắt đầu từ **dòng 6** trở đi, mỗi dòng 1 tuần.
- Logic tra cứu: tìm dòng có `Từ ngày <= ngày_cần_tra <= Đến ngày` → lấy số Tuần ở cột A.

### Sheet `Chính khóa - Tuần {N}` (N = số tuần tra được ở trên)
Đây là sheet điểm danh chính khóa của tuần đó. Cấu trúc:
- **Cột B** = Họ và Tên học sinh
- **Cột C** = Diện (`2B` / `BT` / `NT`)
- **Dòng 7** = header ngày, dạng text 2 dòng kiểu `"T2\n06/07"` (thứ + ngày/tháng, không có năm)
- Từ **cột F trở đi**, cứ 2 cột liên tiếp là 1 ngày: cột đầu = **Sáng**, cột kế = **Chiều** (F=Sáng ngày1, G=Chiều ngày1, H=Sáng ngày2, I=Chiều ngày2, ...)
- **Dữ liệu học sinh từ dòng 9 trở đi**, đến khi gặp dòng trống (cột B rỗng) thì **bỏ qua dòng đó và đi tiếp** (không dừng hẳn — học sinh nghỉ/chuyển trường bị xóa nội dung nhưng dòng vẫn còn tồn tại ở giữa danh sách).

### Quy ước giá trị điểm danh (ô giao giữa dòng học sinh và cột ngày/buổi)
Đây là điểm quan trọng nhất, khác với suy nghĩ thông thường:

| Giá trị ô | Ý nghĩa |
|---|---|
| **Để trống (rỗng)** | **Có mặt** (mặc định — không phải giá trị "Vắng"!) |
| `"Vắng có phép"` | Vắng, có phép |
| `"Vắng không phép"` | Vắng, không phép |
| `"Trễ"` | Đi trễ (**vẫn coi là có mặt** trong báo cáo sĩ số — xem mục 3) |

---

## 3. Logic nghiệp vụ (business logic) — copy chính xác từ script gốc

```python
STATUS_VANG = {"Vắng có phép", "Vắng không phép"}
TRE_LA_CO_MAT = True   # cấu hình được, mặc định True

for mỗi học sinh trong sheet tuần đó:
    if không có tên (dòng đã bị xóa nội dung):
        bỏ qua dòng này, KHÔNG dừng vòng lặp
        continue

    diện = giá trị cột C (chỉ nhận 1 trong 3: "2B" / "BT" / "NT", các giá trị khác bỏ qua)
    status = giá trị ô [dòng học sinh, cột ngày+buổi đã xác định]

    tổng_theo_diện[diện] += 1

    is_absent = status in STATUS_VANG
    is_late   = status == "Trễ"
    present   = (status rỗng) OR (is_late AND TRE_LA_CO_MAT)

    if present:
        có_mặt_theo_diện[diện] += 1

    if is_absent OR (is_late AND NOT TRE_LA_CO_MAT):
        thêm "Tên (Diện)" vào danh_sách_vắng
```

**Kết quả cần tính ra:**
- `có_mặt["NT"]`, `có_mặt["BT"]`, `có_mặt["2B"]` — 3 số nguyên
- `tổng["NT"]`, `tổng["BT"]`, `tổng["2B"]` — 3 số nguyên (để hiển thị dạng "x/y có mặt", KHÔNG gửi lên form)
- `danh_sách_vắng` — mảng string, mỗi phần tử dạng `"Tên học sinh (Diện)"`

---

## 4. Xác định đúng cột Sáng/Chiều theo ngày người dùng chọn

```
duyệt cột từ F (cột 6) đến trước cột đầu tiên của bảng "TỔNG KẾT", bước nhảy 2:
    đọc header ở dòng 7 của cột đó
    tách chuỗi theo "\n", lấy dòng cuối → dạng "dd/mm"
    parse ra (ngày, tháng)
    nếu khớp (ngày, tháng) người dùng chọn → đây là cột "Sáng" của ngày đó
        cột "Chiều" = cột này + 1
        dừng tìm kiếm
```

Nếu không tìm thấy cột khớp ngày → báo lỗi rõ ràng cho người dùng ("Ngày này chưa có trong Cấu hình tuần" hoặc "Ngày này nằm ngoài phạm vi tuần đã tạo"), không được crash im lặng.

---

## 5. Tích hợp Google Form (prefill link)

**Cách làm (đã kiểm chứng hoạt động, giữ nguyên):** dùng link dạng `viewform?usp=pp_url&entry.XXXX=giá_trị&...`, KHÔNG POST thẳng vào `formResponse` (không cần biết cách vượt qua trang mật khẩu bằng code, người dùng tự nhập mật khẩu thật trên form khi Form hiện ra).

### Cần 1 file cấu hình mapping (KHÔNG hardcode trong code, để riêng — xem mục 6 bảo mật):
```json
{
  "form_base_url": "https://docs.google.com/forms/d/e/XXXXXXXXXXXX/viewform",
  "form_password": "giá trị mật khẩu thật của form",
  "questions": [
    { "title": "Nhập Password", "entry": "entry.111111" },
    { "title": "NGÀY", "entry": "entry.222222" },
    { "title": "LỚP", "entry": "entry.333333" },
    { "title": "BUỔI HỌC", "entry": "entry.444444" },
    { "title": "NỘI TRÚ (CÓ MẶT)", "entry": "entry.555555" },
    { "title": "BÁN TRÚ (CÓ MẶT)", "entry": "entry.666666" },
    { "title": "HAI BUỔI (CÓ MẶT)", "entry": "entry.777777" },
    { "title": "TÊN HỌC SINH VẮNG (DIỆN)", "entry": "entry.888888" },
    { "title": "SỐ MÓN CHÍNH 1", "entry": "entry.aaaaaa" },
    { "title": "SỐ MÓN CHÍNH 2", "entry": "entry.bbbbbb" },
    { "title": "SỐ MÓN PHỤ 1(Trứng)", "entry": "entry.cccccc" },
    { "title": "SỐ MÓN PHỤ 2 (Cá hộp)", "entry": "entry.dddddd" },
    { "title": "SỐ MÓN CHÍNH 1 (NGÀY MAI)", "entry": "entry.eeeeee" },
    { "title": "SỐ MÓN CHÍNH 2 (NGÀY MAI)", "entry": "entry.ffffff" },
    { "title": "SỐ MÓN PHỤ 1 (NGÀY MAI) Trứng", "entry": "entry.gggggg" },
    { "title": "SỐ MÓN PHỤ 2 (NGÀY MAI) Cá hộp", "entry": "entry.hhhhhh" }
  ]
}
```
> File thật (`form_entries.json`) người dùng đã có sẵn từ trước — AI code chỉ cần đọc đúng theo cấu trúc trên, không cần tự đoán entry ID.

### Build URL:
```
{form_base_url}?usp=pp_url&entry.111111={password}&entry.222222={ngày ISO}&entry.333333=11C5&entry.444444={SÁNG|CHIỀU}&entry.555555={có_mặt.NT}&entry.666666={có_mặt.BT}&entry.777777={có_mặt.2B}&entry.888888={danh_sách_vắng nối bằng ", "}
```
(4+4 ô "Số món" để trống trong URL — người dùng tự điền tay trên Form)

**Format giá trị NGÀY gửi lên:** giữ nguyên `YYYY-MM-DD` như script gốc — nhưng **cần AI code test thật 1 lần** xem Google Form field "NGÀY" (kiểu Date) có tự nhận đúng định dạng này không; nếu form tách 3 ô riêng ngày/tháng/năm thì phải build 3 entry riêng thay vì 1 chuỗi.

Toàn bộ giá trị phải được `URL-encode` trước khi ghép vào query string (đặc biệt là danh sách vắng có dấu tiếng Việt và dấu phẩy).

---

## 6. Nguồn dữ liệu điểm danh — 2 lựa chọn kiến trúc (chọn 1)

### Lựa chọn A — Đọc trực tiếp Google Sheets qua API (khuyến nghị)
File điểm danh **đang sống trên Google Sheets** (người dùng chỉnh sửa hàng ngày ở đó). Nên dùng **Google Sheets API** (`spreadsheets.values.get`) đọc trực tiếp 2 sheet cần thiết (`Cấu hình tuần`, `Chính khóa - Tuần {N}`) mỗi khi người dùng bấm "Tính toán" — luôn lấy đúng dữ liệu mới nhất, không cần người dùng tải file lên tay.
- Cần: Service Account hoặc OAuth, và ID của Google Sheet (lấy từ URL).
- Ưu điểm: không lệch dữ liệu, không cần upload thủ công mỗi lần.

### Lựa chọn B — Upload file .xlsx mỗi lần
Người dùng tự tải file `Diem_danh_11C5*.xlsx` mới nhất lên web app, backend đọc bằng thư viện đọc Excel (ví dụ `openpyxl` nếu backend Python, hoặc `xlsx`/`exceljs` nếu Node.js).
- Ưu điểm: đơn giản, không cần cấu hình Google API.
- Nhược điểm: dễ quên tải bản mới nhất → sai số liệu.

> Nếu không chắc, làm **Lựa chọn A**.

---

## 7. Bảo mật — LƯU Ý QUAN TRỌNG

- `form_password` và `form_entries.json` (chứa entry ID thật của form trường) **KHÔNG được commit vào git / để lộ ở frontend**. Chỉ backend được đọc, hoặc lưu ở biến môi trường (`.env`, đã thêm vào `.gitignore`).
- Toàn bộ logic build URL prefill nên chạy ở **backend**, trả về cho frontend đúng 1 chuỗi URL cuối cùng để mở tab mới — frontend không cần biết entry ID hay mật khẩu.

---

## 8. UI gợi ý (đơn giản, 1 màn hình)

```
┌─────────────────────────────────────────┐
│  Báo cáo sĩ số 11C5                      │
│                                           │
│  Ngày: [date picker]   Buổi: (○Sáng ●Chiều) │
│                                           │
│  [ Tính toán ]                           │
│                                           │
│  ── Kết quả ──────────────────────────   │
│  Nội trú:   x / y có mặt                 │
│  Bán trú:   x / y có mặt                 │
│  2 buổi:    x / y có mặt                 │
│  Vắng: Tên A (BT), Tên B (2B)            │
│                                           │
│  Số món chính 1:   [___]                 │
│  Số món chính 2:   [___]                 │
│  Số món phụ 1 (Trứng):  [___]            │
│  Số món phụ 2 (Cá hộp): [___]            │
│  (tương tự 4 ô "ngày mai")               │
│                                           │
│  [ Mở Google Form đã điền sẵn → ]        │
└─────────────────────────────────────────┘
```

---

## 9. Trường hợp lỗi cần xử lý rõ ràng (không được crash trắng trang)

- Ngày chọn không thuộc tuần nào trong "Cấu hình tuần" → báo: *"Ngày này chưa có trong lịch điểm danh."*
- Sheet `Chính khóa - Tuần {N}` không tồn tại → báo: *"Tuần {N} chưa được tạo trong hệ thống."*
- Không tìm thấy cột đúng ngày trong sheet tuần đó → báo rõ ngày bị thiếu.
- Không đọc được Google Sheet / file (lỗi quyền truy cập, sai ID...) → báo lỗi kỹ thuật cụ thể, không nuốt lỗi im lặng.

---

## 10. Việc KHÔNG cần làm

- Không cần tự động hoá việc bấm "Gửi" trên Google Form.
- Không cần tự tính 8 ô "Số món ăn" — hiện tại không có nguồn dữ liệu cho việc này, để người dùng tự nhập tay như đã làm từ trước.
- Không cần đăng nhập/tài khoản người dùng phức tạp — đây là công cụ nội bộ 1 giáo viên dùng, có thể làm đơn giản (không cần hệ thống auth đầy đủ) trừ khi có yêu cầu thêm.
