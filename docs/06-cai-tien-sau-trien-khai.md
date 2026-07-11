# 06 — Cải tiến sau triển khai (Living Document)

> **Cách dùng file này**: Đây là nơi duy nhất tổng hợp các commit phát sinh **sau khi Giai đoạn 1 đã chạy xong** (từ vòng 1, PROGRESS.md ngày 11/07/2026), được phát hiện qua quá trình anh dùng thử app và trao đổi ở đây (Claude web chat). Mỗi khi phát hiện vấn đề mới trong lúc bàn luận, em sẽ thêm 1 commit mới vào **cuối** file này — không sửa lại tài liệu 04 gốc (giữ nguyên làm hồ sơ lịch sử của kế hoạch ban đầu).
>
> **Quy trình dùng**: Sau mỗi lần cập nhật, anh copy **toàn bộ file này** dán vào Claude Code/Cursor, nói: *"Đọc file 05-quy-tac-ai-agent.md, sau đó thực hiện các commit trong file 06-cai-tien-sau-trien-khai.md có trạng thái Chưa làm trong PROGRESS.md"*. AI thực thi xong thì cập nhật `PROGRESS.md` như quy trình cũ.
>
> Đánh số tiếp nối từ tài liệu 04 (C001–C027 + C021a = 28 commit), bắt đầu từ **C028**.

---

## Đợt phát hiện #1 — sau khi kiểm tra app chạy thật lần đầu (11/07/2026)

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C028 | `[C028] fix(security): thêm mã bí mật cho Apps Script doPost` | Vì deploy Web App ở chế độ "Bất kỳ ai" (Anyone) để frontend gọi được, ai có URL cũng gọi `doPost` ghi được dữ liệu. Thêm 1 chuỗi bí mật cố định gửi kèm mỗi request ghi từ frontend (header hoặc field riêng); `Code.gs` kiểm tra khớp mới cho ghi, sai thì từ chối. | Gọi `doPost` thiếu hoặc sai mã bí mật → bị từ chối, Sheet không đổi. Gọi từ web app thật (có đúng mã) → ghi bình thường như cũ. |
| C029 | `[C029] docs: chốt và ghi lại cấu hình deploy Apps Script đúng chuẩn` | Nguyên nhân gốc khiến vòng 1 không hiển thị dữ liệu: deploy sai chế độ quyền truy cập. Ghi rõ vào README/hướng dẫn vận hành: **Thực thi với tư cách = Tôi**, **Ai có quyền truy cập = Bất kỳ ai**; cách deploy lại giữ nguyên URL (Quản lý triển khai, không tạo Triển khai mới). | Có 1 mục riêng, dễ tìm trong README, để lần sau không lặp lại lỗi này khi cần deploy lại. |
| C030 | `[C030] feat(students): danh sách học sinh có hiệu ứng thu gọn/mở rộng khi bấm, kèm nút xem hồ sơ đầy đủ và copy link` | **Đã xác nhận**: bấm tên học sinh hiện tại không dẫn đi đâu — sửa lại. Thiết kế: bấm vào 1 dòng học sinh → dòng đó **mở rộng ngay tại chỗ** (accordion), hiện nhanh 4 điểm thành phần + tổ + vai trò cán sự (nếu có) + số vi phạm gần đây, không rời trang. Bấm lại → thu gọn về như cũ. Trong phần mở rộng có 2 nút riêng: **"Xem hồ sơ đầy đủ"** (mở trang `/#/hs/<token>` — giáo viên xem chi tiết) và **"Copy link hồ sơ"** (copy URL vào clipboard — dùng để gửi cho học sinh). | Bấm 1 dòng → mở rộng đúng hiệu ứng, hiện đủ thông tin nhanh; bấm lại → thu gọn. Nút "Xem hồ sơ đầy đủ" mở đúng trang hồ sơ. Nút "Copy link" dán (Ctrl+V) ra đúng URL của đúng em đó. |

### Đã xác nhận

Bấm vào tên học sinh hiện tại **không** dẫn sang trang hồ sơ — C030 đã cập nhật theo đúng thực tế này (không cần hỏi lại).

---

## Đợt phát hiện #2 — sau khi dùng thử số liệu thật (11/07/2026)

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C031 | `[C031] fix(scoring): xử lý đúng trường hợp chưa có dữ liệu Điểm học tập` | **Lỗi phát hiện**: học sinh chưa có vi phạm/điểm số nào vẫn hiện điểm tổng hợp = 66,67 (do công thức cộng Điểm học tập = 0 rồi vẫn chia 6). Sửa theo tài liệu 03 mục 4 (đã cập nhật): nếu tuần chưa có `diem_so_mon` nào được ghi, chỉ tính trung bình 4 thành phần (CC+VS+NN+KL)÷4, hiển thị "Điểm học tập: chưa có dữ liệu" thay vì 0. | Học sinh chưa có ghi nhận gì → điểm tổng hợp hiển thị đúng **100**, không phải 66,67. Học sinh đã có ít nhất 1 điểm số môn → tính đủ công thức 6 phần như cũ. |
| C032 | `[C032] feat(data+ui): thêm & hiển thị trường "Tổ" cho mọi học sinh` | **Lỗi phát hiện**: giao diện chưa hiển thị thông tin tổ. Nguyên nhân: schema cũ chỉ lưu `to` cho Tổ trưởng trong `BanCanSu`, học sinh thường không có. Đã sửa tài liệu 02: thêm cột `to` vào tab `HocSinh` cho **mọi** học sinh. Hiển thị số tổ trên (a) hồ sơ học sinh cạnh vai trò cán sự, (b) danh sách học sinh của giáo viên (cột/badge nhỏ). | Mở hồ sơ 1 học sinh đã có `to` trong Sheet → hiển thị đúng "Tổ 2"; danh sách giáo viên cũng thấy cột/badge tổ tương ứng. |
| C033 | `[C033] feat(dashboard): thêm khu vực "Nhật ký theo ngày" trên tổng quan giáo viên` | Bổ sung 1 khu vực riêng trên dashboard (khác với danh sách học sinh sắp theo điểm ở C021): liệt kê **theo từng ngày** trong tuần hiện tại (dựa theo `CauHinhTuan`), tổng số ghi nhận ngày đó chia theo loại. **Ngày chưa có ghi nhận nào vẫn phải hiện rõ dòng "Chưa có ghi nhận"** — không ẩn đi, không để trống mơ hồ. Bấm vào 1 ngày → mở chi tiết danh sách ghi nhận ngày đó. | Dashboard hiện đủ các ngày trong tuần kể cả ngày trống; bấm vào ngày có dữ liệu → đúng danh sách ghi nhận hôm đó. |
| C034 | `[C034] feat(backend): tự động khớp họ tên trên phiếu với ma_hs khi import` | Cập nhật xử lý import (C013/C016): JSON gửi lên dùng `ho_ten` (tên trên phiếu) thay vì bắt buộc biết sẵn `ma_hs`. Backend so khớp `ho_ten` với tab `HocSinh` (khớp chính xác họ+tên) → tự điền `ma_hs`. Nếu không khớp được hoặc trùng nhiều học sinh cùng tên → **không ghi** dòng đó vào `GhiNhan`, liệt kê rõ trong `NhatKyImport.ghi_chu`, đánh dấu `trang_thai = loi_mot_phan`, các dòng khớp đúng vẫn ghi bình thường. | Import 1 file có 1 tên đúng + 1 tên sai chính tả → dòng đúng vào `GhiNhan`, dòng sai bị từ chối và liệt kê rõ lý do trong log, không làm hỏng cả lần import. |
| C035 | `[C035] docs: thêm mẫu JSON và prompt chuyển đổi phiếu → JSON vào repo` | Đưa 2 file đã tạo sẵn — `du-lieu-mau/mau-import-ghinhan.json` (mẫu cấu trúc, có ví dụ đủ 5 tình huống: cá nhân theo tiết, điểm học tập, nề nếp, tập thể, tổ trực) và `du-lieu-mau/mau-prompt-chuyen-doi-json.md` (đoạn prompt copy-dán cho AI kèm ảnh phiếu) — vào đúng vị trí trong repo, liên kết trong README hướng dẫn sử dụng. | Anh làm đúng theo hướng dẫn trong `mau-prompt-chuyen-doi-json.md`: dán ảnh phiếu + prompt cho AI → nhận JSON đúng cấu trúc → import thành công qua màn hình Import. |

> **Lưu ý phụ thuộc**: C034 cần làm **trước hoặc cùng lúc** với việc anh bắt đầu dùng `mau-prompt-chuyen-doi-json.md` (C035) — vì prompt mẫu dựa trên việc hệ thống tự khớp `ho_ten`, nếu C034 chưa xong thì phải tự tra `ma_hs` thủ công trước khi import.

---

## Đợt phát hiện #3 — cần dữ liệu giả để xem giao diện + xoá chủ động (11/07/2026)

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C036 | `[C036] feat(import): xoá dữ liệu theo từng lần import (hoàn tác)` | Thêm khu vực "Lịch sử import" trong màn hình Import (C016), liệt kê các lần import gần đây đọc từ `NhatKyImport`. Mỗi dòng có nút **"Xoá dữ liệu của lần này"** — bấm vào có hộp xác nhận, gửi yêu cầu xoá lên Apps Script (`doPost` với hành động riêng, có kiểm tra mã bí mật như C028); Apps Script xoá toàn bộ dòng `GhiNhan` có `ma_log_import` khớp đúng lần đó, cập nhật dòng `NhatKyImport` sang `trang_thai = da_xoa` (giữ lại dòng log để biết đã từng có/đã xoá, không xoá luôn cả log — đúng nguyên tắc không phá dấu vết ở tài liệu 01 mục 7). | Import 1 file test → dữ liệu hiện đầy đủ trên toàn bộ giao diện → bấm "Xoá dữ liệu của lần này" ở đúng lần import đó → toàn bộ các dòng liên quan biến mất khỏi mọi màn hình (hồ sơ học sinh, dashboard, nhật ký theo ngày); các lần import khác (nếu có) không bị ảnh hưởng. |

> **Không chỉ dùng cho dữ liệu test**: tính năng này tổng quát — dùng lại được cả khi lỡ import nhầm dữ liệu thật sau này, không cần sửa tay trong Sheet.

---

## Đợt phát hiện #4 — dashboard/hồ sơ trống vì thiếu bộ chọn tuần (11/07/2026)

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C037 | `[C037] feat(ui): thêm bộ chọn tuần dùng chung cho Dashboard, Hồ sơ học sinh, Nhật ký theo ngày` | **Lỗi phát hiện**: các màn hình chỉ hiển thị dữ liệu của "tuần hiện tại" tính theo ngày thật của máy/trình duyệt so với `CauHinhTuan` — nếu ngày thật không khớp đúng tuần nào đã cấu hình (ví dụ đang test dữ liệu Tuần 2 nhưng ngày thật không nằm trong 13–17/07), toàn bộ màn hình trống, không có cách nào chủ động xem tuần khác. Thêm 1 component chọn tuần dùng chung (dropdown liệt kê tất cả tuần trong `CauHinhTuan`, hiển thị dạng "Tuần 2 (13/07 – 17/07)"), đặt ở Dashboard, Hồ sơ học sinh (phần điểm số theo tuần), và Nhật ký theo ngày. Mặc định chọn: nếu ngày hôm nay khớp đúng 1 tuần đã cấu hình thì chọn tuần đó; nếu không khớp tuần nào, chọn **tuần gần nhất đã qua** (tuần có `tu_ngay` lớn nhất mà vẫn ≤ hôm nay); nếu hôm nay còn trước cả tuần đầu tiên, mặc định chọn tuần đầu tiên — **không được để trống/không chọn gì**. | Mở Dashboard không cần đổi ngày máy vẫn thấy mặc định chọn đúng 1 tuần có dữ liệu (không trống trơn); đổi dropdown sang tuần khác → toàn bộ số liệu (điểm, nhật ký theo ngày, lịch sử hồ sơ) cập nhật đúng theo tuần được chọn. |
| C038 | `[C038] feat(ui): mặc định hiển thị TOÀN BỘ lịch sử ghi nhận trên hồ sơ học sinh, tuần chỉ là bộ lọc tuỳ chọn` | Tách riêng 2 khái niệm đang bị gộp nhầm: **"lịch sử ghi nhận"** (nên mặc định hiện tất cả, không phụ thuộc tuần nào) và **"điểm số/xếp loại"** (bắt buộc phải theo đúng 1 tuần cụ thể, dùng bộ chọn ở C037). Trang hồ sơ học sinh: phần lịch sử ghi nhận mặc định hiện toàn bộ (mới nhất trước), có nút lọc theo tuần nếu muốn thu hẹp — không còn bị ẩn hết chỉ vì tuần hiện tại không khớp. | Mở hồ sơ 1 học sinh có dữ liệu ở Tuần 2, dù bộ chọn điểm số đang để tuần khác, phần "lịch sử ghi nhận" vẫn hiện đủ toàn bộ các dòng của học sinh đó. |
| C039 | `[C039] fix(backend): tự động tính tuan_so khi import + vá lại dữ liệu cũ đang trống` | **Nguyên nhân gốc đã xác nhận** (anh kiểm tra trực tiếp trong Sheet: cột `tuan_so` của 21 dòng vừa import đang **trống**): khâu import (C034) ghi dữ liệu vào `GhiNhan` nhưng chưa tự tính `tuan_so` từ `ngay`. Sửa 2 phần: **(a) Sửa tới (forward)** — trong Apps Script xử lý import, với mỗi dòng, so `ngay` với khoảng `tu_ngay`–`den_ngay` của từng dòng trong `CauHinhTuan`, tìm đúng tuần rồi điền vào `tuan_so`; nếu `ngay` không rơi vào tuần nào đã cấu hình, vẫn ghi dòng đó nhưng để `tuan_so` trống và liệt kê cảnh báo riêng trong `NhatKyImport.ghi_chu` (để giáo viên biết cần thêm tuần mới). **(b) Vá dữ liệu cũ (backfill)** — viết 1 hàm chạy 1 lần trong Apps Script Editor (như `SetupSheet.gs`/`SeedData.gs`, không phải web app), tên gợi ý `vaLaiTuanSoChoGhiNhan()`: quét toàn bộ `GhiNhan`, dòng nào có `tuan_so` trống thì tính lại từ `ngay` theo đúng logic ở (a) rồi điền vào — để 21 dòng dữ liệu giả đã lỡ import không cần xoá đi import lại. | Import 1 dòng mới có `ngay` nằm trong Tuần 2 → `tuan_so` tự động ghi đúng `2` ngay khi lưu, không cần sửa tay. Chạy `vaLaiTuanSoChoGhiNhan()` 1 lần → toàn bộ 21 dòng dữ liệu giả đã import trước đó được điền đúng `tuan_so = 2`. |

> **Thứ tự làm**: C039 nên làm **trước hoặc cùng lúc** với C037 — vì bộ chọn tuần ở C037 lọc dữ liệu dựa vào `tuan_so`, nếu cột đó còn trống thì có bộ chọn tuần cũng không lọc ra được gì. Sau khi xong C039, không cần xoá dữ liệu giả bằng C036 rồi import lại — chỉ cần chạy hàm vá 1 lần là dữ liệu cũ dùng được luôn.

---

## Đợt phát hiện #5 — sau khi xem dữ liệu giả thật trên giao diện (11/07/2026)

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| C040 | `[C040] feat(ui): bộ chọn ngày cụ thể (không chỉ tuần) cho các màn hình báo cáo` | Bên cạnh bộ chọn tuần (C037), thêm khả năng chọn **1 ngày cụ thể** (date picker) để xem đúng dữ liệu ngày đó — áp dụng cho khu vực "Nhật ký theo ngày" (C033, hiện đang chỉ hiện cả tuần cùng lúc) và bộ lọc trên lịch sử ghi nhận của hồ sơ học sinh (C038). Chọn tuần trước → date picker chỉ cho chọn trong đúng khoảng ngày của tuần đó. | Chọn 1 ngày bất kỳ trong tuần đang xem → nhật ký/lịch sử lọc đúng, chỉ hiện dữ liệu của riêng ngày đó; bỏ chọn (về "xem cả tuần") → hiện lại đầy đủ như cũ. |
| C041 | `[C041] fix(verify): kiểm tra lại thực tế và hoàn thiện hiệu ứng thu gọn/mở rộng TỪNG DÒNG danh sách học sinh` | **C030 đã đánh dấu Xong nhưng thực tế không thấy trên giao diện.** Lưu ý: đây là hiệu ứng cho **từng dòng học sinh** (bấm vào 1 em → dòng đó mở rộng xem nhanh chi tiết), **khác** với C044 bên dưới (thu gọn cả khối danh sách). AI agent bắt buộc phải tự mở trình duyệt, vào đúng **trang Danh sách học sinh** (không phải trang Tổng quan), xác nhận bằng mắt: bấm vào 1 dòng học sinh có mở rộng ra không, có nút "Xem hồ sơ đầy đủ" và "Copy link hồ sơ" không. Nếu thiếu, hoàn thiện lại đúng theo mô tả gốc của C030 (xem tài liệu 06 phần Đợt #1). | Vào đúng trang danh sách học sinh, bấm 1 dòng → thấy rõ mở rộng, đủ 2 nút; bấm lại → thu gọn. |
| C042 | `[C042] fix(verify): kiểm tra lại thực tế và hoàn thiện nút xoá dữ liệu theo lần import` | **C036 đã đánh dấu Xong nhưng thực tế không thấy trên giao diện.** AI agent bắt buộc phải tự mở đúng **màn hình Import**, xác nhận bằng mắt: có khu vực "Lịch sử import" liệt kê các lần import gần đây không, mỗi dòng có nút xoá không. Nếu thiếu, hoàn thiện lại đúng theo mô tả gốc của C036. | Vào màn hình Import, thấy danh sách các lần import gần đây kèm nút xoá; bấm xoá đúng 1 lần import dữ liệu giả → toàn bộ dữ liệu của lần đó biến mất khỏi mọi màn hình. |
| C043 | `[C043] feat(dashboard): thêm "Vùng thống kê tổng quan" theo tài liệu 07` | Thêm 1 dải thẻ (card) ở đầu trang Dashboard, chia 2 nhóm (Cần hành động ngay / Quan sát chung), hiển thị đúng 8 chỉ số TK01–TK08 theo **[tài liệu 07](07-danh-muc-thong-ke-tong-quan.md)** — bao gồm cả quy tắc hiển thị khi rỗng. Không tự thêm/bớt chỉ số ngoài danh mục đã chốt. | Mở Dashboard, thấy ngay dải thẻ ở đầu trang, đúng bố cục 2 nhóm và đủ 8 chỉ số theo tài liệu 07, số liệu khớp với dữ liệu giả đã import; trường hợp rỗng hiển thị đúng theo quy tắc đã ghi. |
| C044 | `[C044] feat(ui): nút thu gọn/mở rộng cho TOÀN BỘ khối danh sách học sinh` | **Yêu cầu mới, khác với C030/C041** (thu gọn từng dòng): thêm 1 nút/toggle đặt ở đầu mỗi khu vực đang hiển thị danh sách học sinh — trên tab **Tổng quan** (mọi khối liệt kê nhiều học sinh, ví dụ danh sách xếp theo điểm) và trên tab **Học sinh** (trang danh sách chính). Bấm vào → toàn bộ danh sách thu gọn lại chỉ còn 1 dòng tiêu đề (ví dụ "Danh sách học sinh (36) ▼"), ẩn hết các dòng bên trong. Bấm lại → mở ra đầy đủ như cũ. Đây là thu gọn **cả khối**, không phải từng dòng — 2 tính năng cùng tồn tại song song, không thay thế nhau: sau khi mở khối ra, từng dòng bên trong vẫn bấm được để xem nhanh chi tiết như C030. | Trên tab Tổng quan, bấm nút thu gọn ở đầu khu vực danh sách → toàn bộ ẩn, chỉ còn dòng tiêu đề; bấm lại → hiện đầy đủ. Làm đúng như vậy trên tab Học sinh. Sau khi mở lại, bấm từng dòng vẫn thấy hiệu ứng mở rộng chi tiết của C030 hoạt động bình thường. |

### Danh mục chỉ số Tổng quan (dùng cho C043)

> Đã tách thành tài liệu riêng — xem **[07-danh-muc-thong-ke-tong-quan.md](07-danh-muc-thong-ke-tong-quan.md)**.

---

## Đợt phát hiện #6 — (để trống, thêm khi phát sinh thêm trong lúc mình trao đổi)

| ID | Commit | Phạm vi | Tiêu chí hoàn thành |
|---|---|---|---|
| | | | |
