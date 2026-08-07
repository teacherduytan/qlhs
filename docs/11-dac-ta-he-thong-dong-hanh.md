# 11 — Đặc tả: Hệ thống Đồng hành (rule-based, luật sửa được trên web)

> Tài liệu cho AI trong IDE triển khai. Nối tiếp bản luận `10-luan-huong-phat-trien-he-thong.md` và bảng minh hoạ `bang-du-lieu-he-thong-dong-hanh.xlsx` (bộ luật khởi tạo lấy từ file Excel đó).
>
> **Nguyên tắc kiến trúc số 1 — đọc kỹ trước khi làm bất cứ gì**: Toàn bộ ngưỡng, câu chữ, điều kiện huy hiệu **KHÔNG được hardcode trong code TypeScript**. Chúng là **dữ liệu nằm trong bảng Supabase**, và giáo viên sửa được qua một trang quản lý trên web mà **không cần deploy lại**. Đây là yêu cầu cốt lõi vì giáo viên sẽ vừa dùng thử vừa tinh chỉnh dần. Nếu AI thấy chỗ nào buộc phải hardcode, phải báo lại và giải thích, không tự ý nhúng cứng.
>
> **Bắt buộc đọc trước khi code**: `schema.sql`, `DashboardPage.tsx` (đã có sẵn logic tính điểm/tuần/nhóm cần tái dùng), `src/features/scoring/scoring.ts`, `src/features/records/recordInsights.ts`.

---

## 1. Tư duy thiết kế: 3 loại luật, cùng một khuôn

Hệ thống có 3 nhóm luật (cảnh báo, huy hiệu, câu định hướng). Để dễ mở rộng, **cả 3 dùng chung một khuôn dữ liệu**: mỗi luật là một dòng trong bảng, gồm *điều kiện* (so sánh một chỉ số với một ngưỡng) và *kết quả* (câu chữ hoặc tên huy hiệu hiện ra). Thêm luật mới = thêm một dòng, không sửa code.

Điểm mấu chốt để việc này khả thi: **tách "chỉ số" (metric) ra khỏi "luật".** Code chỉ chịu trách nhiệm tính ra một rổ chỉ số chuẩn hoá cho mỗi học sinh mỗi tuần (ví dụ: `vang_khong_phep = 3`, `so_lan_ma_NN11 = 2`, `so_loi_tuan_nay = 6`, `so_loi_tuan_truoc = 2`...). Luật trong CSDL chỉ việc trỏ tới tên một chỉ số, một phép so sánh, một ngưỡng. Nhờ vậy giáo viên đổi ngưỡng thoải mái mà code không cần biết.

## 2. Các bảng Supabase mới

Tạo migration mới trong `supabase/migrations/`. Theo đúng quy ước hiện có: `enable row level security` + policy `"authenticated can manage ..."` giống hệt các bảng khác trong `schema.sql` (dòng 167–181). Tên cột tiếng Việt không dấu, snake_case, đúng phong cách dự án.

### 2a. Bảng `dong_hanh_chi_so` — từ điển chỉ số (để trang quản lý biết có những metric nào mà chọn)

Không chứa giá trị, chỉ liệt kê các chỉ số mà code biết tính, để dropdown trong trang quản lý luật hiển thị đúng danh sách. Seed sẵn, giáo viên hiếm khi sửa.

```sql
create table public.dong_hanh_chi_so (
  ma_chi_so text primary key,          -- vd 'vang_khong_phep', 'so_lan_theo_ma', 'xu_huong_loi'
  ten_hien_thi text not null,          -- 'Số buổi vắng không phép', ...
  kieu text not null,                  -- 'so' | 'so_theo_ma' | 'boolean'  (giúp UI biết cách nhập ngưỡng)
  mo_ta text,
  thu_tu integer not null default 0
);
```

### 2b. Bảng `dong_hanh_luat` — luật cảnh báo & nhắc nhở

```sql
create table public.dong_hanh_luat (
  ma_luat text primary key,               -- 'CB1', 'CB2'... giáo viên tự đặt khi thêm mới
  ten_luat text not null,                 -- mô tả ngắn cho giáo viên nhớ, vd 'Vắng 1 buổi - nhắc sớm'
  ma_chi_so text not null references public.dong_hanh_chi_so(ma_chi_so),
  phep_so_sanh text not null,             -- '>=', '>', '=', '<', '<='
  nguong numeric,                         -- ngưỡng số (null nếu chỉ số kiểu boolean)
  ma_danh_muc_ap_dung text,               -- chỉ dùng khi chi_so kiểu 'so_theo_ma' (vd áp riêng cho NN11); null = mọi mã
  muc_do text not null,                   -- 'khan' | 'canh_bao' | 'nhac_som' | 'nhac_nhe'  (quyết định màu + ưu tiên)
  cau_hien_thi text not null,             -- câu hiện ra, có placeholder {n}, {ma}, {ngay}
  uu_tien integer not null default 100,   -- số nhỏ = ưu tiên cao, dùng khi 1 em dính nhiều luật (xem mục 4)
  nhom_che text,                          -- vd 'vang' — các luật cùng nhóm_che, chỉ hiện luật ưu tiên cao nhất
  can_duyet boolean not null default true,-- cảnh báo mặc định cần giáo viên duyệt
  dang_bat boolean not null default true, -- tắt/bật luật không cần xoá
  thu_tu integer not null default 0
);
```

### 2c. Bảng `dong_hanh_huy_hieu` — luật huy hiệu

```sql
create table public.dong_hanh_huy_hieu (
  ma_huy_hieu text primary key,           -- 'chuyen_can_tron_tuan'...
  ten_huy_hieu text not null,             -- 'Chuyên cần trọn tuần'
  icon text,                              -- tên icon hoặc emoji, giáo viên chọn
  -- điều kiện đạt: 1 huy hiệu có thể gồm nhiều điều kiện AND, lưu dạng jsonb cho linh hoạt
  dieu_kien jsonb not null,               -- vd [{"ma_chi_so":"vang_khong_phep","phep":"=","nguong":0}, {...}]
  mo_ta text,                             -- giải thích cho học sinh hiểu vì sao được
  tu_dong boolean not null default true,  -- huy hiệu luôn tự động (không duyệt), để cột này cho nhất quán
  dang_bat boolean not null default true,
  thu_tu integer not null default 0
);
```

> Vì sao huy hiệu dùng `jsonb` cho điều kiện còn cảnh báo thì tách cột? Cảnh báo mỗi luật chỉ 1 điều kiện đơn (dễ cho UI form), còn huy hiệu hay cần AND nhiều điều kiện ("vắng=0 VÀ trễ=0 VÀ vắng có phép=0"). `jsonb` cho phép thêm điều kiện không cần đổi schema. Trang quản lý dựng form thêm/bớt dòng điều kiện, không bắt giáo viên gõ JSON tay.

### 2d. Bảng `dong_hanh_cau_dinh_huong` — kho câu "hướng cải thiện"

```sql
create table public.dong_hanh_cau_dinh_huong (
  ma_cau text primary key,
  gan_voi text not null,                  -- 'NN11' | 'NN09' | 'vang' | 'tre' | 'mac_dinh_tot'
  cau text not null,
  dang_bat boolean not null default true,
  thu_tu integer not null default 0
);
```

### 2e. Bảng `dong_hanh_duyet` — lưu trạng thái giáo viên đã duyệt câu cho em nào, tuần nào

Vì câu cảnh báo/định hướng cần duyệt trước khi học sinh/phụ huynh thấy, cần nơi lưu "đã duyệt hay chưa". Không sinh sẵn hàng loạt — chỉ ghi khi giáo viên bấm duyệt/ẩn.

```sql
create table public.dong_hanh_duyet (
  id bigint generated always as identity primary key,
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  tuan_so integer not null references public.cau_hinh_tuan(tuan_so) on update cascade,
  ma_luat text,                           -- luật nào sinh ra câu này
  noi_dung_da_duyet text,                 -- câu cuối cùng (giáo viên có thể sửa lại trước khi duyệt)
  trang_thai text not null default 'cho_duyet',  -- 'cho_duyet' | 'da_duyet' | 'da_an'
  nguoi_duyet text,
  thoi_diem timestamptz not null default now(),
  unique (ma_hs, tuan_so, ma_luat)
);
```

## 3. Lớp tính chỉ số (code — phần DUY NHẤT chứa logic tính toán)

Tạo `src/features/companion/computeMetrics.ts`:
- Hàm `tinhChiSoTuan(ma_hs, tuan_so)` → trả object chỉ số chuẩn hoá, ví dụ:
  ```ts
  {
    vang_khong_phep: number,
    vang_co_phep: number,
    di_tre: number,
    so_lan_theo_ma: Record<string, number>,   // { NN11: 2, NN09: 1 }
    co_nghiem_trong: boolean,
    ma_nghiem_trong: string | null,
    so_loi_tuan_nay: number,
    so_loi_tuan_truoc: number,
    co_ghi_nhan_tich_cuc: boolean,
    co_vi_pham_ne_nep: boolean,
  }
  ```
- **Tái dùng, không viết lại**: cách lọc `ghi_nhan`/`diem_danh` theo tuần, `isViolationRecord`/`isPositiveRecord` (`recordInsights.ts`), logic gộp buổi sáng/chiều đã định ở tài liệu 08. "Tuần trước" = `tuan_so - 1` tra trong `cau_hinh_tuan`.
- Đây là chỗ mở rộng khi cần chỉ số mới: thêm 1 field + 1 dòng vào `dong_hanh_chi_so`. Không đụng gì tới luật.

Tạo `src/features/companion/applyRules.ts`:
- `apDungLuat(chiSo, danhSachLuat)` → chạy từng luật, so `chiSo[ma_chi_so]` với `nguong` theo `phep_so_sanh`, trả các luật khớp.
- Xử lý `nhom_che` + `uu_tien`: trong cùng `nhom_che`, chỉ giữ luật `uu_tien` cao nhất (xem mục 4).
- Thay placeholder `{n}`, `{ma}`, `{ngay}` bằng giá trị thật từ chỉ số.
- `apDungHuyHieu(chiSo, danhSachHuyHieu)` → duyệt mảng `dieu_kien` (AND) của từng huy hiệu.
- **Không** tự chứa ngưỡng/câu chữ nào — tất cả đến từ tham số truyền vào (đọc từ CSDL).

## 4. Quy tắc khi một em dính nhiều luật (đã chốt với giáo viên)

- Các luật cùng `nhom_che` (vd cùng nhóm "vang"): chỉ hiện **một** luật có `uu_tien` nhỏ nhất (cao nhất). Ví dụ CB2 (uu_tien 20) che CB1 (uu_tien 50) khi em vắng ≥2 buổi — không hiện cả hai câu về vắng.
- Luật khác `nhom_che` thì hiện song song (vd vừa có câu về vắng, vừa có câu về vi phạm lặp).
- `muc_do = 'khan'` (CB4 nghiêm trọng) luôn hiển thị trên cùng, màu đỏ, bất kể luật khác.
- Đây đều là **dữ liệu** (`uu_tien`, `nhom_che` sửa được trên web), nên sau này giáo viên tự đổi thứ tự ưu tiên mà không cần AI.

## 5. Trang quản lý luật (web) — `src/features/companion/RuleManagerPage.tsx`

Trang cho giáo viên tự chỉnh, đặt trong menu giáo viên (thêm route `router.tsx` + mục trong `Layout.tsx`). Yêu cầu:
- 4 tab: **Cảnh báo & nhắc nhở** / **Huy hiệu** / **Câu định hướng** / **Chỉ số** (tab chỉ số chủ yếu để xem, ít sửa).
- Mỗi tab là bảng CRUD đơn giản: sửa tại chỗ (inline) hoặc modal, lưu thẳng vào Supabase qua `dataSource`.
- Form cảnh báo: dropdown chọn `ma_chi_so` (từ `dong_hanh_chi_so`), dropdown phép so sánh, ô nhập ngưỡng, ô nhập câu chữ có nhắc placeholder khả dụng, chọn mức độ, bật/tắt, ưu tiên, nhóm che.
- Form huy hiệu: cho thêm/bớt nhiều dòng điều kiện (mỗi dòng = chỉ số + phép + ngưỡng), ghép AND — **không bắt gõ JSON tay**, code tự dựng `jsonb` khi lưu.
- Nút bật/tắt (`dang_bat`) cho từng luật để giáo viên thử nghiệm mà không mất luật cũ.
- **Xem thử ngay (preview)**: trên trang này có ô chọn 1 học sinh + 1 tuần, bấm "Xem thử" để thấy ngay luật hiện tại cho ra câu gì cho em đó — để giáo viên chỉnh ngưỡng và thấy kết quả liền, không phải rời trang. Đây là thứ giúp "vừa test vừa chỉnh" đúng nghĩa.

## 6. Trang cá nhân học sinh — nơi kết quả hiển thị

Nâng cấp trang cá nhân hiện có (`StudentProfilePage.tsx` cho bản công khai của học sinh; `TeacherStudentDetailPage.tsx` cho giáo viên xem). Thứ tự hiển thị (đã chốt ở mockup, tài liệu 10):
1. Lời mở đầu theo tinh thần tuần (tích cực/tiến bộ ưu tiên hiện trước).
2. Huy hiệu tuần (tự động, hiện ngay).
3. Điều cần chú ý (câu cảnh báo — **chỉ hiện câu đã `da_duyet`** trong `dong_hanh_duyet`; câu `cho_duyet` chỉ giáo viên thấy ở bản của mình).
4. Hướng cải thiện (câu định hướng — cũng qua duyệt).
5. Ghi nhận tích cực.

**Ranh giới hiển thị (bắt buộc đúng)**:
- Bản học sinh/phụ huynh xem (qua `lay_ho_so_cong_khai`): huy hiệu + con số hiện tự động; câu nhận xét/khuyên **chỉ hiện nếu `trang_thai = 'da_duyet'`**.
- Bản giáo viên: thấy hết, kèm nút Duyệt / Sửa lại / Ẩn cho từng câu (ghi vào `dong_hanh_duyet`). Giáo viên sửa được câu trước khi duyệt.
- Hàm `lay_ho_so_cong_khai` (SECURITY DEFINER, dòng 360+ trong schema) cần mở rộng để trả thêm huy hiệu + các câu đã duyệt của tuần đang xem. **Không** để lộ câu chưa duyệt qua hàm công khai này — kiểm tra kỹ.

## 7. Seed dữ liệu luật khởi tạo

Trong migration, seed sẵn bộ luật lấy từ `bang-du-lieu-he-thong-dong-hanh.xlsx` (sheet "2. Bộ luật"): 5 luật cảnh báo CB1–CB5, 5 huy hiệu, 5 câu định hướng, và danh sách chỉ số ở mục 3. Đây chỉ là **điểm khởi đầu để giáo viên chỉnh dần** — ghi rõ trong comment migration rằng đây là giá trị mặc định, giáo viên sẽ sửa qua trang quản lý.

## 8. Việc KHÔNG làm ở phạm vi này

- KHÔNG gọi bất kỳ API AI ngoài nào — toàn bộ rule-based.
- KHÔNG tự động gửi câu chưa duyệt cho học sinh/phụ huynh.
- KHÔNG làm phần đẩy thông báo (push) — đó là workstream riêng.
- KHÔNG hardcode ngưỡng/câu chữ trong TypeScript.
- KHÔNG chấm điểm đạo đức / dự đoán "nguy cơ" học sinh (xem tài liệu 10 mục 7).

## 9. Kiểm thử bắt buộc trên trình duyệt thật trước khi đánh dấu hoàn thành

Theo đúng quy tắc dự án (đã xảy ra sự cố C001–C027 vì bỏ bước này):
1. Sửa 1 ngưỡng trên trang quản lý (vd đổi CB1 từ 1 → 2 buổi) → mở lại trang cá nhân 1 em đang dính CB1 → xác nhận câu biến mất, **không cần deploy lại**.
2. Thêm 1 luật mới hoàn toàn qua web → xác nhận nó chạy trên trang cá nhân.
3. Tạo 1 câu cảnh báo, để `cho_duyet` → mở bản công khai (link học sinh) xác nhận **không thấy**; duyệt xong mở lại → thấy.
4. Tắt (`dang_bat=false`) 1 huy hiệu → xác nhận biến mất khỏi trang cá nhân.
5. Kiểm tra 1 em dính nhiều luật cùng `nhom_che` → chỉ hiện câu ưu tiên cao nhất.

## 10. Mã commit

Tự đọc `PROGRESS.md` lấy số C tiếp theo, không tự bịa số. Ghi log vào `docs/06-cai-tien-sau-trien-khai.md` như thường lệ.

## 11. Phản hồi ngược cho kiến trúc sư (BẮT BUỘC nếu có khuyến nghị)

Trong lúc triển khai thực tế, nếu AI trong IDE phát hiện điểm nào trong đặc tả này **nên điều chỉnh** — ví dụ: một tên cột trùng/không khớp schema thật, một thiết kế bảng gây khó khi query, một chỗ mâu thuẫn với code hiện có, một ràng buộc kỹ thuật khiến cách làm đề xuất không tối ưu, hay một rủi ro bảo mật/hiệu năng chưa được tính tới — thì **không tự ý đổi khác đặc tả trong im lặng**, mà ghi khuyến nghị vào chính mục này của file, theo mẫu dưới đây. Giáo viên sẽ gửi file lại cho kiến trúc sư (Claude) để rà rồi mới chốt.

**Nguyên tắc:**
- Nếu là **sai lệch nhỏ, chắc chắn đúng** (vd tên cột thật là `ma_hoc_sinh` chứ không phải `ma_hs`): cứ sửa cho chạy được, nhưng **vẫn ghi lại** vào đây một dòng để kiến trúc sư biết đặc tả cần cập nhật.
- Nếu là **quyết định thiết kế có đánh đổi** (vd "nên tính chỉ số bằng RPC Postgres thay vì client cho nhanh"): **không tự quyết**, ghi khuyến nghị vào đây kèm lý do và phương án, chờ kiến trúc sư chốt.
- Nếu **chặn không làm tiếp được** (vd thiếu bảng phụ thuộc): làm phần không bị chặn, ghi rõ phần bị chặn vào đây.

**Mẫu ghi mỗi khuyến nghị:**

```
### [KN-01] <tiêu đề ngắn>
- Thuộc mục: <mục nào của đặc tả, vd "2b. Bảng dong_hanh_luat">
- Loại: [sai lệch nhỏ đã tự sửa] / [cần quyết định] / [đang bị chặn]
- Hiện trạng đặc tả nói: <trích ngắn>
- Thực tế gặp phải: <mô tả>
- Đề xuất của AI: <phương án + lý do>
- Trạng thái: chờ kiến trúc sư rà
```

Để trống mục này nếu không có khuyến nghị nào. Không xoá phần hướng dẫn phía trên khi ghi — chỉ thêm các khối `[KN-xx]` bên dưới.

<!-- AI trong IDE ghi khuyến nghị bên dưới dòng này -->

### [KN-01] File Excel seed goc khong co trong repo
- Thuộc mục: 7. Seed dữ liệu luật khởi tạo
- Loại: [đang bị chặn — đã tự chọn phương án tạm để không chặn cả việc triển khai]
- Hiện trạng đặc tả nói: seed 5 luật CB1–CB5, 5 huy hiệu, 5 câu định hướng lấy từ `bang-du-lieu-he-thong-dong-hanh.xlsx` (sheet "2. Bộ luật").
- Thực tế gặp phải: file Excel này KHÔNG có trong repo tại thời điểm triển khai (đã tìm bằng glob toàn repo, không thấy). Không có cách nào đọc đúng dữ liệu thật.
- Đề xuất của AI: đã tự viết 5 luật/5 huy hiệu/5 câu định hướng làm ví dụ khởi tạo hợp lý (xem đầu file migration `20260806000100_tao_bang_he_thong_dong_hanh.sql`), đánh dấu rõ là placeholder trong comment migration. Giáo viên cần vào trang Quản lý luật (`/dong-hanh`) rà lại toàn bộ và sửa theo đúng ý muốn thật — không nên coi đây là bộ luật chính thức.
- Trạng thái: chờ kiến trúc sư rà (hoặc giáo viên gửi lại file Excel để nạp seed đúng ở 1 migration bổ sung sau).

### [KN-02] Tai lieu tham chieu "10-luan-huong-phat-trien-he-thong.md" khong ton tai
- Thuộc mục: dòng mở đầu đặc tả ("Nối tiếp bản luận 10-luan-huong-phat-trien-he-thong.md")
- Loại: [sai lệch nhỏ, không chặn được việc triển khai — đã bỏ qua]
- Hiện trạng đặc tả nói: tài liệu 10 chứa phần luận giải hướng phát triển + mockup thứ tự hiển thị (tài liệu 10 mục 7 nói về "không chấm điểm đạo đức/dự đoán nguy cơ").
- Thực tế gặp phải: số thứ tự `docs/10-...` trong repo này đã được dùng cho 1 tính năng khác không liên quan (`docs/10-tinh-nang-goi-sms-phu-huynh-v2.md`, từ trước) — file "luận hướng phát triển" mà đặc tả này nhắc tới không tồn tại trong repo, có thể do đặc tả được viết ở 1 phiên bản đánh số tài liệu khác.
- Đề xuất của AI: triển khai theo đúng nội dung tự thân của file `11-dac-ta-he-thong-dong-hanh.md` (đã đủ chi tiết để làm), không suy đoán thêm nội dung từ tài liệu 10 không có thật. Nếu tài liệu đó tồn tại ở nơi khác, giáo viên gửi lại để rà có sai lệch gì không.
- Trạng thái: chờ kiến trúc sư rà.

### [KN-03] Them cot "loai" vao dong_hanh_duyet (ngoai dac ta goc)
- Thuộc mục: 2e. Bảng `dong_hanh_duyet`
- Loại: [quyết định có đánh đổi — đã tự chọn, cần kiến trúc sư xác nhận]
- Hiện trạng đặc tả nói: `dong_hanh_duyet` chỉ có cột `ma_luat text -- luật nào sinh ra câu này`, dùng chung cho cả câu cảnh báo lẫn câu định hướng.
- Thực tế gặp phải: câu định hướng (mục 6, "hướng cải thiện") không được sinh ra từ 1 `luật` trong `dong_hanh_luat` — nó được chọn qua thuật toán riêng khớp `gan_voi` (xem KN-04). Nếu chỉ có 1 cột `ma_luat` dùng chung, trang cá nhân công khai (không có danh sách `dong_hanh_luat`/`dong_hanh_cau_dinh_huong` gốc, chỉ nhận `duyet` đã lọc `da_duyet` qua RPC) sẽ không phân biệt được 1 dòng `dong_hanh_duyet` là câu cảnh báo hay câu định hướng để hiển thị đúng thứ tự "Điều cần chú ý" rồi "Hướng cải thiện" như mục 6 yêu cầu.
- Đề xuất của AI: thêm cột `loai text check (loai in ('canh_bao','dinh_huong'))`, unique constraint đổi thành `(ma_hs, tuan_so, loai, ma_luat)`. Cột `ma_luat` khi `loai='dinh_huong'` lưu `ma_cau` của `dong_hanh_cau_dinh_huong` (2 không gian mã không trùng nhau: 'CBx' vs 'CDH-xxx' theo seed hiện tại, nhưng không có ràng buộc FK cứng để tránh vỡ nếu giáo viên đặt mã khác quy ước).
- Trạng thái: chờ kiến trúc sư rà.

### [KN-04] Thuat toan chon "cau dinh huong" khong duoc dac ta ro
- Thuộc mục: 3 (applyRules.ts) và 6 (thứ tự hiển thị, "Hướng cải thiện")
- Loại: [cần quyết định — đã tự chọn 1 phương án, cần kiến trúc sư chốt]
- Hiện trạng đặc tả nói: mục 3 chỉ liệt kê `apDungLuat` và `apDungHuyHieu`, không có hàm nào chọn câu định hướng; mục 2d chỉ ghi cột `gan_voi` là 1 khoá text (vd 'NN11' | 'NN09' | 'vang' | 'tre' | 'mac_dinh_tot') mà không mô tả cách nó được đối chiếu với luật/chỉ số nào.
- Thực tế gặp phải: cần 1 thuật toán cụ thể để chọn đúng 1 câu định hướng cho mỗi học sinh/tuần.
- Đề xuất của AI: viết hàm `chonCauDinhHuong(luatKhop, danhSachCau)` trong `applyRules.ts` — duyệt các luật cảnh báo đã khớp theo đúng thứ tự ưu tiên (`uu_tien` tăng dần), với mỗi luật lấy khoá `nhom_che` (nếu có) hoặc `muc_do` (nếu không có `nhom_che`, vd luật CB4 "khẩn"), tìm câu có `gan_voi` khớp khoá đó; nếu không luật nào khớp có câu tương ứng, dùng câu `gan_voi = 'mac_dinh_tot'`. Đã seed đúng theo quy ước này (`nhom_che` seed: 'vang', 'tre'; luật CB4 không có `nhom_che` nên dùng `muc_do='khan'` làm khoá, seed câu `CDH-KY-LUAT` có `gan_voi='khan'`).
- Trạng thái: chờ kiến trúc sư rà — đây là chỗ dễ có cách hiểu khác, cần xác nhận trước khi giáo viên phụ thuộc vào hành vi này.

### [KN-05] "Gop buoi sang/chieu" (nhac trong muc 3) khong ton tai trong code hien co
- Thuộc mục: 3 (computeMetrics.ts, "logic gộp buổi sáng/chiều đã định ở tài liệu 08")
- Loại: [sai lệch nhỏ, đã tự sửa]
- Hiện trạng đặc tả nói: tái dùng "logic gộp buổi sáng/chiều đã định ở tài liệu 08" khi tính `vang_khong_phep`/`vang_co_phep`/`di_tre`.
- Thực tế gặp phải: rà `docs/08-lien-ket-va-mau-sac.md` (nội dung thực tế là về liên kết/màu sắc, không liên quan điểm danh) và toàn bộ `AttendanceManagementPage.tsx`/`AttendanceReportPage.tsx` — không tìm thấy logic "gộp buổi sáng/chiều" nào cho vắng/trễ; các hàm hiện có (`countAbsencesByStudent`, `summarizeAttendance`) đếm thẳng theo từng dòng `diem_danh` (mỗi buổi 1 dòng), không gộp 2 buổi thành 1 ngày.
- Đề xuất của AI: `computeMetrics.ts` đếm `vang_khong_phep`/`vang_co_phep`/`di_tre` theo đúng cách đang dùng nhất quán trong app (đếm theo dòng/buổi, không gộp ngày) — nếu 1 học sinh vắng cả sáng lẫn chiều 1 ngày sẽ tính là 2, không phải 1. Nếu giáo viên muốn tính theo "số NGÀY vắng" thay vì "số BUỔI vắng", cần nêu rõ để sửa lại.
- Trạng thái: chờ kiến trúc sư rà.

### [KN-06] Tab "Chi so" trong trang quan ly lam dang chi xem
- Thuộc mục: 5. Trang quản lý luật ("tab chỉ số chủ yếu để xem, ít sửa")
- Loại: [sai lệch nhỏ, đã tự chọn theo đúng tinh thần "ít sửa" của đặc tả]
- Hiện trạng đặc tả nói: tab Chỉ số "chủ yếu để xem, ít sửa".
- Thực tế gặp phải: để tránh mở rộng phạm vi không cần thiết (sửa chỉ số đồng nghĩa phải đổi code `computeMetrics.ts` mới có tác dụng, không giống 3 tab kia là sửa xong dùng ngay), tab này hiện làm READ-ONLY hoàn toàn (chỉ bảng liệt kê `ma_chi_so`/`tên hiển thị`/`kiểu`/`mô tả`, không có form sửa).
- Đề xuất của AI: nếu giáo viên cần sửa `ten_hien_thi`/`mo_ta` (không phải thêm chỉ số tính toán mới — việc đó bắt buộc phải sửa code), có thể bổ sung form sửa đơn giản ở lần sau; hiện chưa làm vì đặc tả không yêu cầu rõ.
- Trạng thái: chờ kiến trúc sư rà (không chặn, chỉ là phạm vi tối giản).

