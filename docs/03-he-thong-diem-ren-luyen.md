# 03 — Hệ thống điểm thi đua (theo đúng quy chế nhà trường)

> **Cập nhật quan trọng**: Bản này thay thế hoàn toàn bản đề xuất tự do trước đó. Toàn bộ nội dung dưới đây được lấy trực tiếp từ file **"NỘI DUNG ĐÁNH GIÁ, XẾP LOẠI THI ĐUA (HÀNG TUẦN)"** do **Ban Thi đua Khen thưởng — Trường THCS và THPT Lạc Hồng** ban hành, anh cung cấp ngày 11/07/2026. Đây là quy chế thật, có hiệu lực, nên được dùng làm chuẩn duy nhất cho việc trừ/tính điểm — không dùng bảng điểm tự đề xuất trước đây nữa.

> **Sửa lại ngày 23/08/2026**: Đã đối chiếu với file Excel thật trường đang dùng (`THI_ĐUA_CS2_NH_26-27.xlsx`, tuần 01 năm học 2026-2027) và phát hiện công thức mục 3-5 trong bản trước **sai thang điểm của Điểm học tập** (giả định thang 0-20, thực tế trường dùng thang 0-100). Đã sửa lại theo đúng công thức thật lấy từ file Excel (xem ghi chú trong từng mục bên dưới). Điểm khởi đầu/mặc định của Điểm học tập khi chưa có dữ liệu = **100** (khớp cách trường điền, không phải 20).

## 1. Cấu trúc điểm tổng quát

> **Đã xác nhận với giáo viên (11/07/2026)**: hệ thống điểm này tính **theo tuần**, đúng nguyên văn quy chế thi đua thật của trường — không đổi sang điểm luỹ kế cả năm. Mỗi tuần các thành phần đều reset về 100. Nếu sau này cần thêm 1 lớp điểm luỹ kế cả năm cho mục đích cảnh báo riêng của giáo viên, đây sẽ là 1 hệ thống **bổ sung tách biệt**, không thay thế hệ thống theo tuần này.

Khác với bản đề xuất ban đầu (1 cột điểm rèn luyện duy nhất), quy chế thật của trường có **5 thành phần điểm riêng biệt mỗi tuần**, cả 5 đều trên **thang 0–100**:

| Thành phần | Điểm khởi đầu | Cách tính |
|---|---|---|
| 1. Chuyên cần | 100 | 100 − tổng điểm trừ trong tuần |
| 2. Vệ sinh | 100 | 100 − tổng điểm trừ trong tuần |
| 3. Nề nếp, tác phong | 100 | 100 − tổng điểm trừ trong tuần |
| 4. Trật tự, kỷ luật | 100 | 100 − tổng điểm trừ trong tuần |
| 5. Học tập | 100 (mặc định khi chưa có dữ liệu) | `Tổng điểm số các môn trong tuần ÷ Tổng số tiết trong tuần` — **thang 0–100**, không nhân 2 ở bước này (xem mục 3) |

Sau đó tổng hợp thành **Điểm xếp loại thi đua** (công thức ở mục 4), trong đó Điểm học tập được nhân đôi trọng số **ở bước tổng hợp**, không phải ở bước tính riêng.

Mỗi học sinh vẫn "bắt đầu tuần với 100 điểm" đúng như anh mô tả — áp dụng cho **cả 5 thành phần**, không chỉ 4.

## 2. Danh mục chi tiết trừ điểm (nội dung `DanhMucDiem` — cập nhật theo quy chế trường)

### Nhóm CC — Chuyên cần

| Mã | Tiêu chí | Điểm trừ |
|---|---|---|
| CC01 | Đi học trễ / 1 trường hợp | −2 |
| CC02 | Nghỉ học có phép; không phép / 1 trường hợp | −3 |
| CC03 | Không tham gia chào cờ / 1 trường hợp | −5 |
| CC04 | Cờ đỏ bỏ trực ban, vắng họp / 1 trường hợp | −10 |

### Nhóm VS — Vệ sinh

| Mã | Tiêu chí | Điểm trừ |
|---|---|---|
| VS01 | Vệ sinh lớp không đúng giờ / buổi | −10 |
| VS02 | Bàn ghế không ngay ngắn, lớp bẩn, để lại tài liệu đồ dùng sau giờ học / lần | −10 |
| VS03 | Đem đồ ăn, nước uống vào trường, khu vực học, lớp học / 1 trường hợp | −5 |
| VS04 | Hành lang lớp còn bẩn / 1 lần | −10 |
| VS05 | Xả rác bừa bãi không đúng nơi quy định / 1 trường hợp | −5 |
| VS06 | Bán trú lớp ăn trưa không vệ sinh, xả rác, không xếp ghế ngay ngắn / 1 lần | −10 |

### Nhóm NN — Nề nếp, tác phong

| Mã | Tiêu chí | Điểm trừ |
|---|---|---|
| NN01 | Sai đồng phục (quần, áo, giày dép), nữ sinh cắt ngắn quần quá ngắn, bó nhỏ ống quần / 1 trường hợp | −5 |
| NN02 | Không bảng tên / 1 trường hợp | −5 |
| NN03 | Không đúng quy định về giày, dép / 1 trường hợp | −5 |
| NN04 | Không đúng quy định về tóc / 1 trường hợp | −10 |
| NN05 | Không khăn quàng (cấp II) / 1 trường hợp | −5 |
| NN06 | Nữ son môi, sơn móng tay, móng chân, đeo khuyên mũi / 1 trường hợp | −5 |

### Nhóm KL — Trật tự, kỷ luật

| Mã | Tiêu chí | Điểm trừ |
|---|---|---|
| KL01 | Tập trung giờ chào cờ: muộn, lộn xộn, không thẳng hàng / tập thể | −10 |
| KL02 | Lớp gây mất trật tự giờ chào cờ, đầu giờ nghe TVAV / 1 tập thể | −10 |
| KL03 | Giờ nghe TVAV: ngủ gục, đi lung tung, nói chuyện, làm việc riêng / 1 trường hợp | −5 |
| KL04 | Đi vào lối đi cấm / 1 trường hợp | −5 |
| KL05 | Đùa giỡn, la hét làm mất trật tự, nói tục, chửi thề / 1 trường hợp | −5 |
| KL06 | Mang, hút thuốc lá - thuốc lá điện tử, các loại hung khí vào trường / 1 trường hợp | −20 |
| KL07 | Mang chất dễ gây cháy nổ, hộp quẹt, đồ trang điểm vào trường / 1 trường hợp | −5 |
| KL08 | Đem điện thoại, máy nghe nhạc vào trường/lớp không sử dụng, hoặc sử dụng / 1 trường hợp | −10 |
| KL09 | Vô lễ với giáo viên, nhân viên / 1 trường hợp | −20 |
| KL10 | Đem ấn phẩm, sách báo, phim ảnh cấm / 1 trường hợp | −5 |
| KL11 | Gây gổ, đánh nhau, làm mất trật tự lớp học, trường học / 1 trường hợp | −20 |
| KL12 | Uống rượu, bia, đánh bạc (bất kỳ hình thức nào) / 1 trường hợp | −20 |
| KL13 | Ăn cắp, phá hoại tài sản của người khác, của công / 1 trường hợp | −20 |
| KL14 | Vào lớp chậm trong giờ ra chơi / 1 trường hợp | −5 |
| KL15 | Nhận cơm không đúng giờ quy định / tập thể | −10 |

> **Lưu ý riêng của trường (giữ nguyên văn)**: *"Đối với cờ đỏ khi vi phạm các nội dung trên sẽ bị trừ điểm gấp đôi, nếu tái phạm sẽ đề nghị ra khỏi đội cờ đỏ và hạ bậc hạnh kiểm."* → Cần thêm cờ `la_co_do` (boolean) vào tab `HocSinh`, và khi tính điểm trừ cho học sinh có `la_co_do = true`, nhân đôi giá trị điểm trừ ở bảng trên.

## 2b. Phân loại phạm vi áp dụng: cá nhân hay tập thể? (rất quan trọng để phiếu và điểm khớp nhau)

Đối chiếu kỹ văn bản gốc, không phải mục nào cũng gắn được cho 1 học sinh cụ thể. Một số ghi rõ "/ tập thể" hoặc "/ 1 lần" mà không nêu tên ai — đây là các sự kiện của **cả lớp**, do đội cờ đỏ hoặc giám thị ghi nhận khi quan sát lớp, không phải hành vi của riêng 1 em. Nếu ép buộc gán cho 1 học sinh, điểm cá nhân của em đó sẽ bị trừ oan.

| Mã | Tiêu chí | `pham_vi` đề xuất | Vì sao |
|---|---|---|---|
| CC01–CC03 | Đi trễ, nghỉ học, không chào cờ | `ca_nhan` | Xác định rõ học sinh nào. |
| CC04 | Cờ đỏ bỏ trực ban, vắng họp | `ca_nhan` | Gắn với 1 học sinh cờ đỏ cụ thể. |
| VS01 | Vệ sinh lớp không đúng giờ / buổi | `to_truc` | Thường do tổ trực nhật hôm đó phụ trách. |
| VS02 | Bàn ghế không ngay ngắn, để lại đồ dùng | `to_truc` | Trách nhiệm tổ trực, trừ khi xác định rõ 1 học sinh cụ thể để lại đồ. |
| VS03 | Đem đồ ăn, nước uống vào trường | `ca_nhan` | Ai đem thì người đó chịu, dễ xác định. |
| VS04 | Hành lang lớp còn bẩn | `to_truc` | Trách nhiệm tổ trực nhật. |
| VS05 | Xả rác bừa bãi không đúng nơi quy định | `ca_nhan` | Nếu xác định được ai xả; nếu không rõ, ghi `to_truc` hoặc `tap_the`. |
| VS06 | Bán trú lớp ăn trưa không vệ sinh | `tap_the` | Cả lớp bán trú cùng liên quan. |
| NN01–NN06 | Đồng phục, bảng tên, giày dép, tóc, khăn quàng, trang điểm | `ca_nhan` | Kiểm tra trực quan từng em, luôn xác định được ai. |
| KL01 | Tập trung giờ chào cờ: muộn, lộn xộn / tập thể | `tap_the` | Ghi rõ "/ tập thể" trong văn bản gốc. |
| KL02 | Lớp gây mất trật tự giờ chào cờ, TVAV / 1 tập thể | `tap_the` | Ghi rõ "/ 1 tập thể". |
| KL03–KL14 | Các vi phạm còn lại (ngủ gục, lối đi cấm, hút thuốc, điện thoại, vô lễ, đánh nhau...) | `ca_nhan` | Luôn xác định được học sinh cụ thể. |
| KL15 | Nhận cơm không đúng giờ quy định / tập thể | `tap_the` | Ghi rõ "/ tập thể". |

### Quy tắc tính điểm khi gặp `tap_the` hoặc `to_truc`

Vì mục tiêu của app là **điểm cá nhân từng học sinh** (khác với hệ xếp hạng thi đua giữa các lớp mà trường vẫn chạy song song), quy tắc đã chốt (theo lựa chọn của anh):

1. Khi phiếu ghi nhận có 1 sự kiện `tap_the`/`to_truc`, dòng đó được lưu vào `GhiNhan` với trạng thái **"Chờ xử lý"** (`trang_thai_xu_ly_tap_the = chua_xu_ly`) — **chưa trừ điểm ai** cho đến khi giáo viên quyết định.
2. Trên tổng quan giáo viên, mục "Sự kiện của lớp/tổ" liệt kê các sự kiện đang chờ xử lý, mỗi sự kiện có **3 nút thao tác nhanh** (xem chi tiết ở tài liệu 04, commit C021a):
   - **"Gán cho 1 học sinh cụ thể"** — chọn tên trong danh sách lớp/tổ, xác nhận → hệ thống tự tạo 1 bản ghi cá nhân mới (trừ điểm đúng học sinh đó).
   - **"Áp dụng cho tất cả"** — xác nhận 1 lần → hệ thống tự tạo bản ghi cá nhân cho **từng** học sinh trong lớp (nếu `pham_vi = tap_the`) hoặc trong tổ liên quan (nếu `pham_vi = to_truc`), mỗi em bị trừ đúng số điểm của mục đó.
   - **"Bỏ qua"** — đánh dấu đã xem xét nhưng không trừ điểm ai (ví dụ sự kiện không đáng kể).
3. Mỗi bản ghi cá nhân được tạo ra từ thao tác trên đều lưu vết `su_kien_goc` trỏ về sự kiện tập thể gốc — để sau này xem lại vẫn biết bản ghi đó xuất phát từ đâu, không phải giáo viên tự "bịa" thêm vi phạm.
4. Sau khi xử lý (gán/áp dụng/bỏ qua), sự kiện gốc chuyển trạng thái tương ứng và không còn hiện trong danh sách "chờ xử lý" nữa.

Cách này giữ được cả 2 lợi ích: **không trừ điểm oan tự động**, nhưng cũng **không để sự kiện tập thể bị lãng quên** — giáo viên xử lý nhanh bằng 1-2 lần bấm ngay trên điện thoại/laptop, không cần sửa tay trong Google Sheet.

### Nhóm HT — Học tập (không dùng danh mục trừ điểm, dùng công thức riêng)

Không có "danh mục vi phạm" cho học tập. Thay vào đó, điểm học tập được **tính từ điểm số thực tế** (`diem_so_mon`) ghi nhận mỗi tiết trong bảng `GhiNhan`, theo công thức ở mục 3.

## 2c. Quy trình ghi nhận vi phạm cá nhân và tự động trừ điểm

> **Bổ sung ngày 23/08/2026**: làm rõ luồng ghi nhận thực tế cho từng học sinh — áp dụng đúng cách tính điểm của nhà trường ở mục 1-2 (100 điểm khởi đầu, trừ theo danh mục), không tính tay.

Đây là luồng chính khi giáo viên/cờ đỏ/cán bộ lớp ghi nhận 1 học sinh vi phạm (vd đi học trễ, nghỉ học, sai đồng phục...) — chỉ áp dụng cho các mã có `pham_vi = ca_nhan` ở mục 2b; các mã `tap_the`/`to_truc` đi theo luồng riêng (xem lại mục 2b).

1. **Chọn học sinh + chọn mã vi phạm**: người ghi nhận chọn 1 học sinh cụ thể trong lớp, chọn 1 (hoặc nhiều) mã trong danh mục mục 2 (vd `CC01` – Đi học trễ, `CC02` – Nghỉ học, `NN02` – Không bảng tên, `KL09` – Vô lễ với giáo viên...).
2. **Hệ thống tự tra và trừ điểm**: dựa vào mã đã chọn, hệ thống tự lấy `nhom_danh_muc` (CC/VS/NN/KL) và `diem_tru` tương ứng từ `DanhMucDiem`, tạo 1 dòng mới trong `GhiNhan`: `ma_hs, ma_danh_muc, nhom_danh_muc, diem_cong_tru (âm), tuan, ngay_ghi_nhan, nguoi_ghi_nhan, ghi_chu (tuỳ chọn)`. Người ghi nhận **không tự gõ số điểm trừ** — luôn lấy từ danh mục để tránh sai lệch với quy chế trường.
3. **Cờ đỏ bị trừ gấp đôi tự động**: nếu học sinh có `la_co_do = true`, điểm trừ nhân đôi trước khi lưu, đúng lưu ý ở mục 2 (*"Đối với cờ đỏ khi vi phạm... sẽ bị trừ điểm gấp đôi"*).
4. **Không giới hạn số lần/tuần**: 1 học sinh đi trễ 3 lần trong tuần → 3 dòng `GhiNhan` mã `CC01` riêng biệt, điểm trừ cộng dồn. Đây cũng là dữ liệu nguồn cho cảnh báo "vi phạm lặp lại ≥ 3 lần" ở mục 8 và cho báo cáo lịch sử vi phạm (tài liệu 12).
5. **Cập nhật điểm ngay lập tức**: điểm thành phần (Chuyên cần/Vệ sinh/Nề nếp/Trật tự kỷ luật) của học sinh đó tính lại ngay theo công thức `diem_thanh_phan` ở mục 7 — không cần đợi cuối tuần, không tính tay.
6. **Ghi nhận nhiều mã cùng lúc**: nếu 1 lượt kiểm tra phát hiện học sinh vi phạm nhiều mã (vd vừa sai đồng phục vừa không bảng tên), giao diện cho chọn nhiều mã trong 1 thao tác, hệ thống tách thành nhiều dòng `GhiNhan` riêng (không gộp), để giữ vết từng mã.

**Ví dụ minh hoạ**: học sinh Nguyễn Văn A, tuần 03, bị ghi nhận đi học trễ 2 lần (`CC01`, −2/lần) và nghỉ học không phép 1 lần (`CC02`, −3). Hệ thống tạo 3 dòng `GhiNhan`. Tính điểm Chuyên cần: `100 + (−2) + (−2) + (−3) = 93`. Nếu A là cờ đỏ, mỗi mức trừ nhân đôi trước khi cộng: `100 + (−4) + (−4) + (−6) = 86`.

Nguyên tắc trừ điểm này áp dụng cho cả 4 nhóm CC/VS/NN/KL theo đúng mục 1 (100 điểm − tổng điểm trừ). Riêng nhóm HT (Học tập) **không** đi theo luồng ghi nhận vi phạm này — tính theo công thức riêng ở mục 3.

> **Quan trọng**: mỗi dòng `GhiNhan` tạo ở bước 2 **không chỉ trừ điểm cá nhân** — nó còn tự động trừ vào **điểm tập thể của lớp** (điểm thi đua của lớp 11C5 so với các lớp khác toàn trường), xem công thức ở mục 2d ngay bên dưới. 1 học sinh đi trễ vẫn là chuyện của em đó, nhưng đồng thời cũng làm lớp bị trừ đúng số điểm đó trong bảng xếp hạng thi đua tuần — giống hệt cách trường tính (đối chiếu với file Excel `THI_ĐUA_CS2_NH_26-27.xlsx`: mỗi vi phạm dù của 1 học sinh hay cả lớp đều gộp chung vào 1 điểm trừ duy nhất cho lớp).

## 2d. Điểm tập thể của lớp (khớp cách trường xếp hạng thi đua giữa các lớp)

> **Bổ sung ngày 23/08/2026**: theo yêu cầu của anh — vi phạm cá nhân phải trừ **cả điểm cá nhân lẫn điểm tập thể của lớp**, vì trường tính điểm thi đua giữa các lớp bằng cách cộng dồn TOÀN BỘ vi phạm xảy ra trong lớp đó (không phân biệt vi phạm của ai), đúng như cách file Excel thật của trường vận hành (mỗi lớp 1 dòng, 1 điểm tổng/nội dung).

**Nguyên tắc**: điểm tập thể của lớp cho mỗi nhóm (CC/VS/NN/KL) = 100 − tổng điểm trừ của **mọi** `GhiNhan` phát sinh trong lớp tuần đó ở nhóm đó — bất kể dòng đó là vi phạm cá nhân (`ca_nhan`) hay sự kiện tập thể/tổ trực (`tap_the`/`to_truc`).

**Tránh trừ 2 lần khi 1 sự kiện tập thể được "Áp dụng cho tất cả"** (mục 2b): khi 1 sự kiện `tap_the` được gán thành nhiều dòng cá nhân, các dòng cá nhân mới sinh ra đó có `su_kien_goc` trỏ về dòng gốc — chỉ dòng **gốc** (`su_kien_goc IS NULL`) mới được cộng vào điểm tập thể; các dòng cá nhân phái sinh (`su_kien_goc IS NOT NULL`) chỉ tính vào điểm cá nhân, không cộng thêm lần nữa vào điểm tập thể (nếu không sẽ bị trừ trùng: 1 sự kiện -10 gán cho 5 học sinh sẽ biến thành lớp bị trừ -50 thay vì đúng -10).

```
diem_tap_the(lop, nhom, tuan) =
    clamp( 100 + SUM(GhiNhan.diem_cong_tru
                      WHERE lop = lop_dang_xet
                      AND nhom_danh_muc = nhom        // CC | VS | NN | KL
                      AND tuan = tuan_dang_xet
                      AND su_kien_goc IS NULL          // chỉ tính sự kiện gốc, bỏ các dòng phái sinh từ mục 2b
                     ),
           min = 0, max = 100 )
```

Ví dụ tiếp nối phần trên: học sinh A (không cờ đỏ) đi trễ 2 lần (`CC01` × 2) + nghỉ 1 lần (`CC02`) trong tuần → điểm CC **cá nhân** của A = 93 (như mục 2c). Đồng thời, 3 dòng `GhiNhan` đó (đều là sự kiện gốc, `su_kien_goc IS NULL`) cũng cộng vào điểm CC **tập thể của lớp**: nếu không còn vi phạm CC nào khác trong lớp tuần đó, điểm CC của lớp = 100 − 2 − 2 − 3 = 93 (cộng thêm mọi vi phạm CC khác của các bạn cùng lớp nếu có).

**Phân biệt 2 trường hợp dễ nhầm — quan trọng khi code:**

| Trường hợp | Số dòng `GhiNhan` | Điểm cá nhân | Điểm tập thể lớp |
|---|---|---|---|
| **2 học sinh khác nhau, mỗi em tự đi trễ riêng** (2 sự kiện gốc độc lập, mỗi em 1 dòng `CC01`, `su_kien_goc IS NULL` cả 2) | 2 dòng | Mỗi em: 100 − 2 = **98** | Lớp: 100 − 2 − 2 = **96** (cộng dồn cả 2 sự kiện, không dedup vì đây là 2 sự kiện gốc khác nhau) |
| **1 sự kiện tập thể** (vd "cả lớp ồn giờ chào cờ", −10) **được "Áp dụng cho tất cả" cho 5 học sinh** (mục 2b) | 1 dòng gốc + 5 dòng phái sinh (`su_kien_goc` trỏ về dòng gốc) | Mỗi em trong 5 em: 100 − 10 = **90** | Lớp: 100 − 10 = **90** (chỉ trừ 1 lần theo dòng gốc, KHÔNG nhân theo 5 em, vì 5 dòng phái sinh có `su_kien_goc IS NOT NULL` nên bị loại khỏi tổng ở `diem_tap_the`) |

Quy tắc gốc: **mỗi sự kiện thật sự xảy ra chỉ trừ điểm lớp đúng 1 lần** — 2 học sinh đi trễ riêng biệt = 2 sự kiện thật = trừ lớp 2 lần (cộng dồn bình thường); còn 1 sự kiện tập thể dù sau đó gán cho bao nhiêu em vẫn chỉ là **1 sự kiện thật duy nhất** = trừ lớp đúng 1 lần.

### Xem chi tiết: điểm tập thể bị trừ là do vi phạm của những em nào

> **Bổ sung ngày 23/08/2026**: điểm tập thể không được hiển thị như 1 con số trơ — phải bấm vào xem được **ngay danh sách học sinh cụ thể** đứng sau con số đó, để giáo viên biết chính xác "lớp mất điểm tuần này là vì ai, vi phạm gì".

```
chi_tiet_diem_tap_the(lop, nhom, tuan) =
    LIST( GhiNhan.ma_hs, GhiNhan.ma_danh_muc, GhiNhan.diem_cong_tru, GhiNhan.ngay_ghi_nhan, GhiNhan.ghi_chu
          WHERE lop = lop_dang_xet
          AND nhom_danh_muc = nhom
          AND tuan = tuan_dang_xet
          AND su_kien_goc IS NULL )       // đúng tập hợp dòng đã cộng vào diem_tap_the ở trên
    // ma_hs có giá trị → JOIN HocSinh, hiển thị tên học sinh cụ thể
    // ma_hs = NULL → dòng này là sự kiện tap_the/to_truc còn "chờ xử lý" (mục 2b), hiển thị "Sự kiện tập thể — chưa gán học sinh" thay vì để trống
```

Ví dụ giao diện khi giáo viên bấm vào điểm CC của lớp (96/100 — trừ 4 điểm từ 2 sự kiện, đúng ví dụ 2 học sinh đi trễ riêng ở trên):

| Học sinh | Mã | Nội dung | Điểm trừ | Ngày |
|---|---|---|---|---|
| Nguyễn Văn A | CC01 | Đi học trễ | −2 | 25/08 |
| Trần Thị B | CC01 | Đi học trễ | −2 | 26/08 |

Nếu trong tuần còn có sự kiện tập thể chưa được gán cho ai, hiển thị riêng dòng đó, không để trống tên hoặc gán nhầm cho 1 em:

| Học sinh | Mã | Nội dung | Điểm trừ | Ngày |
|---|---|---|---|---|
| *(Sự kiện tập thể — chưa gán học sinh)* | KL01 | Tập trung giờ chào cờ lộn xộn | −10 | 24/08 |

Danh sách này chính là dữ liệu hiển thị khi giáo viên bấm vào từng thành phần điểm tập thể trên tổng quan lớp — trả lời trực tiếp "vì sao lớp mất điểm tuần này", không cần lục lại phiếu giấy.



> **Đã chốt ngày 23/08/2026**: Điểm học tập cấp lớp tạm để **mặc định = 100** (giống cách xử lý Điểm học tập cấp học sinh ở mục 3), cho đến khi có nguồn dữ liệu thật. Nhờ vậy có thể ráp ngay `diem_tap_the` vào công thức mục 4 để ra **Điểm xếp loại thi đua của lớp 11C5**, so sánh được với các lớp khác trong file Excel trường:

```
diem_hoc_tap_lop(lop, tuan) = 100   // mặc định, chưa có nguồn dữ liệu thật cho cấp lớp

diem_xep_loai_tap_the(lop, tuan) =
    ( diem_tap_the(CC) + diem_tap_the(VS) + diem_tap_the(NN)
      + diem_tap_the(KL) + diem_hoc_tap_lop × 2 ) ÷ 6
```

> Vì mặc định luôn là 100, con số này **chưa phản ánh đúng thực lực học tập của lớp** — chỉ dùng để lớp tự theo dõi tương đối tốt/xấu tuần này so với tuần khác về mặt nề nếp/kỷ luật, chưa nên dùng để so sánh tuyệt đối với điểm chính thức của trường (vì trường có dữ liệu Điểm học tập thật, còn app đang mặc định 100). Khi có nguồn dữ liệu thật cho Điểm học tập cấp lớp, chỉ cần sửa `diem_hoc_tap_lop` — không cần đổi công thức `diem_xep_loai_tap_the`.

## 3. Công thức tính Điểm học tập

> **Sửa ngày 23/08/2026**: bản trước nhân sẵn ×2 ở bước này, giả định thang 0–10 → 0–20. Đối chiếu với file Excel thật của trường (cột "ĐIỂM HỌC TẬP" luôn được điền giá trị **100** khi chưa có dữ liệu, không phải 20) cho thấy trường coi Điểm học tập là **thang 0–100 ngang hàng với 4 thành phần kia**. Bỏ phép nhân 2 ở bước này, dời sang mục 4 (đúng vị trí nhân 2 trong công thức Excel thật: `D6*2`).

```
Điểm học tập = Tổng điểm số các môn trong tuần ÷ Tổng số tiết trong tuần
```
(thang 0–100, mặc định = **100** khi tuần đó chưa có dữ liệu điểm số nào được ghi nhận)

> ⚠️ **Cần anh xác nhận với nhà trường**: "Tổng số tiết trong tuần" là **tổng số tiết theo thời khoá biểu cả tuần** (kể cả tiết không có điểm), hay chỉ tính **số tiết có ghi điểm số** trong tuần đó? Hai cách hiểu cho ra kết quả khác nhau. Em tạm triển khai theo cách 2 (chỉ tính tiết có điểm số ghi nhận) vì phù hợp với dữ liệu thực tế thu thập được qua phiếu giấy — nhưng đánh dấu `TODO` trong code để dễ sửa khi có xác nhận chính thức.
>
> ⚠️ **Vẫn chưa chắc chắn**: "điểm số các môn" ở đây là điểm học lực từng môn (thang 10, giống sổ điểm) hay điểm hạnh kiểm/thái độ mỗi tiết do GV bộ môn chấm qua sổ đầu bài (thang 100, giống cách chấm của 4 nội dung kia)? Theo quyết định tạm thời của anh (23/08/2026), code sẽ coi giá trị này nằm trên **thang 0–100** và mặc định = 100 khi chưa có dữ liệu — khớp với cách trường điền trong Excel thật. Nếu sau này trường xác nhận đây thực ra là điểm học lực thang 10, chỉ cần nhân giá trị `diem_so_mon` lên ×10 khi ghi vào `GhiNhan`, không cần sửa công thức tổng hợp.

## 4. Công thức tính Điểm xếp loại thi đua (tổng hợp)

> **Sửa ngày 23/08/2026**: khớp đúng công thức Excel thật của trường: `=ROUND((D×2+F+H+J+R)/6,2)` với D = Điểm học tập. Phép nhân 2 nằm ở bước này, không phải ở mục 3.

```
Điểm xếp loại thi đua = ( Điểm Chuyên cần + Điểm Vệ sinh + Điểm Nề nếp + Điểm Trật tự kỷ luật + Điểm học tập × 2 ) ÷ 6
```

Ghi chú cách hiểu công thức: 4 nội dung đầu (Chuyên cần, Vệ sinh, Nề nếp, Trật tự kỷ luật) mỗi nội dung có **trọng số 1**, riêng **Điểm học tập có trọng số 2** → tổng trọng số = 1+1+1+1+2 = **6**, khớp mẫu số. Vì cả 5 thành phần đều trên thang 0–100, một học sinh hoàn hảo tuyệt đối (không vi phạm gì + điểm học tập tối đa) đạt đúng **100/100** — đã verify bằng dữ liệu thật (lớp 9A21 tuần 01: (100×2+100+95+100+100)/6 = 99.17, rất gần trần 100 vì chỉ thiếu 5 điểm ở 1 mục).

**Ngoại lệ (giữ nguyên từ bản trước)**: nếu tuần đó **chưa có điểm số môn nào được ghi** (chưa có dữ liệu Điểm học tập), công thức trên sẽ tự động cộng Điểm học tập = 100 mặc định (theo quyết định 23/08/2026), nên **không** còn bị kéo điểm xuống giả tạo như cách hiểu cũ (0×2 → 66,67). Với mặc định 100, học sinh chưa có dữ liệu học tập tuần đó vẫn tính đủ `(CC+VS+NN+KL+100×2)/6` bình thường — không cần nhánh xử lý riêng cho trường hợp thiếu dữ liệu nữa. Vẫn nên hiển thị chú thích nhỏ trên giao diện: *"Điểm học tập: chưa có dữ liệu tuần này, đang tính mặc định 100"* để giáo viên biết đây là điểm mặc định chứ không phải điểm thật.

## 5. Ngưỡng xếp loại

> **Sửa ngày 23/08/2026**: bản trước tính theo trần 70 (sai, xem lịch sử ở mục 3-4). Trần thật là **100**, quay lại thang ngưỡng nguyên bản.

| Điểm xếp loại thi đua | Xếp loại | Hành động đề xuất |
|---|---|---|
| 90 – 100 | Tốt | Không cần can thiệp, có thể tuyên dương |
| 70 – 89 | Khá | Theo dõi bình thường |
| 50 – 69 | Trung bình | Giáo viên trao đổi riêng, nhắc nhở |
| Dưới 50 | Yếu | Cảnh báo trên giao diện, đề xuất mời phụ huynh |

> Bảng ngưỡng này vẫn là **ước lượng tạm** dựa trên thang điểm đã xác nhận đúng (0–100), nhưng các mốc cụ thể (90/70/50) chưa được Ban Thi đua Khen thưởng xác nhận chính thức — cần trao đổi thêm nếu muốn dùng để đánh giá học sinh nghiêm túc. (Lưu ý: đây trùng với ngưỡng phân loại 90/70/50 đã dùng ở tài liệu 13 — nên giữ nhất quán giữa 2 tài liệu nếu không có lý do khác biệt.)

## 6. Nhóm điểm cộng khích lệ

> **Đã xác nhận kích hoạt (12/07/2026)**: phiếu ghi nhận mới có hẳn cột "Nội dung thành tích" riêng — nghĩa là anh đã xác nhận muốn dùng nhóm này, không còn là tuỳ chọn nữa. Quy chế nhà trường không có nhóm này (chỉ có điểm trừ) — đây là phần **bổ sung riêng của lớp**, tách biệt hoàn toàn khỏi 4 nội dung chính thức để không làm sai lệch số liệu báo cáo lên trường.

| Mã | Tiêu chí | Điểm cộng (chỉ áp dụng nội bộ lớp) |
|---|---|---|
| KT01 | Phát biểu xây dựng bài | +1 |
| KT02 | Giúp đỡ bạn trong học tập | +2 |
| KT03 | Được tuyên dương trong tuần | +3 |
| KT04 | Hoàn thành tốt nhiệm vụ ban cán sự lớp | +2 |
| KT05 | Hành động tích cực hỗ trợ tập thể lớp (việc tốt không thuộc 4 mã trên) | +2 |

→ Hiển thị dưới dạng "Điểm khích lệ riêng của lớp" **tách biệt** trên hồ sơ học sinh, không cộng vào công thức xếp loại thi đua chính thức ở mục 4, để không làm lệch số liệu khi đối chiếu với trường. **Kích hoạt ngay ở Giai đoạn 1** (xem tài liệu 06, commit C058) — cần nạp đủ danh mục KT01–KT04 vào `DanhMucDiem` nếu chưa có.

## 7. Công thức tính (áp dụng ở `features/scoring`)

```
diem_thanh_phan(hoc_sinh, nhom, tuan) =
    clamp( 100 + SUM(GhiNhan.diem_cong_tru
                      WHERE ma_hs = hoc_sinh          // có gán cụ thể cho học sinh này
                      AND nhom_danh_muc = nhom         // CC | VS | NN | KL
                      AND tuan = tuan_dang_xet),
           min = 0, max = 100 )

diem_tap_the(lop, nhom, tuan) =
    clamp( 100 + SUM(GhiNhan.diem_cong_tru
                      WHERE lop = lop_dang_xet
                      AND nhom_danh_muc = nhom         // CC | VS | NN | KL
                      AND tuan = tuan_dang_xet
                      AND su_kien_goc IS NULL),         // chỉ tính sự kiện gốc — xem mục 2d
           min = 0, max = 100 )
```

> **Sửa ngày 23/08/2026**: bản trước lọc theo `DanhMucDiem.pham_vi = 'ca_nhan'` — sai, vì khi 1 sự kiện `tap_the`/`to_truc` được "Gán cho 1 học sinh cụ thể" (mục 2b), dòng phái sinh đó **có `ma_hs`** dù mã danh mục gốc vẫn là `tap_the`/`to_truc`. Lọc theo `pham_vi` sẽ bỏ sót những dòng này. Cách đúng: chỉ cần lọc `WHERE ma_hs = hoc_sinh` — dòng nào chưa được gán cho ai thì `ma_hs` là `NULL` nên tự động không lọt vào, không cần điều kiện `pham_vi` nữa.
>
> Các dòng `tap_the`/`to_truc` **đang chờ xử lý** (chưa gán `ma_hs`) không tham gia `diem_thanh_phan` của bất kỳ học sinh nào, nhưng **vẫn tham gia `diem_tap_the`** ngay khi ghi nhận (xem mục 2d) — điểm cá nhân và điểm tập thể cập nhật độc lập nhau, đúng quy tắc ở mục 2b/2d.

```
diem_hoc_tap(hoc_sinh, tuan) =
    NEU co_du_lieu_hoc_tap(hoc_sinh, tuan):     // có ít nhất 1 dòng diem_so_mon trong tuần
        SUM(GhiNhan.diem_so_mon WHERE ma_hs = hoc_sinh AND tuan = tuan_dang_xet)
        ÷ COUNT(GhiNhan.diem_so_mon WHERE ma_hs = hoc_sinh AND tuan = tuan_dang_xet)
        // thang 0-100, KHÔNG nhân 2 ở đây (xem mục 3)
    NGUOC LAI:
        100   // mặc định khi chưa có dữ liệu tuần đó (quyết định 23/08/2026)

diem_xep_loai_thi_dua(hoc_sinh, tuan) =
    ( diem_thanh_phan(CC) + diem_thanh_phan(VS) + diem_thanh_phan(NN)
      + diem_thanh_phan(KL) + diem_hoc_tap × 2 ) ÷ 6
    // nhân 2 ở đây, khớp công thức Excel thật: (D×2+F+H+J+R)/6

diem_hoc_tap_lop(lop, tuan) =
    100   // mặc định — xem mục 2d, chưa có nguồn dữ liệu Điểm học tập cấp lớp

diem_xep_loai_tap_the(lop, tuan) =
    ( diem_tap_the(CC) + diem_tap_the(VS) + diem_tap_the(NN)
      + diem_tap_the(KL) + diem_hoc_tap_lop × 2 ) ÷ 6
```

> **Sửa ngày 23/08/2026 (thay thế bản sửa lỗi cũ ở đây)**: bản trước có nhánh riêng "chia 4 nếu chưa có dữ liệu học tập" để tránh điểm 0 kéo tổng xuống giả tạo. Với việc chốt mặc định Điểm học tập = 100 khi thiếu dữ liệu, nhánh riêng này **không còn cần thiết** — công thức `/6` chạy bình thường cho mọi trường hợp, không cần rẽ nhánh chia 4/chia 6 nữa. Đơn giản hoá code, giảm rủi ro bug loại "quên nhánh nào đó" như từng gặp ở C031.

Vi phạm nhóm KL nghiêm trọng (KL06, KL09, KL11, KL12, KL13 — mức trừ 20 điểm) luôn kèm cờ `can_canh_bao_ngay = true`, hiển thị cảnh báo ngay trên giao diện giáo viên bất kể tổng điểm tuần còn cao, đúng tinh thần "không chờ tổng kết tuần mới xử lý".

## 8. Gợi ý xử lý sư phạm cơ bản (rule-based, Giai đoạn 1)

| Điều kiện | Gợi ý hiển thị cho giáo viên |
|---|---|
| Bất kỳ thành phần nào < 50 điểm | "Nên trao đổi riêng với học sinh và mời phụ huynh trong tuần." |
| Vi phạm cùng một mã ≥ 3 lần trong tuần | "Vi phạm lặp lại — cân nhắc hình thức xử lý cao hơn hoặc tìm hiểu nguyên nhân gốc." |
| Có bản ghi mức trừ 20 điểm (KL06/KL09/KL11/KL12/KL13) | "Vi phạm nghiêm trọng — xử lý ngay theo quy chế nhà trường." |
| Điểm xếp loại thi đua tuần này thấp hơn tuần trước ≥ 15 điểm | "Học sinh có dấu hiệu đi xuống rõ rệt — nên tìm hiểu sớm." |
| Không có vi phạm nào 2 tuần liên tiếp | "Có thể tuyên dương làm gương." |

## Việc cần làm ngay (cập nhật 23/08/2026)

1. Trao đổi với Ban Thi đua Khen thưởng: "Tổng số tiết trong tuần" ở mục 3 tính cả tiết không điểm hay chỉ tiết có điểm? (chưa xác nhận, đang tạm code theo cách 2)
2. Trao đổi với Ban Thi đua Khen thưởng: "điểm số các môn" là điểm học lực (thang 10) hay điểm hạnh kiểm/thái độ mỗi tiết (thang 100)? (đang tạm coi thang 100, mặc định 100 khi thiếu dữ liệu, theo quyết định của anh)
3. Khi trường có dữ liệu Điểm học tập thật (không còn toàn 100) ở các tuần sau, đối chiếu lại công thức mục 3 một lần nữa để chắc chắn không còn hiểu sai thang điểm.
4. Điểm học tập cấp lớp (`diem_hoc_tap_lop`, mục 2d/7) hiện mặc định cố định 100, chưa có nguồn dữ liệu thật — cần quyết định sau: lấy trung bình cộng Điểm học tập của 36 học sinh, hay 1 nguồn riêng do GV bộ môn chấm chung cho cả lớp.
