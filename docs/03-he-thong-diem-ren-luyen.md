# 03 — Hệ thống điểm thi đua (theo đúng quy chế nhà trường)

> **Cập nhật quan trọng**: Bản này thay thế hoàn toàn bản đề xuất tự do trước đó. Toàn bộ nội dung dưới đây được lấy trực tiếp từ file **"NỘI DUNG ĐÁNH GIÁ, XẾP LOẠI THI ĐUA (HÀNG TUẦN)"** do **Ban Thi đua Khen thưởng — Trường THCS và THPT Lạc Hồng** ban hành, anh cung cấp ngày 11/07/2026. Đây là quy chế thật, có hiệu lực, nên được dùng làm chuẩn duy nhất cho việc trừ/tính điểm — không dùng bảng điểm tự đề xuất trước đây nữa.

## 1. Cấu trúc điểm tổng quát

> **Đã xác nhận với giáo viên (11/07/2026)**: hệ thống điểm này tính **theo tuần**, đúng nguyên văn quy chế thi đua thật của trường — không đổi sang điểm luỹ kế cả năm. Mỗi tuần các thành phần đều reset về 100. Nếu sau này cần thêm 1 lớp điểm luỹ kế cả năm cho mục đích cảnh báo riêng của giáo viên, đây sẽ là 1 hệ thống **bổ sung tách biệt**, không thay thế hệ thống theo tuần này.

Khác với bản đề xuất ban đầu (1 cột điểm rèn luyện duy nhất), quy chế thật của trường có **5 thành phần điểm riêng biệt mỗi tuần**:

| Thành phần | Điểm khởi đầu | Cách tính |
|---|---|---|
| 1. Chuyên cần | 100 | 100 − tổng điểm trừ trong tuần |
| 2. Vệ sinh | 100 | 100 − tổng điểm trừ trong tuần |
| 3. Nề nếp, tác phong | 100 | 100 − tổng điểm trừ trong tuần |
| 4. Trật tự, kỷ luật | 100 | 100 − tổng điểm trừ trong tuần |
| 5. Học tập | tính riêng | `(Tổng điểm số các môn trong tuần ÷ Tổng số tiết trong tuần) × 2` |

Sau đó tổng hợp thành **Điểm xếp loại thi đua** (công thức ở mục 4).

Mỗi học sinh vẫn "bắt đầu tuần với 100 điểm" đúng như anh mô tả — nhưng áp dụng **riêng cho từng thành phần 1–4**, không phải một con số 100 duy nhất.

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

## 3. Công thức tính Điểm học tập

```
Điểm học tập = ( Tổng điểm số các môn trong tuần ÷ Tổng số tiết trong tuần ) × 2
```

> ⚠️ **Cần anh xác nhận với nhà trường**: "Tổng số tiết trong tuần" là **tổng số tiết theo thời khoá biểu cả tuần** (kể cả tiết không có điểm), hay chỉ tính **số tiết có ghi điểm số** trong tuần đó? Hai cách hiểu cho ra kết quả khác nhau. Em tạm triển khai theo cách 2 (chỉ tính tiết có điểm số ghi nhận) vì phù hợp với dữ liệu thực tế thu thập được qua phiếu giấy — nhưng đánh dấu `TODO` trong code để dễ sửa khi có xác nhận chính thức.

## 4. Công thức tính Điểm xếp loại thi đua (tổng hợp)

```
Điểm xếp loại thi đua = ( Điểm Chuyên cần + Điểm Vệ sinh + Điểm Nề nếp + Điểm Trật tự kỷ luật + Điểm học tập ) ÷ 6
```

**Ngoại lệ (sửa sau khi chạy thật)**: nếu tuần đó **chưa có điểm số môn nào được ghi** (chưa có dữ liệu Điểm học tập), công thức trên sẽ tự động cộng "0" vào, khiến điểm bị kéo xuống giả tạo (400÷6 = 66,67 cho học sinh chưa hề vi phạm gì). Khi đó chỉ tính trung bình 4 nội dung đầu: `(CC+VS+NN+KL) ÷ 4`, và hiển thị "Điểm học tập: chưa có dữ liệu" thay vì 0.

Ghi chú cách hiểu công thức (suy ra từ văn bản gốc, vì văn bản ghi "chia 6" nhưng tiêu đề nói "bình quân của 5 nội dung"): 4 nội dung đầu (Chuyên cần, Vệ sinh, Nề nếp, Trật tự kỷ luật) mỗi nội dung có **trọng số 1**, riêng **Điểm học tập có trọng số 2** (vì đã được nhân 2 sẵn trong công thức ở mục 3) → tổng trọng số = 1+1+1+1+2 = **6**, khớp với mẫu số trong công thức xếp loại. Đây là cách hiểu hợp lý nhất để code đúng; nếu nhà trường xác nhận khác, chỉ cần sửa hằng số `6` này ở một chỗ duy nhất trong code.

## 5. Ngưỡng xếp loại

> ⚠️ **Phát hiện quan trọng khi kiểm thử bằng dữ liệu thật (11/07/2026)**: theo đúng công thức gốc ở mục 4, **điểm xếp loại thi đua tối đa mà một học sinh hoàn hảo tuyệt đối (không vi phạm gì + điểm 10 tất cả các môn) có thể đạt được chỉ là 70/100**, không phải 100 — vì "Điểm học tập" trong công thức nằm trên thang 0–20 (điểm trung bình thang 10 × 2), trong khi 4 thành phần còn lại trên thang 0–100, rồi cộng chung chia 6. Ngưỡng bên dưới ban đầu giả định thang điểm 0–100 đạt được trong thực tế — **điều này sai**, cần điều chỉnh lại. Bảng dưới đã được tính lại theo tỷ lệ so với mức tối đa thực tế ~70, nhưng vẫn là **ước lượng tạm**, cần xác nhận chính thức với Ban Thi đua Khen thưởng của trường trước khi dùng để đánh giá học sinh nghiêm túc.

| Điểm xếp loại thi đua | Xếp loại (tạm điều chỉnh theo mức tối đa thực tế ~70) | Hành động đề xuất |
|---|---|---|
| 60 – 70 | Tốt | Không cần can thiệp, có thể tuyên dương |
| 45 – 59 | Khá | Theo dõi bình thường |
| 30 – 44 | Trung bình | Giáo viên trao đổi riêng, nhắc nhở |
| Dưới 30 | Yếu | Cảnh báo trên giao diện, đề xuất mời phụ huynh |

> **Lưu ý riêng cho trường hợp chưa có dữ liệu học tập** (theo C031): khi đó công thức chỉ chia 4 thành phần (không có "trần 70"), nên 1 học sinh không vi phạm gì nhưng CHƯA CÓ điểm học tập sẽ hiện đúng **100**, cao hơn hẳn 1 học sinh cũng không vi phạm gì nhưng ĐÃ có điểm học tập đầy đủ (tối đa ~70). Đây là hệ quả trực tiếp của công thức gốc, không phải lỗi — nhưng dễ gây hiểu lầm khi so sánh 2 học sinh với nhau. Nên hiển thị rõ trên giao diện: *"Điểm xếp loại chỉ so sánh được giữa các học sinh có cùng trạng thái đã/chưa có điểm học tập trong tuần."*

### Vì sao trường lại thiết kế công thức như vậy? (không chắc chắn, chỉ là suy luận hợp lý)

Tên gọi chính xác trong văn bản gốc là **"XẾP THI ĐUA theo điểm bình quân"** — chữ "xếp" gợi ý đây là điểm dùng để **xếp hạng tương đối** (so lớp/tuần này với lớp/tuần khác), không phải điểm chất lượng tuyệt đối kiểu "học lực/hạnh kiểm" cần đạt mốc cố định. Với mục đích xếp hạng tương đối, mức trần thực tế không cần chạm 100 — chỉ cần nhất quán cho mọi người là đủ để so sánh công bằng.

Cách chia trọng số (4 mảng Chuyên cần/Vệ sinh/Nề nếp/Kỷ luật chiếm 4/6 ≈ 67%, Học tập chỉ 2/6 ≈ 33%) cũng khá khớp với việc hệ "thi đua tuần" này thường do **đội cờ đỏ** (đội giám sát nề nếp) chấm, nên thiên về đánh giá kỷ luật/nề nếp là chính, điểm học tập chỉ mang tính khích lệ thêm, không phải trọng tâm.

**Tuy nhiên không loại trừ khả năng đây là sơ suất khi soạn thảo** (nhân đôi cho "có trọng số hơn" mà không tính kỹ hệ quả nén thang điểm) — không có cách nào khẳng định chắc chắn ý đồ thật từ 1 văn bản hành chính. **Cách xử lý đúng đắn nhất: hỏi thẳng Ban Thi đua Khen thưởng của trường** câu hỏi cụ thể ở mục README "việc cần làm ngay", thay vì tự suy đoán mãi.

## 6. (Tuỳ chọn — KHÔNG có trong quy chế trường) Nhóm điểm cộng khích lệ

Quy chế nhà trường chỉ có điểm trừ, không có điểm cộng. Nếu anh muốn bổ sung tính khích lệ (không bắt buộc, không thuộc hệ thống chính thức của trường, chỉ hiển thị thêm cho riêng lớp chủ nhiệm), có thể thêm nhóm `KT` riêng, tách biệt hoàn toàn khỏi 4 nội dung chính thức để không làm sai lệch số liệu báo cáo lên trường:

| Mã | Tiêu chí | Điểm cộng (chỉ áp dụng nội bộ lớp) |
|---|---|---|
| KT01 | Phát biểu xây dựng bài | +1 |
| KT02 | Giúp đỡ bạn trong học tập | +2 |
| KT03 | Được tuyên dương trong tuần | +3 |
| KT04 | Hoàn thành tốt nhiệm vụ ban cán sự lớp | +2 |
| KT05 | Có hành động tích cực hỗ trợ tập thể lớp | +2 |

→ Đã bật theo C058: hiển thị/lưu dưới dạng "Điểm khích lệ riêng của lớp" **tách biệt**, không cộng vào công thức xếp loại thi đua chính thức ở mục 4, để không làm lệch số liệu khi đối chiếu với trường.

## 7. Công thức tính (áp dụng ở `features/scoring`)

```
diem_thanh_phan(hoc_sinh, nhom, tuan) =
    clamp( 100 + SUM(GhiNhan.diem_cong_tru
                      WHERE ma_hs = hoc_sinh
                      AND nhom_danh_muc = nhom   // CC | VS | NN | KL
                      AND DanhMucDiem.pham_vi = 'ca_nhan'   // bỏ qua tap_the/to_truc, xem mục 2b
                      AND tuan = tuan_dang_xet),
           min = 0, max = 100 )
```

> Các dòng `pham_vi = tap_the` hoặc `to_truc` **không tham gia** công thức trên (mặc định) — chúng vẫn được lưu đầy đủ trong `GhiNhan` và hiển thị trên tổng quan giáo viên như "Sự kiện của lớp/tổ", nhưng không cộng dồn vào điểm cá nhân của học sinh nào, đúng quy tắc ở mục 2b.

```diem_hoc_tap(hoc_sinh, tuan) =
    ( SUM(GhiNhan.diem_so_mon WHERE ma_hs = hoc_sinh AND tuan = tuan_dang_xet)
      ÷ COUNT(GhiNhan.diem_so_mon WHERE ma_hs = hoc_sinh AND tuan = tuan_dang_xet) )
    × 2

diem_xep_loai_thi_dua(hoc_sinh, tuan) =
    NEU co_du_lieu_hoc_tap(hoc_sinh, tuan):     // có ít nhất 1 dòng diem_so_mon trong tuần
        ( diem_thanh_phan(CC) + diem_thanh_phan(VS) + diem_thanh_phan(NN)
          + diem_thanh_phan(KL) + diem_hoc_tap ) ÷ 6
    NGUOC LAI (chưa có tiết nào ghi điểm số trong tuần):
        ( diem_thanh_phan(CC) + diem_thanh_phan(VS) + diem_thanh_phan(NN)
          + diem_thanh_phan(KL) ) ÷ 4
        // hiển thị "Điểm học tập: chưa có dữ liệu" thay vì số 0
```

> **Sửa lỗi quan trọng (phát hiện khi chạy thật)**: bản công thức trước luôn chia cho 6 kể cả khi `diem_hoc_tap = 0` do chưa có điểm số nào được ghi — khiến MỌI học sinh mặc định hiện **66,67 điểm** dù chưa hề có vi phạm gì (100+100+100+100+0=400, 400÷6=66,67), gây hiểu lầm nghiêm trọng. Bản sửa: khi tuần đó chưa có dữ liệu điểm học tập, chỉ tính trung bình 4 thành phần còn lại (chia 4), và hiển thị rõ "chưa có dữ liệu" thay vì coi là 0. Xem commit sửa ở tài liệu 06, mục C031.

Vi phạm nhóm KL nghiêm trọng (KL06, KL09, KL11, KL12, KL13 — mức trừ 20 điểm) luôn kèm cờ `can_canh_bao_ngay = true`, hiển thị cảnh báo ngay trên giao diện giáo viên bất kể tổng điểm tuần còn cao, đúng tinh thần "không chờ tổng kết tuần mới xử lý".

## 8. Gợi ý xử lý sư phạm cơ bản (rule-based, Giai đoạn 1)

| Điều kiện | Gợi ý hiển thị cho giáo viên |
|---|---|
| Bất kỳ thành phần nào < 50 điểm | "Nên trao đổi riêng với học sinh và mời phụ huynh trong tuần." |
| Vi phạm cùng một mã ≥ 3 lần trong tuần | "Vi phạm lặp lại — cân nhắc hình thức xử lý cao hơn hoặc tìm hiểu nguyên nhân gốc." |
| Có bản ghi mức trừ 20 điểm (KL06/KL09/KL11/KL12/KL13) | "Vi phạm nghiêm trọng — xử lý ngay theo quy chế nhà trường." |
| Điểm xếp loại thi đua tuần này thấp hơn tuần trước ≥ 15 điểm | "Học sinh có dấu hiệu đi xuống rõ rệt — nên tìm hiểu sớm." |
| Không có vi phạm nào 2 tuần liên tiếp | "Có thể tuyên dương làm gương." |
