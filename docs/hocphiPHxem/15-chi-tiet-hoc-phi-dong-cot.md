# 15. Chi tiết học phí — cột động điều khiển bằng JSON

> Điều chỉnh lại số thứ tự file này nếu `15-` đã được dùng cho nội dung khác trong `docs/`.

## 1. Bối cảnh & mục tiêu

Trang phụ huynh đã có dòng thời gian hiển thị thông báo theo phân loại, trong đó có thông báo "Học phí" (hiện đang hiển thị tổng thu). Yêu cầu bổ sung: **khi phụ huynh bấm vào thông báo học phí, mở chi tiết biểu phí** của học sinh trong kỳ đó — liệt kê từng khoản thu.

Ràng buộc quan trọng: **số lượng và loại khoản thu (cột) thay đổi theo từng tháng** — tháng này có thể có 10 khoản, tháng sau có thể chỉ còn 6 hoặc phát sinh thêm khoản mới (ví dụ: phí ngoại khóa, phí dã ngoại...). Do đó **không được hardcode danh sách cột trong code**. JSON phải vừa là nguồn dữ liệu, vừa là nguồn cấu hình hiển thị.

## 2. Nguyên tắc thiết kế (bắt buộc IDE AI tuân thủ)

JSON tách làm 2 phần độc lập:

1. **`cot_hoc_phi`** (definition/config) — khai báo cột nào tồn tại trong kỳ này, tên hiển thị, loại, thứ tự hiển thị.
2. **`hoc_sinh[].chi_tiet`** (data) — object dạng key-value `{ ma_cot: so_tien }`, tra cứu theo `ma_cot` khai báo ở phần 1, **không phải mảng vị trí cố định**.

Component render bảng chi tiết phải luôn lặp qua `cot_hoc_phi` (đã sort theo `thu_tu`) rồi tra `chi_tiet[cot.ma_cot]` — tuyệt đối không viết cứng tên cột (`chi_tiet.hoc_phi`, `chi_tiet.tang_tiet`...) trong JSX/component.

Hệ quả: thêm/bớt cột tháng sau = chỉ sửa mảng `cot_hoc_phi` trong dữ liệu, **không cần sửa code, không cần deploy lại**.

## 3. Cấu trúc JSON chuẩn (contract)

```jsonc
{
  "lop": "11C5",
  "ma_ky": "2026-09",              // định dạng YYYY-MM, dùng để sort/tra cứu
  "ten_ky": "Tháng 9/2026",        // tên hiển thị cho phụ huynh
  "ngay_cap_nhat": "2026-09-04",   // ngày dữ liệu được cập nhật/import

  "cot_hoc_phi": [
    {
      "ma_cot": "hoc_phi",              // khoá duy nhất, snake_case, KHÔNG đổi giữa các kỳ nếu ý nghĩa cột không đổi
      "ten_cot": "Học phí",             // tên hiển thị cho phụ huynh
      "loai": "thu",                    // "thu" | "giam_tru" | "no"  (xem mục 5)
      "thu_tu": 1,                      // số nguyên, dùng để sort cột khi render
      "an_neu_bang_khong": true         // optional, default true — ẩn dòng này nếu học sinh có giá trị 0
    }
    // ... các cột khác
  ],

  "hoc_sinh": [
    {
      "ma_hs": "HS0012",         // BẮT BUỘC — khoá để nối với bảng học sinh hiện có (cùng ma_hs dùng ở bảng noi_dung_tin_nhan)
      "ho_ten": "Bùi Vân Anh",   // chỉ để hiển thị/đối chiếu, KHÔNG dùng làm khoá join
      "tong_thu": 3120000,       // lấy trực tiếp từ nguồn (Excel), là số liệu "chính thức"
      "chi_tiet": {
        "hoc_phi": 2420000,
        "tang_tiet": 500000
        // chỉ cần các ma_cot có giá trị khác 0 hoặc muốn hiển thị;
        // thiếu key nào thì app mặc định 0 cho key đó
      }
    }
  ]
}
```

### Quy tắc xử lý dữ liệu thiếu/thừa
- `chi_tiet` thiếu `ma_cot` có khai báo trong `cot_hoc_phi` → mặc định `0`.
- `chi_tiet` có `ma_cot` **không** khai báo trong `cot_hoc_phi` → bỏ qua, không hiển thị (an toàn khi nguồn Excel dư cột).
- `cot_hoc_phi` rỗng hoặc thiếu → không hiển thị bảng chi tiết, chỉ hiển thị `tong_thu`.

## 4. Vấn đề `ma_hs` — cần xử lý trước khi import

File Excel gốc (`hocphi_11C5.xlsx`) **không có cột mã học sinh**, chỉ có STT + Họ tên. Nhưng hệ thống đã dùng `ma_hs` làm khoá ở nơi khác (bảng `noi_dung_tin_nhan` import theo `ma_hs` + `noi_dung`). Vì vậy:

- **Không dùng họ tên làm khoá join** (rủi ro trùng tên, dấu, khoảng trắng).
- Trước khi tạo JSON để import, cần **map STT/Họ tên → ma_hs** dựa trên danh sách lớp hiện có trong hệ thống (bảng học sinh của 11C5).
- IDE AI: khi viết script/route import JSON học phí, nếu gặp `ma_hs: null` hoặc `ma_hs` không khớp học sinh nào trong lớp → **không chặn toàn bộ import**, gom các dòng lỗi vào danh sách "cần rà soát" trả về cho giáo viên xử lý thủ công (tương tự cách hệ thống đang xử lý `ma_danh_muc = NULL` — không chặn, chỉ đánh dấu chờ xử lý).

## 5. Quy tắc hiển thị theo `loai`

| loai | Ý nghĩa | Cách hiển thị |
|---|---|---|
| `thu` | Khoản thu bình thường | Số dương, màu chữ mặc định |
| `giam_tru` | Khoản giảm trừ (thường âm) | Nếu giá trị < 0: màu đỏ, format `(300.000 đ)` hoặc `-300.000 đ` |
| `no` | Nợ/dư kỳ trước, có thể dương hoặc âm | Nếu > 0: nhãn "Nợ kỳ trước" (đỏ/cảnh báo). Nếu < 0: nhãn "Dư kỳ trước" (xanh, được trừ vào kỳ này) |

Nhãn "Nợ kỳ trước" / "Dư kỳ trước" xử lý **ở tầng hiển thị** dựa trên dấu của giá trị, không phải 2 cột riêng — dữ liệu chỉ cần 1 `ma_cot: "no_thang_truoc"` với `loai: "no"`.

Dòng cuối bảng: **"TỔNG CỘNG"** = `tong_thu` lấy từ dữ liệu (không tính lại để hiển thị). App có thể validate ngầm bằng `sum(Object.values(chi_tiet))` so với `tong_thu`; nếu lệch → log cảnh báo console, **không chặn hiển thị** (ưu tiên tin dữ liệu nguồn vì có thể có làm tròn hoặc cột ẩn không đưa vào JSON).

## 6. UI/UX

- Phụ huynh bấm vào thông báo "Học phí" trên dòng thời gian → mở modal (hoặc trang con) **"Chi tiết học phí — {ten_ky}"**.
- Bảng 2 cột: **Khoản mục | Số tiền**, sort theo `thu_tu`.
- Dòng nào `gia_tri === 0` và cột đó có `an_neu_bang_khong !== false` → ẩn dòng cho học sinh đó (giữ hoá đơn gọn, không liệt kê khoản không phát sinh).
- Dòng cuối in đậm: **Tổng cộng: {tong_thu}**.
- Format tiền: `new Intl.NumberFormat('vi-VN').format(value) + ' đ'`.
- Responsive ưu tiên mobile (phụ huynh chủ yếu xem trên điện thoại).
- Nếu `chi_tiet` có `loai: "no"` và giá trị khác 0 → có thể thêm dòng ghi chú nhỏ dưới bảng, ví dụ: *"Đã bao gồm nợ/dư kỳ trước"*.

## 7. Lưu trữ dữ liệu (đề xuất — IDE AI kiểm tra schema hiện có trước khi tạo mới)

Theo đúng nguyên tắc "không hardcode, mọi cấu hình nằm trong Supabase" đã áp dụng cho hệ thống điểm rèn luyện, đề xuất 3 bảng:

- **`hoc_phi_ky`**: `id`, `ma_ky` (text, unique), `ten_ky`, `lop`, `ngay_cap_nhat`
- **`hoc_phi_cot_cau_hinh`**: `id`, `ky_id` (FK → hoc_phi_ky), `ma_cot`, `ten_cot`, `loai`, `thu_tu`, `an_neu_bang_khong`
- **`hoc_phi_chi_tiet`**: `id`, `ky_id` (FK), `hoc_sinh_id`/`ma_hs`, `ma_cot`, `gia_tri`, `tong_thu` (lưu 1 lần trên mỗi học sinh, không lặp lại theo từng dòng chi tiết — hoặc tách riêng bảng `hoc_phi_tong` theo `ky_id + ma_hs`)

RPC đề xuất: `lay_chi_tiet_hoc_phi(p_ma_hs text, p_ma_ky text) RETURNS jsonb` — trả về đúng object theo schema ở mục 3 (gồm cả `cot_hoc_phi` của kỳ đó và `chi_tiet` của riêng học sinh đó), để frontend chỉ cần 1 lần gọi là có đủ dữ liệu render.

**Trước khi tạo bảng mới, IDE AI phải kiểm tra**: hệ thống thông báo/dòng thời gian hiện tại lưu thông báo học phí ở đâu (bảng nào, có cột nào tham chiếu `ma_ky` hay tổng tiền sẵn chưa) để quyết định nối vào bảng đó hay tạo bảng riêng như trên. Báo cáo lại phát hiện trước khi sửa code (theo đúng quy trình audit đã áp dụng ở spec rà soát biến động học sinh).

## 8. Import JSON vào hệ thống

- Giáo viên tạo/chỉnh JSON theo schema trên (từ Excel gốc, sau khi đã map `ma_hs`) mỗi kỳ thu.
- Cần 1 trang/route import (admin-only) nhận JSON, upsert vào `hoc_phi_ky` + `hoc_phi_cot_cau_hinh` (theo `ma_ky`, ghi đè nếu kỳ đã tồn tại) + `hoc_phi_chi_tiet` (theo `ky_id + ma_hs + ma_cot`, upsert).
- Import không chặn toàn bộ nếu có dòng `ma_hs` không khớp — trả về danh sách lỗi để giáo viên rà soát (xem mục 4).
- Ghi log commit theo số C-series tiếp theo trong `docs/06-cai-tien-sau-trien-khai.md` sau khi hoàn thành, theo quy trình đã thiết lập.

## 9. Việc cần làm (checklist cho IDE AI)

1. Đọc schema hiện tại của bảng thông báo/dòng thời gian phụ huynh, xác định cách nối dữ liệu học phí vào thông báo hiện có.
2. Tạo bảng `hoc_phi_ky`, `hoc_phi_cot_cau_hinh`, `hoc_phi_chi_tiet` (hoặc tương đương phù hợp schema hiện tại) + RPC `lay_chi_tiet_hoc_phi`.
3. Viết route/trang import JSON (admin), có xử lý lỗi map `ma_hs` không chặn toàn bộ.
4. Viết component modal/trang chi tiết học phí, render **hoàn toàn động** theo `cot_hoc_phi` (không hardcode tên cột).
5. Áp dụng quy tắc hiển thị theo `loai` (mục 5) và ẩn dòng bằng-0 theo `an_neu_bang_khong` (mục 6).
6. Test với file mẫu `hocphi_2026_09_11C5.json` (đính kèm) — verify trên trình duyệt thật (bắt buộc theo nguyên tắc đã thiết lập của dự án, không chỉ dựa vào build pass).
7. Cập nhật `docs/06-cai-tien-sau-trien-khai.md` với số C-series tiếp theo.
