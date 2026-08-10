# 14 — Rà soát & chuẩn hoá xử lý biến động học sinh (chuyển đi / chuyển đến)

## 1. Bối cảnh

Bảng `hoc_sinh` đã có sẵn hai cột phục vụ đúng mục đích này:

- `ngay_nhap_hoc` (date) — ngày học sinh chính thức vào lớp
- `ngay_roi_lop` (date, nullable) — để trống nếu đang học; có giá trị nghĩa là học sinh đã rời lớp kể từ ngày đó

UI "Thêm/Sửa học sinh" đã cho phép nhập hai trường này. Việc còn thiếu chưa xác nhận là: **toàn bộ logic phía sau (query, công thức tính điểm, xếp hạng, báo cáo) có thực sự tôn trọng hai mốc ngày này hay không**, hay có chỗ nào đang lấy "tất cả học sinh trong bảng `hoc_sinh`" / hardcode sĩ số mà bỏ qua hai cột trên.

Đang có 2 ca thực tế cần xử lý (1 học sinh chuyển đi, 1 học sinh mới chuyển đến), nên việc rà soát này cần làm trước, tránh sai lệch dữ liệu thật.

## 2. Nguyên tắc bắt buộc

1. **Không bao giờ xoá cứng (`DELETE`) dòng trong `hoc_sinh`** khi học sinh chuyển trường. Chỉ cập nhật `ngay_roi_lop`.
2. **Trạng thái "đang học" luôn được suy ra từ ngày**, không lưu một cột `trang_thai` riêng dễ lệch dữ liệu. Công thức chuẩn cho một thời điểm/tuần `T`:
   ```
   dang_hoc(T) = ngay_nhap_hoc <= T AND (ngay_roi_lop IS NULL OR ngay_roi_lop > T)
   ```
3. **Các màn hình/thao tác nhập liệu mới** (điểm danh, ghi nhận vi phạm/khen thưởng, xếp hạng Tinh Tú của tuần hiện tại và tương lai) → chỉ hiển thị/tính học sinh thoả `dang_hoc(tuần đó)`.
4. **Các màn hình lịch sử/báo cáo** (báo cáo tuần/tháng đã qua, `lay_lich_su_vi_pham`, `rank_lich_su_tuan`, huy hiệu đã đạt) → **không được lọc theo trạng thái hiện tại**. Học sinh đã chuyển đi vẫn phải xuất hiện đầy đủ trong dữ liệu của các tuần mà em còn học.
5. **Sĩ số lớp không bao giờ hardcode** (ví dụ số `36`). Mọi nơi cần sĩ số để tính điểm tương đối hoặc hiển thị phải đếm động theo công thức ở mục 2, tại đúng tuần đang xét.

## 3. Phạm vi rà soát (grep + đọc code, liệt kê phát hiện trước khi sửa)

Với mỗi mục dưới đây: tìm file thực tế trong repo (tên file có thể khác tên gợi ý — tìm theo chức năng nếu không thấy đúng tên), xác nhận có tuân thủ mục 2 không, liệt kê vào bảng kết quả ở mục 6 trước khi sửa.

- [ ] **`scoring.ts`** — mọi chỗ dùng "tổng số học sinh" hoặc "sĩ số" để chuẩn hoá/xếp loại tương đối. Tìm các literal số (36, hoặc biến cứng) và thay bằng đếm động.
- [ ] **`rankTinhTu.ts`** — tính hạng Tinh Tú tuần hiện tại phải loại học sinh không `dang_hoc(tuần đó)`; nhưng `rank_lich_su_tuan` của các tuần cũ giữ nguyên, không tính lại.
- [ ] **`AttendanceManagementPage.tsx`** (điểm danh) — danh sách học sinh để điểm danh của tuần hiện tại/tương lai chỉ gồm học sinh `dang_hoc`. Điểm danh của các tuần cũ (xem lại) không bị ẩn học sinh đã rời lớp.
- [ ] **Form nhập `ghi_nhan`** (vi phạm/khen thưởng) — dropdown chọn học sinh chỉ hiển thị học sinh `dang_hoc` tại ngày ghi nhận.
- [ ] **`DashboardPage.tsx`** — sĩ số hiển thị phải đếm động theo tuần đang xem, không phải `hoc_sinh.length`.
- [ ] **Báo cáo tuần/tháng (docs 08–09, export docx/jsPDF)** — với tuần trước ngày `ngay_roi_lop`/sau `ngay_nhap_hoc`, học sinh phải xuất hiện đúng; danh sách lớp ở đầu báo cáo (nếu có) không được lọc theo trạng thái "hiện tại".
- [ ] **RPC `lay_lich_su_vi_pham`** — xác nhận không có điều kiện lọc `ngay_roi_lop IS NULL` ở phía server (lịch sử vi phạm trong học kỳ phải đầy đủ bất kể học sinh còn học hay không).
- [ ] **Hệ thống đồng hành (`dong_hanh_*`, `RuleManagerPage.tsx`)** — mọi luật so sánh với "trung bình lớp"/"toàn lớp" phải dùng tập học sinh `dang_hoc` tại thời điểm đánh giá.
- [ ] **Bảng `phu_huynh` / SMS** — xác nhận UI thêm học sinh mới có tạo kèm hồ sơ `phu_huynh` liên kết (không bắt buộc sửa nếu đã có, chỉ xác nhận).
- [ ] **Tìm toàn repo** các literal `36` hoặc biến đặt tên kiểu `SI_SO`, `TOTAL_STUDENTS` bị hardcode — liệt kê hết, kể cả ngoài các file trên.

## 4. Cách sửa khi phát hiện lỗi

Pattern chung cho query lấy "học sinh đang học tại tuần T" (thay `T` bằng ngày cuối tuần hoặc ngày đang xét tuỳ ngữ cảnh):

```sql
SELECT *
FROM hoc_sinh
WHERE ngay_nhap_hoc <= :T
  AND (ngay_roi_lop IS NULL OR ngay_roi_lop > :T)
```

Nếu logic đang nằm ở TypeScript (không phải SQL), áp dụng đúng điều kiện tương đương khi filter mảng học sinh trước khi tính toán/hiển thị. Không thêm cột `trang_thai` mới — giữ nguyên nguồn sự thật là hai cột ngày.

## 5. Kịch bản kiểm thử bắt buộc trên trình duyệt

Theo quy tắc đã thống nhất (không đánh dấu hoàn thành nếu chưa test trên trình duyệt thật), sau khi sửa cần test tối thiểu:

1. Set `ngay_roi_lop` cho một học sinh test (tuần hiện tại) → xác nhận: biến mất khỏi điểm danh/ghi nhận tuần này và tuần sau; **vẫn còn nguyên** trong báo cáo/lịch sử vi phạm của các tuần trước đó; sĩ số Dashboard và Tinh Tú tuần này giảm đúng 1.
2. Thêm học sinh test mới với `ngay_nhap_hoc` = hôm nay → xác nhận: xuất hiện đúng trong điểm danh/ghi nhận từ hôm nay trở đi; **không** xuất hiện trong báo cáo của các tuần trước `ngay_nhap_hoc`; sĩ số tăng đúng 1.
3. Xoá dữ liệu test sau khi xác nhận (không để lại học sinh giả trong dữ liệu thật).

## 6. Bảng kết quả rà soát (IDE AI điền trước khi sửa)

| Module | File thực tế | Đã tuân thủ mục 2? | Cần sửa? | Ghi chú |
|---|---|---|---|---|
| scoring.ts | `src/features/scoring/scoring.ts` | N/A | Không | Công thức tính điểm hoàn toàn theo từng học sinh (tổng hợp 4 nhóm CC/VS/NN/KL của riêng em đó), không có bước "chuẩn hoá theo sĩ số/trung bình lớp" nào — không có gì để lọc theo `dang_hoc`. Không có literal `36`. |
| rankTinhTu.ts | `src/features/companion/rankTinhTu.ts` + nơi gọi (`StudentProfilePage.tsx`, `TeacherStudentDetailPage.tsx`, `RuleManagerPage.tsx`) | Có | Không | `tinhRankTuan()` là hàm thuần tính cho ĐÚNG 1 học sinh (nhận điểm rèn luyện + số huy hiệu của riêng em đó), không duyệt qua danh sách lớp nên không có chỗ nào cần lọc `dang_hoc`. `rank_lich_su_tuan` các tuần cũ đọc thẳng, không tính lại. |
| Điểm danh | `AttendanceManagementPage.tsx` | **Trước: Không** → Đã sửa | Đã sửa (C235) | `sessionSummary`/`monthSummary` (đếm sĩ số) đã lọc đúng theo tuần đang xem từ trước (C232). Phát hiện thêm: danh sách chọn học sinh để đánh dấu vắng (`QuickMarkForm`) vẫn nhận nguyên `students` chưa lọc — sửa thêm `activeStudentsForSelectedDate` lọc theo đúng ngày đang điểm danh. Xem lại điểm danh tuần cũ không bị ẩn học sinh đã rời lớp (đúng, vì đọc thẳng từ `diem_danh` đã ghi, không lọc lại theo trạng thái hiện tại). |
| Form ghi_nhan | `src/features/records/RecordEntryPage.tsx` | **Không** → Đã sửa | Đã sửa (C235) | `sortedStudents` (danh sách chọn học sinh để ghi nhận vi phạm/khen thưởng) trước đây lấy nguyên `state.students`, không lọc theo `dang_hoc` tại `form.date` (ngày xảy ra) — sửa thêm điều kiện lọc theo đúng ngày đang ghi nhận, không phải "hôm nay". |
| Dashboard | `src/features/dashboard/DashboardPage.tsx` | **Trước: Không** → Đã sửa | Đã sửa (C235) | `buildOverviewStats` (học sinh sạch/cần chú ý) đã sửa dùng đúng ngày tuần đang xem từ trước (C232). Phát hiện thêm: thẻ "Sĩ số" ở khối "Tóm tắt nhanh" vẫn hiển thị thẳng `state.students.length` — sửa thêm `body.activeStudentCount` tính động theo đúng tuần đang xem (dùng chung công thức `weekReferenceDate` với `buildOverviewStats`). |
| Báo cáo tuần/tháng | `src/features/reports/ReportsPage.tsx` (dòng 147) + `reportData.ts` | Có | Không | `soHocSinh` đã tính động qua `isActiveStudent(student, denNgay)` theo đúng ngày cuối kỳ báo cáo. `reportData.ts` dựng số liệu thẳng từ `ghi_nhan`/`diem_danh` theo kỳ, không lọc lại theo trạng thái hiện tại — học sinh đã rời lớp vẫn xuất hiện đủ trong các kỳ em còn học. |
| lay_lich_su_vi_pham | Không tồn tại RPC này trong repo | N/A | Không | Không có RPC nào tên `lay_lich_su_vi_pham` hay tương đương — lịch sử `ghi_nhan` được đọc thẳng qua `supabase-js` (`SupabaseDataSource.ts`), không qua RPC, và không có điều kiện lọc `ngay_roi_lop is null` nào ở phía client hay server cho truy vấn lịch sử. |
| Hệ thống đồng hành | `RuleManagerPage.tsx`, `applyRules.ts`, `computeMetrics.ts` | N/A | Không | Không có luật nào so sánh 1 học sinh với "trung bình lớp"/"toàn lớp" — mọi chỉ số/luật/huy hiệu đều tính theo dữ liệu của riêng từng em (đúng nguyên tắc "không có bảng xếp hạng công khai" đã chốt ở tài liệu 10/12). Không có gì để lọc theo `dang_hoc` ở tầng này. |
| phu_huynh khi thêm mới | `SupabaseDataSource.ts` hàm `addStudent()` | Xác nhận hiện trạng | Không bắt buộc sửa | `addStudent()` chỉ tạo dòng `hoc_sinh` + `thanh_vien_nhom_diem_danh` (từ C232), KHÔNG tự tạo kèm hồ sơ `phu_huynh` liên kết — việc gán phụ huynh vẫn là thao tác nhập liệu riêng của giáo viên sau đó. Đúng như mục 3 chỉ yêu cầu "xác nhận", không bắt buộc sửa. |
| Hardcode khác (nếu có) | Rà toàn bộ `src/` | Không tìm thấy | Không | Không có literal `36` hay biến `SI_SO`/`TOTAL_STUDENTS`/`SISO_LOP` nào đại diện cho sĩ số cố định trong toàn bộ mã nguồn (chỉ có 1 kết quả trùng lặp không liên quan: `Layout.tsx` dùng `'36%'` làm toạ độ trang trí hiệu ứng nền màn hình đăng nhập, không phải sĩ số). |

## 7. Sau khi hoàn tất

- Ghi commit vào `docs/06-cai-tien-sau-trien-khai.md` và `docs/PROGRESS.md` theo đúng số C-series tiếp theo hiện có (không tự đặt số, lấy số kế tiếp sau commit gần nhất).
- Việc nhập liệu 2 ca thực tế (1 học sinh chuyển đi, 1 học sinh chuyển đến) sẽ do giáo viên thao tác trực tiếp trên UI sau khi rà soát này xác nhận hệ thống an toàn — không cần AI hỗ trợ nhập liệu.
