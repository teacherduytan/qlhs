# Hướng dẫn quy trình: Thu phiếu → JSON → Import

> Commit **C006** — dành cho giáo viên chủ nhiệm. Web app Import hoàn chỉnh ở commit C016; trước đó có thể tạm dán CSV/JSON vào Sheet hoặc chạy script.

## Tổng quan luồng

```
Ban cán sự ghi phiếu giấy
    → GVCN thu phiếu cuối ngày
    → Chụp ảnh (rõ, đủ 3 phần nếu có)
    → Claude AI chat → JSON đúng schema GhiNhan
    → Web app → Import → Apps Script → Sheet + Drive + NhatKyImport
```

---

## Bước 1 — Thu và kiểm tra phiếu

- Đối chiếu **ngày**, **người ghi**, họ tên viết rõ.
- Phần 1–2: phải có **họ tên** học sinh.
- Phần 3 (tập thể): **không** ghi tên HS — chỉ mã + mô tả.
- Bổ sung mã nếu ban cán sự chỉ ghi mô tả (tra [bang-tra-cuu-ma-diem.md](bang-tra-cuu-ma-diem.md)).

---

## Bước 2 — Chụp ảnh phiếu

- Ánh sáng đủ, không bị che, chụp thẳng.
- Một ảnh cho mỗi mặt phiếu; nếu dài, chụp 2–3 ảnh theo từng phần.
- Có thể gộp nhiều ảnh trong một tin nhắn Claude.

---

## Bước 3 — Prompt mẫu gửi Claude

Copy và chỉnh ngày/tuần trước khi gửi kèm ảnh:

```text
Bạn là trợ lý nhập liệu cho app quản lý học sinh lớp 11C5.

Đọc ảnh phiếu ghi nhận đính kèm và xuất JSON array, mỗi phần tử là 1 dòng tab GhiNhan.

Quy tắc:
- Ngày ghi nhận: [ĐIỀN NGÀY, ví dụ 2026-07-13]
- tuan_so: [1 hoặc 2 — tra tab CauHinhTuan]
- ma_hs: tra khớp họ tên với danh sách lớp (36 em, mã HS001–HS036). Phần tập thể: để null.
- dien_tai_thoi_diem: copy dien hiện tại của HS từ danh sách (2B/BT/NT)
- ma_danh_muc: mã trên phiếu (CC01, NN04...)
- loai: CC→chuyen_can, VS→ve_sinh, NN→ne_nep, KL→trat_tu_ky_luat, HT→hoc_tap
- diem_so_mon: chỉ khi loai=hoc_tap
- diem_cong_tru: lấy từ DanhMucDiem (âm), nhân đôi nếu la_co_do=true
- to_lien_quan: số tổ (1/2/3) nếu sự kiện tổ trực
- trang_thai_xu_ly_tap_the: chua_xu_ly nếu pham_vi tap_the/to_truc; để trống nếu cá nhân
- nguoi_ghi: tên/chức vụ người ghi trên phiếu
- nguon: phieu_giay

Chỉ trả về JSON array thuần, không giải thích thêm.

Schema mỗi object:
{
  "ma_hs": "HS001 hoặc null",
  "to_lien_quan": null,
  "ngay": "YYYY-MM-DD",
  "tuan_so": 1,
  "dien_tai_thoi_diem": "2B",
  "tiet": "3",
  "mon_hoc": "Toán",
  "loai": "trat_tu_ky_luat",
  "ma_danh_muc": "KL08",
  "noi_dung": "...",
  "so_lan": 1,
  "ly_do": "",
  "da_xu_ly": false,
  "hinh_thuc_xu_ly": "",
  "goi_phu_huynh": false,
  "ghi_so_dau_bai": "",
  "diem_so_mon": null,
  "diem_cong_tru": -10,
  "nguoi_ghi": "Lớp phó kỷ luật",
  "nguon": "phieu_giay",
  "trang_thai_xu_ly_tap_the": ""
}
```

**Mẹo:** đính kèm file `du-lieu-mau/hocsinh_seed.json` (hoặc danh sách tên lớp) để Claude khớp `ma_hs` chính xác.

### Nếu JSON có `ma_hs = null`

Khi import `GhiNhan`, app xử lý `ma_hs = null` theo các trường hợp sau:

- Nếu dòng có `ho_ten`: Apps Script thử khớp chính xác `ho_ten` với tab `HocSinh` theo họ + tên đã chuẩn hoá. Khớp đúng 1 học sinh thì tự điền `ma_hs` trước khi lưu.
- Nếu `ho_ten` không khớp học sinh nào hoặc khớp nhiều học sinh trùng tên: dòng đó bị lỗi, không ghi vào `GhiNhan`; lần import được ghi log lỗi trong `NhatKyImport`, các dòng hợp lệ khác vẫn tiếp tục.
- Nếu danh mục có phạm vi `tap_the` hoặc `to_truc`: `ma_hs` được giữ là `null`, hệ thống đặt `trang_thai_xu_ly_tap_the = chua_xu_ly` để giáo viên xử lý/gán sau nếu cần.
- Nếu là dòng cá nhân nhưng thiếu cả `ma_hs` lẫn `ho_ten`: dòng không đủ định danh để gắn vào hồ sơ học sinh. Backend hiện không tự đoán trong trường hợp này; nếu mã danh mục hợp lệ, dòng có thể trở thành ghi nhận không gắn học sinh, nên phải sửa trước khi import hoặc để prompt AI đánh dấu `[CẦN XÁC NHẬN TÊN...]`.

Vì vậy prompt mới vẫn yêu cầu AI điền `ma_hs` khi đã khớp chắc. Cơ chế tự khớp bằng `ho_ten` chỉ là lớp dự phòng và chỉ khớp chính xác, không tự đoán viết tắt.

---

## Bước 4 — Kiểm tra JSON trước khi import

- Là JSON array hợp lệ (dùng jsonlint.com nếu cần).
- Mỗi dòng cá nhân có `ma_hs` + `ma_danh_muc`.
- Dòng tập thể: `ma_hs` null, `trang_thai_xu_ly_tap_the` = `chua_xu_ly`.
- `dien_tai_thoi_diem` đã điền (không để trống với dòng cá nhân).

---

## Bước 5 — Import vào hệ thống

### Khi web app đã có màn Import (sau C016)

1. Mở web app → **Import**.
2. Chọn loại: **ghi_nhan**.
3. Dán JSON hoặc tải file `.json`.
4. Xem trước → **Xác nhận**.
5. Kiểm tra tab `GhiNhan` và `NhatKyImport` trên Sheet.

Mẫu dùng nhanh:

- [`du-lieu-mau/mau-prompt-chuyen-doi-json.md`](../du-lieu-mau/mau-prompt-chuyen-doi-json.md) — prompt copy-dán cho AI khi gửi ảnh phiếu.
- [`du-lieu-mau/mau-import-ghinhan.json`](../du-lieu-mau/mau-import-ghinhan.json) — cấu trúc JSON mẫu để đối chiếu trước khi import.

### Tạm thời (trước C016)

- Dán thủ công vào tab `GhiNhan` trên Sheet (chỉ tuần đầu nếu cần gấp), hoặc
- Nhờ dev chạy script import sớm.

---

## Bước 6 — Xử lý sự kiện tập thể (sau C021a)

Trên dashboard giáo viên, mục **Sự kiện lớp/tổ đang chờ**:

1. **Gán cho 1 học sinh** — khi xác định được người chịu trách nhiệm.
2. **Áp dụng cho tất cả** — trừ điểm cả lớp (hoặc cả tổ nếu `to_truc`).
3. **Bỏ qua** — sự kiện không đáng trừ điểm.

---

## Import danh sách học sinh (một lần — C004)

File sẵn: `du-lieu-mau/hocsinh_seed.json` hoặc `.csv`

- **Apps Script:** `setupQLHSSheet()` rồi `seedInitialData('SPREADSHEET_ID')`
- **Web app (C016):** Import loại `hoc_sinh`

---

## Xử lý lỗi thường gặp

| Vấn đề | Cách xử lý |
|--------|------------|
| Không khớp tên HS | Sửa JSON tay hoặc gửi lại Claude kèm danh sách đầy đủ |
| Thiếu `tuan_so` | Tra `CauHinhTuan` theo ngày ghi nhận |
| Claude trả text thừa | Yêu cầu "chỉ JSON array, không markdown" |
| Import lỗi một phần | Xem `NhatKyImport.ghi_chu` và file gốc trên Drive |

---

## Tài liệu liên quan

- [mau-phieu-ghi-nhan.md](mau-phieu-ghi-nhan.md) — mẫu in
- [bang-tra-cuu-ma-diem.md](bang-tra-cuu-ma-diem.md) — mã tiêu chí
- [02-mo-hinh-du-lieu.md](02-mo-hinh-du-lieu.md) — schema `GhiNhan`
- [huong-dan-tao-sheet.md](huong-dan-tao-sheet.md) — tạo Sheet ban đầu
