# 16 — Nguyên tắc để AI khác tạo JSON học phí từ file Excel

> **Dùng file này khi nào**: đưa file này + file Excel học phí cho MỘT AI KHÁC (ví dụ ChatGPT, một agent khác…) và
> yêu cầu nó đọc Excel rồi xuất ra đúng 1 khối JSON theo đúng khuôn dưới đây. JSON đó dán thẳng vào app, tab
> **Import → chế độ "💰 Học phí (cột động)"** (`ImportPage.tsx`, gọi `dataSource.upsertHocPhiKy()`). Đây không phải
> tài liệu mô tả tính năng (xem [15-chi-tiet-hoc-phi-dong-cot.md](15-chi-tiet-hoc-phi-dong-cot.md) cho phần đó) — đây
> là **bản hướng dẫn cho AI sinh dữ liệu**, viết theo đúng những gì app hiện tại đọc được, không hơn không kém.

## 1. App hiện tại đọc được gì — đừng bịa thêm

App chỉ nhận **1 object JSON duy nhất** (không phải mảng), đúng cấu trúc:

```json
{
  "lop": "11C5",
  "ma_ky": "2026-09",
  "ten_ky": "Học phí tháng 9/2026",
  "ngay_cap_nhat": "2026-09-04",
  "cot_hoc_phi": [
    { "ma_cot": "hoc_phi", "ten_cot": "Học phí", "loai": "thu", "thu_tu": 1 },
    { "ma_cot": "dua_ruoc", "ten_cot": "Đưa rước", "loai": "thu", "thu_tu": 2 },
    { "ma_cot": "giam_anh_em", "ten_cot": "Giảm anh em", "loai": "giam_tru", "thu_tu": 3 },
    { "ma_cot": "no_thang_truoc", "ten_cot": "Nợ tháng trước", "loai": "no", "thu_tu": 4, "an_neu_bang_khong": true }
  ],
  "hoc_sinh": [
    {
      "ma_hs": null,
      "stt": 1,
      "ho_ten": "Nguyễn Văn A",
      "tong_thu": 1850000,
      "chi_tiet": { "hoc_phi": 1500000, "dua_ruoc": 400000, "giam_anh_em": 50000, "no_thang_truoc": 0 }
    }
  ]
}
```

Không có field nào khác được app đọc. Nếu AI tự thêm field lạ (`sdt`, `ghi_chu_rieng`, `noi_dung_sms`, `han_dong`…),
app sẽ **im lặng bỏ qua**, không báo lỗi nhưng cũng không dùng — đừng để AI tưởng thêm field là "nhắn thêm được gì
đó cho phụ huynh".

## 2. Field bắt buộc / tùy chọn (đúng những gì app kiểm tra trước khi cho import)

| Field | Bắt buộc? | Kiểu | Ghi chú |
|---|---|---|---|
| `ma_ky` | **Bắt buộc** | chuỗi, không rỗng | Mã định danh duy nhất của kỳ, ví dụ `"2026-09"`. Import lại cùng `ma_ky` sẽ **ghi đè** toàn bộ dữ liệu kỳ đó (cột + số liệu), không tạo trùng. |
| `ten_ky` | **Bắt buộc** | chuỗi, không rỗng | Tên hiển thị của kỳ — **xem mục 4**, chuỗi này sẽ xuất hiện thẳng trong câu thông báo gửi phụ huynh, phải viết cho rõ nghĩa, không viết tắt khó hiểu. |
| `lop` | Tùy chọn | chuỗi | Chỉ để ghi chú, không dùng để lọc/khớp gì. |
| `ngay_cap_nhat` | Tùy chọn | chuỗi ngày `YYYY-MM-DD` | Ngày cập nhật số liệu, hiển thị tham khảo. |
| `cot_hoc_phi` | **Bắt buộc**, mảng không rỗng | xem bên dưới | Định nghĩa các cột tiền sẽ xuất hiện trong bảng chi tiết. |
| `hoc_sinh` | **Bắt buộc**, mảng không rỗng | xem bên dưới | Dữ liệu từng học sinh. |

Mỗi phần tử `cot_hoc_phi[]`:

| Field | Bắt buộc? | Kiểu | Ghi chú |
|---|---|---|---|
| `ma_cot` | **Bắt buộc** | chuỗi | Khoá kỹ thuật — **chỉ chữ thường không dấu + số + gạch dưới** (kiểu `snake_case`, ví dụ `hoc_phi`, `dua_ruoc_1`), duy nhất trong `cot_hoc_phi`. Đây là khoá để tra `chi_tiet[ma_cot]` của từng học sinh — sai chính tả 1 ký tự là mất luôn cột đó khi hiển thị. |
| `ten_cot` | **Bắt buộc** | chuỗi | Tên hiển thị cho phụ huynh, ví dụ "Học phí", "Tăng tiết", "Giảm anh em". |
| `loai` | **Bắt buộc** | `"thu"` \| `"giam_tru"` \| `"no"` | Xem mục 3 — quyết định màu sắc/cách hiển thị, không phải tên gọi tự do. |
| `thu_tu` | Khuyến nghị | số | Thứ tự hiển thị (nhỏ trước). Nếu bỏ trống, app tự lấy theo vị trí trong mảng. |
| `an_neu_bang_khong` | Tùy chọn | `true`/`false` | Mặc định `true` = dòng có giá trị 0 sẽ **ẩn** khỏi bảng chi tiết. Đặt `false` cho các cột luôn muốn hiện dù bằng 0 (ví dụ muốn phụ huynh luôn thấy dòng "Nợ tháng trước: 0 đ" để yên tâm). |

Mỗi phần tử `hoc_sinh[]`:

| Field | Bắt buộc? | Kiểu | Ghi chú |
|---|---|---|---|
| `ma_hs` | Tùy chọn | chuỗi hoặc `null` | **Luôn để `null`** trừ khi AI được cung cấp đúng mã học sinh thật từ hệ thống (thường thì KHÔNG có trong Excel gốc) — xem mục 5, tuyệt đối không tự bịa mã. |
| `stt` | Tùy chọn | số | Số thứ tự trong Excel, chỉ để đối chiếu khi có dòng cần rà soát thủ công. |
| `ho_ten` | **Bắt buộc** | chuỗi, không rỗng | Xem mục 5 — chép **nguyên văn** từ Excel, không tự sửa/viết tắt/chuẩn hoá. |
| `tong_thu` | **Bắt buộc** | số | Xem mục 6. |
| `chi_tiet` | **Bắt buộc** | object `{ma_cot: số tiền}` | Không phải mảng. Chỉ cần điền các `ma_cot` có giá trị khác 0 (thiếu key nào, app tự hiểu là 0), nhưng nên điền đủ tất cả `ma_cot` đã khai báo trong `cot_hoc_phi` để rõ ràng, kể cả giá trị 0. |
| `noi_dung_thong_bao` | Tùy chọn | chuỗi | Xem mục 4 — nội dung thông báo **riêng cho học sinh này**, thay hẳn câu mặc định chung. Bỏ trống thì dùng câu mặc định. |
| `ghi_chu_thong_bao` | Tùy chọn | chuỗi | Xem mục 4 — dòng ghi chú ngắn riêng cho học sinh này (ví dụ đánh dấu "còn nợ tháng trước"). Bỏ trống thì dùng `ten_ky` làm ghi chú như mặc định. |

## 3. Cách phân loại 1 cột Excel thành `thu` / `giam_tru` / `no`

Đọc tên cột trong Excel rồi xếp loại theo nghĩa, **không xếp theo cảm tính**:

- **`thu`** (mặc định cho mọi khoản phải đóng): học phí, học phí bán trú, đưa rước, tăng tiết, tiếng Anh tăng cường,
  bảo hiểm y tế, đồng phục, quỹ lớp… — bất kỳ khoản nào làm **tăng** số tiền phải đóng.
- **`giam_tru`**: bất kỳ khoản làm **giảm** số tiền phải đóng trong chính kỳ này — giảm anh em/chị em, học bổng,
  chiết khấu, miễn giảm chính sách… Cột Excel thường có chữ "giảm", "trừ", "chiết khấu", "miễn", "học bổng".
  **Giá trị luôn phải là số DƯƠNG** (độ lớn khoản giảm, ví dụ giảm 300.000đ thì ghi `300000`, không ghi `-300000`)
  — app tự trừ đi và tự hiện dấu trừ khi hiển thị; ghi âm sẽ làm sai màu hiển thị (bị hiểu nhầm thành "dư tiền")
  **và** làm `tong_thu` tự tính (mục 6) lệch với số thật trong Excel — đây là lỗi thật đã từng xảy ra khi AI khác
  copy thẳng số âm từ 1 cột Excel có định dạng trừ tiền (ví dụ Excel tô đỏ số trong ngoặc `(300,000)`), cần đặc
  biệt cẩn thận đổi dấu khi gặp định dạng này.
- **`no`**: số dư **mang từ kỳ trước sang** (không phát sinh mới trong kỳ này) — "nợ tháng trước", "dư tháng trước",
  "chuyển kỳ trước". Giá trị **dương** = còn nợ (app tự hiện nhãn "Nợ kỳ trước", tô đỏ); giá trị **âm** = dư tiền
  thừa từ trước (app tự hiện nhãn "Dư kỳ trước", tô xanh) — AI không cần tự viết chữ "nợ"/"dư" vào `ten_cot`, chỉ
  cần đặt đúng dấu của con số và đúng `loai: "no"`, app tự lo phần chữ.

Nếu 1 cột Excel không rõ nghĩa (ví dụ chỉ ghi tắt "KM", "HT1", "PC"), AI phải **hỏi lại người dùng** ý nghĩa cột đó
trước khi xếp loại — không đoán bừa, vì xếp sai `loai` sẽ làm phụ huynh hiểu sai mình đang được giảm hay đang nợ.

## 4. "Nội dung thông báo" vs "nội dung chi tiết" — app tạo ra 2 phần này thế nào

Đây là phần quan trọng nhất trả lời đúng câu hỏi "AI cần hiểu gì để ra đúng nội dung nhắn cho phụ huynh":

1. **Nội dung thông báo** (dòng hiện ngay trên trang phụ huynh, phần "nổi" của tin nhắn, cũng chính là nội dung
   điền sẵn khi giáo viên bấm "Nhắn tin" gửi SMS) — **có 2 cách, cả hai đều tự động kèm link `/ph/:token` cá nhân
   hoá theo đúng học sinh, AI không cần tự chèn link**:
   - **Cách mặc định** (không cần làm gì thêm): app tự sinh 1 câu chung cho mọi học sinh trong cùng `ma_ky`, theo
     khuôn `{ten_ky}. Xem chi tiết và số tiền cụ thể tại: {link}` — phần duy nhất AI kiểm soát được là `ten_ky`,
     nên phải viết cho tự đọc lên đã hiểu ngay là kỳ nào (ví dụ `"Học phí tháng 9/2026"`, không nên chỉ để
     `"09/2026"` hay `"Kỳ 3"`).
   - **Cách cá nhân hoá riêng từng học sinh** (khuyến khích dùng nếu có sẵn nội dung nhắn tin/SMS đã soạn theo
     từng em — ví dụ kèm số tiền, hạn đóng, số tài khoản ngân hàng): thêm 2 field tuỳ chọn vào từng phần tử
     `hoc_sinh[]`: `"noi_dung_thong_bao"` (chuỗi — văn bản đầy đủ AI/giáo viên tự soạn cho đúng học sinh này) và
     `"ghi_chu_thong_bao"` (chuỗi — dòng ghi chú ngắn phía trên, ví dụ `"Học phí tháng 9 - còn nợ tháng 8"`). App
     **giữ nguyên** văn bản này và **tự nối thêm** `" Xem chi tiết tại: {link}"` vào cuối — AI chỉ cần lo đúng nội
     dung câu chữ/số tiền, không cần và không nên tự chèn link vào `noi_dung_thong_bao` (app tự thêm; nếu văn bản
     đã lỡ có sẵn 1 link `/ph/` rồi thì app nhận ra và không nối thêm lần 2, nhưng để đơn giản/an toàn nhất thì
     cứ soạn văn bản KHÔNG kèm link, cứ để app lo phần đó). Có 2 field này thì AI **không cần** soạn `ten_ky` cho
     thật kêu nữa (vì mỗi em đã có câu riêng), chỉ cần `ma_ky`/`ten_ky` đủ để định danh kỳ trong hệ thống. Học
     sinh nào không có 2 field này vẫn rơi về câu mặc định như bình thường — có thể trộn lẫn (1 số em có nội dung
     riêng, số còn lại dùng câu chung) trong cùng 1 lần import.
2. **Nội dung chi tiết** (phần "gập" bên dưới, phụ huynh bấm "Bấm vào xem chi tiết học phí" mới thấy, cũng là nơi
   link ở mục (1) dẫn tới): chính là bảng dựng từ `cot_hoc_phi` + `chi_tiet` của học sinh đó, hiển thị theo đúng
   `loai` (mục 3), cộng dòng **"Tổng cộng"** lấy thẳng từ `tong_thu` — không tự cộng lại từ `chi_tiet`. Phần này
   **luôn hiện đúng theo dữ liệu**, bất kể học sinh đó dùng câu thông báo mặc định hay câu riêng ở mục (1).

Ví dụ 1 phần tử `hoc_sinh[]` có cả nội dung riêng lẫn chi tiết cột động (gộp chung 1 lần import, không cần nhập 2
lần ở 2 luồng khác nhau) — chú ý `noi_dung_thong_bao` **không** kèm link, app tự nối vào lúc gửi:

```json
{
  "ma_hs": "HS035",
  "ho_ten": "Trần Huy Phúc",
  "tong_thu": 5540000,
  "chi_tiet": { "hoc_phi": 2420000, "tang_tiet": 500000, "no_thang_truoc": 2420000, "...": 0 },
  "noi_dung_thong_bao": "Trường ... thông báo: em Trần Huy Phúc - Lớp 11C5 chưa đóng học phí tháng 8 là 2.420.000đ, học phí tháng 9 là 3.120.000đ. Tổng cần đóng: 5.540.000đ. ...",
  "ghi_chu_thong_bao": "Học phí tháng 9 - còn nợ tháng 8"
}
```

## 5. Khớp học sinh — vì sao `ma_hs` phải để `null`

File Excel học phí thường **không có mã học sinh**, chỉ có họ tên. App tự động khớp `ho_ten` với danh sách học sinh
đang có trong hệ thống theo quy tắc: bỏ dấu, hạ chữ thường, gộp khoảng trắng thừa, rồi so khớp **chính xác tuyệt
đối** chuỗi đã chuẩn hoá đó (không so khớp gần đúng/mờ).

Vì vậy:

- **Chép nguyên văn** họ tên từ Excel vào `ho_ten`, không tự thêm/bớt đệm, không tự viết hoa lại kiểu khác, không
  tự sửa lỗi chính tả nếu nghi ngờ (nếu nghi ngờ, giữ nguyên như Excel — nếu sai sẽ hiện trong danh sách "cần rà
  soát" để giáo viên tự xử lý, còn nếu AI "sửa giúp" mà đoán sai sẽ càng khó dò lỗi).
- Không tự bịa `ma_hs` — nếu AI không được cung cấp danh sách mã học sinh thật kèm theo, luôn để `ma_hs: null`.
- Dòng nào không khớp được tên sẽ **không** làm hỏng cả lần nhập — app gom vào danh sách "cần rà soát" riêng, giáo
  viên tự xử lý tay. AI không cần (và không nên) tự "đoán" gán một học sinh gần giống tên cho dòng lỗi chính tả.

## 6. Tránh lỗi hiển thị tiếng Việt (mã hoá ký tự)

Từng gặp trường hợp thực tế: AI/công cụ trung gian nào đó trả về văn bản tiếng Việt bị lỗi (dấu câu biến thành ký
tự lạ kiểu `Há»c phÃ­` thay vì `Học phí`) do đi qua nhầm 1 bước mã hoá (thường là UTF-8 bị đọc nhầm thành
Windows-1252 ở đâu đó trong chuỗi công cụ). JSON dạng này vẫn có thể hợp lệ về cấu trúc nhưng hiển thị sai hoàn
toàn cho phụ huynh/giáo viên. Trước khi trả JSON, AI nên tự đọc lại toàn bộ chuỗi tiếng Việt (`ten_ky`, `ten_cot`,
`ho_ten`, `noi_dung_thong_bao`, `ghi_chu_thong_bao`) xem có ký tự lạ/ký tự thay thế (`�`, `Ã`, `Æ°`, `á»`…) không —
nếu người dùng đọc lại JSON và thấy dấu câu sai như vậy, đó luôn là lỗi cần yêu cầu AI xuất lại, không phải lỗi
của app.

## 7. `tong_thu` lấy từ đâu

- Nếu file Excel **đã có sẵn cột tổng cộng** cho từng học sinh → dùng thẳng số đó cho `tong_thu`. Đây là nguồn
  đáng tin cậy nhất, app hiển thị `tong_thu` y nguyên, **không tự cộng lại** từ `chi_tiet` để so sánh hiển thị.
- Nếu Excel không có cột tổng sẵn → AI tự tính: `tổng các cột loai:"thu"` − `tổng các cột loai:"giam_tru"` +
  `tổng các cột loai:"no"` (cộng nếu nợ dương, trừ nếu dư âm) rồi ghi vào `tong_thu`.
- Nếu tự tính mà lệch với 1 cột "tổng" nào đó có trong Excel, **ưu tiên số trong Excel**, không ưu tiên số tự
  cộng — Excel là nguồn gốc dữ liệu thật, phép cộng chỉ để dự phòng khi Excel không có sẵn.

## 8. Checklist AI phải tự kiểm tra trước khi trả JSON

Trước khi đưa JSON cho người dùng, tự rà lại đúng các điều kiện app sẽ kiểm tra (JSON không đạt sẽ bị từ chối ngay
khi dán vào app, không tới bước import):

- [ ] JSON là **1 object**, không phải mảng, không có ký tự thừa/markdown bọc quanh (không có ```json ở đầu/cuối).
- [ ] Có `ma_ky` (chuỗi không rỗng) và `ten_ky` (chuỗi không rỗng, đọc lên hiểu ngay là kỳ nào).
- [ ] `cot_hoc_phi` là mảng, **có ít nhất 1 phần tử**, mỗi phần tử có đủ `ma_cot` (chuỗi), `ten_cot` (chuỗi),
      `loai` đúng 1 trong 3 giá trị `"thu"`/`"giam_tru"`/`"no"` (không viết hoa, không viết khác đi).
- [ ] Mọi `ma_cot` trong `cot_hoc_phi` là duy nhất (không trùng nhau).
- [ ] `hoc_sinh` là mảng, **có ít nhất 1 phần tử**, mỗi phần tử có `ho_ten` (chuỗi không rỗng) và `chi_tiet`
      (object, không phải mảng, không phải `null`).
- [ ] Mọi khoá trong `chi_tiet` của từng học sinh **khớp đúng chính tả** với 1 `ma_cot` nào đó đã khai báo ở
      `cot_hoc_phi` (khoá lạ không khớp sẽ bị app âm thầm bỏ qua, không báo lỗi — nên phải tự soát kỹ, đừng để app
      soát giúp).
- [ ] `ho_ten` chép nguyên văn từ Excel, không tự sửa.
- [ ] `ma_hs` để `null` trừ khi có danh sách mã thật đi kèm.
- [ ] Mọi cột `loai: "giam_tru"` đều ghi giá trị **dương** (mục 3) — không copy nhầm số âm từ ô Excel định dạng
      trừ tiền kiểu `(300,000)`.
- [ ] `tong_thu` đúng theo mục 7, là số (không phải chuỗi có ký hiệu "đ" hay dấu phẩy ngăn cách).
- [ ] `noi_dung_thong_bao`/`ghi_chu_thong_bao` (nếu có) **không** tự chèn link — để app tự nối (mục 4).
- [ ] Đọc lại mọi chuỗi tiếng Việt xem có ký tự lạ do lỗi mã hoá không (mục 6).

## 9. Cách người dùng dùng JSON này

1. Dán/tải file JSON vào app: tab **Import** → nút gạt chế độ chọn **"💰 Học phí (cột động)"** → dán vào ô JSON
   hoặc chọn file → bấm "Xác nhận nhập học phí".
2. App tự tạo (hoặc cập nhật nếu `ma_ky` đã tồn tại) 1 thông báo "Học phí" cho từng học sinh khớp được tên, lưu
   chi tiết theo đúng `cot_hoc_phi`/`chi_tiet`, và gộp thành 1 "đợt" riêng có ngày giờ rõ ràng trong tab **Nhắn tin
   PH** (như mọi đợt import tin nhắn khác).
3. Học sinh không khớp được tên sẽ hiện trong danh sách "Cần rà soát" ngay trên màn hình import — người dùng tự
   sửa tên trong Excel/JSON và nhập lại (cùng `ma_ky` sẽ ghi đè, không tạo trùng). Mục **"Lịch sử nhập học phí"**
   ngay bên dưới form (cùng màn hình) liệt kê mọi kỳ đã nhập kèm ngày giờ nhập gần nhất, dùng để đối chiếu đã nhập
   đúng kỳ/đúng lúc chưa.
4. Phụ huynh vào trang riêng của mình (`/ph/:token`) sẽ thấy dòng thông báo mới, bấm "Bấm vào xem chi tiết học
   phí" để xem đúng bảng chi tiết vừa nhập.
5. Giáo viên bấm số điện thoại phụ huynh (trang Học sinh hoặc trang chi tiết học sinh) → "Nhắn tin" sẽ tự điền
   sẵn đúng nội dung thông báo ở mục 4 (kèm link) làm nội dung SMS.
