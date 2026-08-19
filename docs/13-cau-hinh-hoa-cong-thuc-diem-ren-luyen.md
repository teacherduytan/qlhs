# 13 — Cấu hình hoá công thức tính điểm rèn luyện tuần (portable, không hardcode)

> Nối tiếp `03-he-thong-diem-ren-luyen.md` và bám sát nguyên tắc kiến trúc đã dùng cho Đồng Hành/Tinh Tú ("luật là dữ liệu"). Tài liệu này áp dụng đúng nguyên tắc đó cho **chính công thức điểm gốc** — thứ hiện đang hardcode trong `src/features/scoring/scoring.ts`.
>
> **Quyết định đã chốt với kiến trúc sư (08–09/08/2026)**:
> 1. Mức linh hoạt hướng tới: **portable đơn-trường** — không multi-tenant. Đổi trường = đổi bộ config + deploy instance riêng, không cần `school_id` rải khắp bảng, không cần RLS theo trường.
> 2. Sửa luôn lỗ hổng thang đo (mẫu số 4↔6, xem `03-he-thong-diem-ren-luyen.md` §5) trong lần refactor này — **không** giữ hành vi cũ tạm thời rồi sửa sau.
> 3. Ngưỡng xếp loại **90/70/50** (§2c) — **đã chốt dùng trong hệ thống**. Đây là quyết định của kiến trúc sư cho hệ thống đang xây dựng, khác với việc Ban Thi đua Khen thưởng nhà trường phê duyệt chính thức (2 việc độc lập) — nếu sau này trường yêu cầu số khác, chỉ cần sửa dữ liệu trong `diem_nguong_xep_loai`, không cần sửa code.
> 4. Snapshot điểm lịch sử theo công thức cũ: **chưa cần**, vì hệ thống điểm chưa công bố chính thức — đổi công thức là đổi luôn cho mọi tuần đã qua. Sẽ làm khi hệ thống ổn định/công bố chính thức (spec riêng sau).
>
> **Bắt buộc đọc trước khi code**: `03-he-thong-diem-ren-luyen.md` (đặc tả công thức gốc + các TODO đã ghi từ 07/2026), `scoring.ts` hiện có, `12-dac-ta-rank-tinh-tu.md` (Rank Tinh Tú lấy `diem_xep_loai_thi_dua` làm đầu vào — xem §7 dưới).

---

## 0. Vì sao làm việc này (tóm tắt, xem phân tích đầy đủ ở file riêng)

Công thức hiện tại đúng theo đặc tả trường (đối chiếu code ↔ `03-he-thong-diem-ren-luyen.md` khớp gần như tuyệt đối), nhưng **chính bản thân công thức có lỗ hổng đã được đặc tả tự ghi nhận**: vì `diem_hoc_tap` nằm trên thang 0–20 (không phải 0–100), nhánh `(CC+VS+NN+KL+HT)/6` có trần thực tế ~70, còn nhánh `(CC+VS+NN+KL)/4` có trần 100 — 2 tuần của cùng 1 học sinh không so sánh trực tiếp được nếu 1 tuần có điểm môn, 1 tuần không.

Công thức này **là "linh hồn"/tư duy quản lý của Lạc Hồng** (coi trọng nề nếp/kỷ luật hơn học tập, đúng thực tế đầu vào học sinh) — không đổi triết lý đó. Cái cần đổi là: (a) *chỗ đặt* công thức — từ code cứng sang dữ liệu, để sau này Lạc Hồng tự chỉnh hoặc trường khác tự định nghĩa lại mà không sửa code; (b) *sửa lỗ hổng thang đo* — đưa mọi thành phần về chung 1 thang 0–100 trước khi gộp, bỏ cơ chế "2 bảng ngưỡng song song".

---

## 1. Nguyên tắc thiết kế: pipeline có tham số, không phải công thức tự do

Không xây dựng expression engine (công thức dạng chuỗi text để parse/eval) — rủi ro khó audit, khó giải thích với Ban Thi đua tại sao ra điểm đó, khó test. Thay vào đó, **các bước tính vẫn cố định trong code, chỉ tham số của từng bước nằm trong Supabase**:

```
[1] Thu thập giá trị thô mỗi thành phần
        →  [2] Chuẩn hoá về thang 0–100 chung
        →  [3] Gộp có trọng số (chỉ trên thành phần có mặt tuần đó)
        →  [4] Áp hệ số điều kiện (cờ đỏ ×2...)
        →  [5] Làm tròn
        →  [6] Tra bảng ngưỡng xếp loại (1 bảng duy nhất, không còn 2 nhánh)
```

Ranh giới linh hoạt cần nói rõ: **tham số** (trọng số, hệ số chuẩn hoá, ngưỡng, có bắt buộc hay không) là dữ liệu, sửa được không cần deploy. **Cách tính giá trị thô của 1 thành phần** (`loai_tinh`) là 1 tập hợp hữu hạn các "kiểu tính" đã lập trình sẵn (hiện có 2 kiểu, xem §2a) — trường khác muốn thêm 1 kiểu tính hoàn toàn mới (không phải chỉnh tham số của kiểu đã có) thì vẫn cần sửa code, không giả vờ là việc này linh hoạt vô hạn.

---

## 2. Bảng Supabase mới

Migration mới trong `supabase/migrations/`. IDE AI tự kiểm tra migration mới nhất trong thư mục và đặt timestamp sau đó (ví dụ minh hoạ: `20260808000200_tao_bang_cau_hinh_cong_thuc_diem.sql`). RLS + policy `"authenticated can manage ..."` giống các bảng khác trong dự án.

### 2a. `diem_cau_hinh_thanh_phan` — định nghĩa từng thành phần tham gia công thức

```sql
create table public.diem_cau_hinh_thanh_phan (
  ma_thanh_phan text primary key,          -- 'CC', 'VS', 'NN', 'KL', 'HT'
  ten_hien_thi text not null,
  loai_tinh text not null check (loai_tinh in ('tich_luy_danh_muc', 'trung_binh_diem_so')),
    -- tich_luy_danh_muc: kiểu CC/VS/NN/KL hiện tại
    --   = clamp(100 + SUM(diem_cong_tru cua ghi_nhan thuoc nhom_diem_lien_ket, pham_vi='ca_nhan', tuan dang xet), 0, 100)
    -- trung_binh_diem_so: kiểu HT hiện tại
    --   = AVG(diem_so_mon cua ghi_nhan WHERE loai='hoc_tap' AND diem_so_mon is not null, tuan dang xet)
  nhom_diem_lien_ket public.nhom_diem,      -- null nếu loai_tinh = 'trung_binh_diem_so'
  thang_goc_min numeric not null default 0,
  thang_goc_max numeric not null default 100,
  he_so_chuan_hoa numeric not null default 1,  -- nhân giá trị thô để quy về thang 0-100 chung
  trong_so numeric not null default 1,      -- trọng số khi gộp (xem công thức §3)
  bat_buoc boolean not null default true,   -- true: luôn tham gia dù không có ghi nhận tuần đó
                                             -- false: chỉ tham gia nếu tuần đó CÓ dữ liệu (như HT hiện tại)
  dang_bat boolean not null default true,   -- tắt hẳn 1 thành phần khỏi công thức (không xoá dữ liệu)
  thu_tu integer not null default 0,
  check (thang_goc_max > thang_goc_min),
  check (trong_so > 0),
  check (he_so_chuan_hoa > 0)
);

-- Seed = encode NGUYÊN VẸN công thức hiện tại của Lạc Hồng (trọng số 1-1-1-1-2,
-- đúng như 03-he-thong-diem-ren-luyen.md §4 đã suy luận). Thay đổi duy nhất so với
-- code cũ: HT được chuẩn hoá về 0-100 trước khi gộp (he_so_chuan_hoa=10, vì thang
-- gốc AVG(diem_so_mon) là 0-10) thay vì cộng thẳng giá trị đã nhân đôi (0-20) vào
-- tổng rồi chia 6 — đây chính là chỗ sửa lỗ hổng thang đo.
insert into public.diem_cau_hinh_thanh_phan
  (ma_thanh_phan, ten_hien_thi, loai_tinh, nhom_diem_lien_ket, thang_goc_min, thang_goc_max, he_so_chuan_hoa, trong_so, bat_buoc, thu_tu)
values
  ('CC', 'Chuyên cần',            'tich_luy_danh_muc', 'CC', 0, 100, 1,  1, true,  1),
  ('VS', 'Vệ sinh',               'tich_luy_danh_muc', 'VS', 0, 100, 1,  1, true,  2),
  ('NN', 'Nề nếp, tác phong',     'tich_luy_danh_muc', 'NN', 0, 100, 1,  1, true,  3),
  ('KL', 'Trật tự, kỷ luật',      'tich_luy_danh_muc', 'KL', 0, 100, 1,  1, true,  4),
  ('HT', 'Học tập',               'trung_binh_diem_so', null, 0, 10,  10, 2, false, 5);
```

> Vì sao `trong_so` HT = 2 trong khi 4 thành phần kia = 1: đúng cách hiểu đã chốt ở `03-he-thong-diem-ren-luyen.md` §4 ("4 nội dung đầu trọng số 1, Học tập trọng số 2, tổng trọng số 6") — giữ nguyên tỷ lệ **ý nghĩa** (kỷ luật/nề nếp ≈ 67%, học tập ≈ 33%) mà trường đã thiết kế, chỉ đổi *cách biểu diễn* để không còn nén thang điểm.

### 2b. `diem_cau_hinh_he_so_dieu_kien` — quy tắc nhân hệ số (cờ đỏ ×2)

```sql
create table public.diem_cau_hinh_he_so_dieu_kien (
  id bigint generated always as identity primary key,
  ma_dieu_kien text not null unique,
  ten_hien_thi text not null,
  ma_thanh_phan text references public.diem_cau_hinh_thanh_phan(ma_thanh_phan),
                                            -- null = áp dụng cho mọi thành phần loai_tinh='tich_luy_danh_muc'
  dieu_kien_hoc_sinh text not null,        -- tên cột boolean trên bảng hoc_sinh, vd 'la_co_do'
  chi_ap_dung_khi_am boolean not null default true,  -- true: chỉ nhân khi delta < 0 (không x2 điểm thưởng)
  he_so numeric not null default 2,
  dang_bat boolean not null default true
);

insert into public.diem_cau_hinh_he_so_dieu_kien
  (ma_dieu_kien, ten_hien_thi, ma_thanh_phan, dieu_kien_hoc_sinh, chi_ap_dung_khi_am, he_so)
values
  ('co_do_nhan_doi_loi', 'Cờ đỏ vi phạm bị trừ điểm gấp đôi', null, 'la_co_do', true, 2);
```

Đúng nguyên văn quy chế trường (`03-he-thong-diem-ren-luyen.md` §2): *"Đối với cờ đỏ khi vi phạm... sẽ bị trừ điểm gấp đôi"* — không đổi hành vi, chỉ đổi chỗ đặt hệ số `2` từ code sang dòng dữ liệu này.

### 2c. `diem_nguong_xep_loai` — ngưỡng xếp loại (1 bảng duy nhất, bỏ 2 nhánh)

```sql
create table public.diem_nguong_xep_loai (
  ma_xep_loai text primary key,      -- 'tot', 'kha', 'trung_binh', 'yeu'
  ten_hien_thi text not null,        -- 'Tốt', 'Khá', 'Trung bình', 'Yếu'
  diem_toi_thieu numeric not null,
  thu_tu integer not null,
  check (diem_toi_thieu >= 0 and diem_toi_thieu <= 100)
);

-- Đã chốt với kiến trúc sư (09/08/2026). Đây là quyết định cho hệ thống đang
-- xây dựng, tách biệt với việc Ban Thi đua Khen thưởng trường phê duyệt chính
-- thức khi hệ thống công bố dùng thật — nếu trường yêu cầu số khác, chỉ sửa
-- dữ liệu bảng này, không sửa code. Xem ví dụ minh hoạ độ chặt của ngưỡng 90 ở §5.
insert into public.diem_nguong_xep_loai (ma_xep_loai, ten_hien_thi, diem_toi_thieu, thu_tu) values
  ('yeu',         'Yếu',         0,  1),
  ('trung_binh',  'Trung bình',  50, 2),
  ('kha',         'Khá',         70, 3),
  ('tot',         'Tốt',         90, 4);
```

Vì mọi tuần giờ đều lên chung 1 thang 0–100 thật (không còn trần ~70 giả tạo ở các tuần có điểm học tập), **không cần 2 bảng ngưỡng song song nữa** — bỏ hẳn nhánh `classifyScore(score, hasStudyScore)` trong code, chỉ còn 1 lần tra bảng.

### 2d. `diem_cau_hinh_chung` — tham số toàn cục (key-value, giống pattern `dong_hanh_cau_hinh`)

```sql
create table public.diem_cau_hinh_chung (
  khoa text primary key,
  gia_tri text not null,
  mo_ta text
);

insert into public.diem_cau_hinh_chung (khoa, gia_tri, mo_ta) values
  ('lam_tron_so_thap_phan', '2', 'Số chữ số thập phân khi làm tròn điểm xếp loại.'),
  ('phien_ban_cong_thuc', 'lac_hong_2026_v2_chuan_hoa', 'Định danh phiên bản công thức — ghi vào lịch sử nếu sau này cần snapshot, xem câu hỏi mở ở §8.');
```

### RLS

```sql
alter table public.diem_cau_hinh_thanh_phan enable row level security;
alter table public.diem_cau_hinh_he_so_dieu_kien enable row level security;
alter table public.diem_nguong_xep_loai enable row level security;
alter table public.diem_cau_hinh_chung enable row level security;

create policy "authenticated can manage diem_cau_hinh_thanh_phan" on public.diem_cau_hinh_thanh_phan
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage diem_cau_hinh_he_so_dieu_kien" on public.diem_cau_hinh_he_so_dieu_kien
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage diem_nguong_xep_loai" on public.diem_nguong_xep_loai
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage diem_cau_hinh_chung" on public.diem_cau_hinh_chung
  for all to authenticated using (true) with check (true);
```

---

## 3. Công thức gộp (thay thế `(CC+VS+NN+KL+HT)/6` hay `/4`)

```
thanh_phan_co_mat = { t ∈ diem_cau_hinh_thanh_phan
                       | t.dang_bat = true
                       AND ( t.bat_buoc = true OR co_du_lieu_tuan_do(t, hoc_sinh, tuan) ) }

gia_tri_chuan_hoa(t) = tinh_gia_tri_tho(t, hoc_sinh, tuan, GhiNhan)   -- theo loai_tinh, xem §2a
                        × t.he_so_chuan_hoa
                        -- (giá trị thô của tich_luy_danh_muc đã tự clamp [thang_goc_min, thang_goc_max] = [0,100])

diem_xep_loai_thi_dua = round(
    Σ ( t.trong_so × gia_tri_chuan_hoa(t) )  for t in thanh_phan_co_mat
    ─────────────────────────────────────────────────────────────────
    Σ ( t.trong_so )                          for t in thanh_phan_co_mat
  , lam_tron_so_thap_phan )
```

`co_du_lieu_tuan_do(t, hoc_sinh, tuan)`: với `loai_tinh='trung_binh_diem_so'` → tồn tại ≥1 `ghi_nhan` với `loai='hoc_tap' AND diem_so_mon is not null AND ma_hs=... AND tuan_so=...`. Với `loai_tinh='tich_luy_danh_muc'` → luôn `true` (CC/VS/NN/KL luôn có baseline 100 dù không có bản ghi nào).

**Kiểm chứng công thức mới trùng khớp ý định gốc**: học sinh hoàn hảo tuyệt đối (không vi phạm gì, điểm 10 mọi môn) → CC=VS=NN=KL=100, HT thô=10 → HT chuẩn hoá=100 → `(1×100+1×100+1×100+1×100+2×100)/6 = 100`. Đúng ý nghĩa "hoàn hảo = 100 điểm", khác với công thức cũ chỉ cho ra 70.

**Trường hợp không có điểm học tập tuần đó**: `thanh_phan_co_mat` chỉ còn CC/VS/NN/KL, mẫu số tự động = 4 (không cần viết nhánh `if/else` riêng trong code — đây là hệ quả tự nhiên của công thức tổng quát, không phải trường hợp đặc biệt phải xử lý tay).

**Xếp loại**: 1 lần duy nhất, tra `diem_xep_loai_thi_dua` vào `diem_nguong_xep_loai` (sắp theo `thu_tu` giảm dần, chọn ngưỡng cao nhất mà điểm đạt được — cùng logic đang dùng cho bậc Tinh Tú).

**Không đổi**: hệ số điều kiện cờ đỏ (§2b) áp dụng ở bước tính `gia_tri_tho` của `tich_luy_danh_muc`, đúng vị trí `scoreDelta()` hiện tại. Cờ `can_canh_bao_ngay` (dựa vào `danh_muc_diem.nghiem_trong`) không liên quan đến công thức gộp — giữ nguyên logic cũ, không cần bảng config mới.

---

## 4. Lớp code

- **`scoring.ts`**: viết lại `calculateWeeklyStudentScore()` thành hàm đọc `diem_cau_hinh_thanh_phan`, `diem_cau_hinh_he_so_dieu_kien`, `diem_nguong_xep_loai`, `diem_cau_hinh_chung` (qua `dataSource`, cùng pattern đã dùng cho Tinh Tú), thực thi pipeline §3. **Giữ hằng số hiện tại làm fallback** khi chưa tải xong/offline — đúng nguyên tắc đã áp dụng cho `rankTinhTu.ts`.
- **Giữ nguyên chữ ký hàm** `calculateWeeklyStudentScore()` và `calculateClassWeeklyScores()` — nơi gọi không cần sửa.
- **Interface `WeeklyStudentScore`**: thêm 1 trường mới `thanh_phan: Record<string, number>` (bag tổng quát, key = `ma_thanh_phan`) để về sau trường khác có bộ thành phần khác vẫn đọc được. **Giữ nguyên các trường cũ** `diem_chuyen_can`, `diem_ve_sinh`, `diem_ne_nep`, `diem_ky_luat`, `diem_hoc_tap` — tính bằng cách tra `thanh_phan['CC']`, `thanh_phan['VS']`... để không phá vỡ mọi nơi UI/báo cáo đang đọc trực tiếp các trường này. `diem_hoc_tap` hiển thị **giữ nguyên ý nghĩa cũ** (trung bình môn × 2, thang 0–20, quen thuộc với giáo viên) — đây là phép tính hiển thị riêng, tách khỏi giá trị chuẩn hoá 0–100 dùng nội bộ công thức, tránh gây nhầm lẫn 2 con số khác nhau cho cùng 1 khái niệm.
- **`rankTinhTu.ts`**: **không cần sửa gì** — hàm `tinhRankTuan()` chỉ nhận `diemRenLuyen: number` làm tham số, không quan tâm số đó tính ra sao. Đây là điểm hay của kiến trúc hiện có: tách lớp đã tốt sẵn.
- **`RuleManagerPage.tsx`**: thêm 1 tab mới **"Công thức điểm rèn luyện"**, cùng dạng với tab "Bậc tinh tú" đã có (`12-dac-ta-rank-tinh-tu.md` §4): CRUD `diem_cau_hinh_thanh_phan` (sửa trọng số, hệ số chuẩn hoá, bật/tắt), CRUD `diem_nguong_xep_loai`, ô sửa hệ số cờ đỏ, và **xem thử ngay**: chọn 1 em + 1 tuần → hiện từng thành phần, điểm xếp loại, xếp loại — giáo viên chỉnh xong thấy kết quả liền, không deploy lại.

---

## 5. ⚠️ Thay đổi ảnh hưởng thật đến xếp loại — đọc kỹ trước khi cutover

Đây **không phải** thuần refactor kiến trúc. Với cùng dữ liệu vi phạm/điểm số, **kết quả xếp loại của các tuần có điểm học tập sẽ khác** so với hệ thống hiện tại đang chạy:

| | Công thức cũ (có lỗ hổng) | Công thức mới (đã chuẩn hoá) |
|---|---|---|
| Học sinh hoàn hảo, có điểm học tập | tối đa ~70/100 → đủ ngưỡng "Tốt" (60-70) | tối đa 100/100 → cần ≥90 mới "Tốt" theo ngưỡng đề xuất ở §2c |
| Học sinh hoàn hảo, KHÔNG có điểm học tập | 100/100 | 100/100 (không đổi) |

→ **Học sinh có điểm học tập trong tuần sẽ khó đạt "Tốt" hơn trước** với ngưỡng 90/70/50 ở §2c (vì trước đây thang bị nén nên dễ đạt "Tốt" giả tạo). Minh hoạ độ chặt: học sinh với CC=90, VS=100, NN=85, KL=100, điểm học tập trung bình 8/10 (chuẩn hoá=80) →
```
(1×90 + 1×100 + 1×85 + 1×100 + 2×80) / 6 = 535/6 = 89.17 → Khá, chưa tới 90 để đạt Tốt
```
Chỉ 1-2 lỗi nhỏ là đủ tuột từ "Tốt" xuống "Khá". **Ngưỡng 90/70/50 đã được kiến trúc sư chốt dùng cho hệ thống (09/08/2026)** — xem ghi chú đầu tài liệu. Lưu ý: đây là quyết định cho hệ thống đang xây dựng, tách biệt với việc xin xác nhận chính thức từ Ban Thi đua Khen thưởng nhà trường khi công bố dùng thật (nếu trường yêu cầu số khác, chỉ cần sửa `diem_nguong_xep_loai`, không sửa code).

**Bắt buộc trước khi cutover production**: chạy engine mới song song với `scoring.ts` cũ trên **toàn bộ** `ghi_nhan` lịch sử hiện có, liệt kê chính xác học sinh/tuần nào đổi xếp loại và đổi theo hướng nào (script đối chiếu, không phải ước lượng). Xem §7.

---

## 6. Việc KHÔNG làm

- KHÔNG xây dựng expression engine / công thức dạng chuỗi text tự do — xem lý do ở §1.
- KHÔNG thêm `school_id` hay bất kỳ cơ chế multi-tenant nào — đã chốt hướng portable đơn-trường.
- KHÔNG đổi cách xử lý bản ghi `tap_the`/`to_truc` (vẫn "Chờ xử lý", không tự động trừ điểm — nguyên tắc `03-he-thong-diem-ren-luyen.md` §2b không đổi).
- KHÔNG đổi schema `ghi_nhan`, `danh_muc_diem`, `danh_muc_xu_ly`.
- KHÔNG tự động áp ngưỡng xếp loại mới (§2c) vào báo cáo chính thức gửi phụ huynh/nhà trường khi chưa có xác nhận — chỉ dùng nội bộ/xem thử cho đến khi giáo viên duyệt.
- KHÔNG âm thầm cutover — bắt buộc chạy script đối chiếu ở §7 trước.

---

## 7. Kế hoạch kiểm thử & đối chiếu trước khi cutover

1. **Script đối chiếu** (chạy 1 lần, không phải tính năng UI): với mọi `(ma_hs, tuan_so)` có `ghi_nhan` trong CSDL thật, tính `diem_xep_loai_thi_dua` và `xep_loai` bằng cả 2 cách — công thức cũ (`scoring.ts` hiện tại) và engine mới — xuất báo cáo dạng bảng: mã HS, tuần, điểm cũ, điểm mới, xếp loại cũ, xếp loại mới, có đổi hay không. Giáo viên xem báo cáo này trước khi merge.
2. Trên trình duyệt thật: sửa `trong_so` của 1 thành phần trên tab quản lý mới → mở lại hồ sơ 1 em → điểm đổi theo ngay, không cần deploy.
3. Sửa `diem_toi_thieu` trong `diem_nguong_xep_loai` → xác nhận xếp loại đổi theo.
4. Tắt `dang_bat` của 1 thành phần (vd VS) → xác nhận công thức tự loại bỏ, mẫu số tự điều chỉnh, không lỗi chia 0.
5. 1 em có `la_co_do=true` vi phạm → xác nhận vẫn nhân đôi đúng như trước (hành vi cờ đỏ không đổi).
6. Tuần không có điểm học tập nào → xác nhận công thức tự rơi về chỉ 4 thành phần, không hiện lỗi "chưa có dữ liệu" bị tính là 0.
7. Đối chiếu thẻ Tinh Tú (`rank_lich_su_tuan`) của 1 em trước/sau — xác nhận `rankTinhTu.ts` vẫn chạy đúng vì chỉ nhận `diemRenLuyen` làm input, không phụ thuộc cách tính bên trong.
8. Rà lại các nơi tiêu thụ `WeeklyStudentScore` (báo cáo tuần/tháng doc 08-09, export docx/pdf) — xác nhận `diem_chuyen_can`, `diem_hoc_tap`... vẫn hiển thị đúng nhờ lớp tương thích ngược ở §4.

---

## 8. Nhật ký quyết định (đã chốt toàn bộ với kiến trúc sư 08–09/08/2026)

1. ~~Ngưỡng xếp loại 90/70/50 ở §2c có dùng luôn không?~~ **→ Đã chốt (09/08/2026): dùng 90/70/50, seed thẳng như §2c.** Xem ví dụ minh hoạ độ chặt ở §5.
2. **~~Có cần snapshot điểm mỗi khi báo cáo tuần được xuất/ký không?~~ → Đã chốt (09/08/2026): CHƯA cần.** Hệ thống điểm đang trong giai đoạn xây dựng, chưa công bố chính thức với học sinh/phụ huynh — nên khi đổi công thức, đổi luôn cho toàn bộ các tuần đã qua (không giữ lịch sử theo công thức cũ). Việc snapshot điểm gốc (khác với `rank_lich_su_tuan` — cái đó vẫn snapshot bình thường vì đã có cơ chế upsert-khi-xem sẵn) chỉ cần làm **khi hệ thống điểm đã ổn định và được công bố chính thức** — lúc đó sẽ viết spec riêng, không nằm trong phạm vi tài liệu này.
3. **~~TODO cũ ở `03-he-thong-diem-ren-luyen.md` §3 (tổng số tiết trong tuần)~~ → Đã làm rõ (09/08/2026): không ảnh hưởng công thức hiện tại.** `calculateStudyScore()` đang dùng cách 2 (trung bình trên các tiết ĐÃ có `diem_so_mon`, không dùng "tổng số tiết theo thời khoá biểu" làm mẫu số) — nên tiết trống dù là (a) thời khoá biểu vốn không xếp, hay (b) có xếp nhưng giáo viên vắng, đều tự động không có `diem_so_mon` và bị loại khỏi mẫu số như nhau, không cần phân biệt. Sự phân biệt (a)/(b) chỉ cần quyết định **nếu sau này đổi sang cách 1** (mẫu số = tổng số tiết theo thời khoá biểu cả tuần) — hiện không nằm trong phạm vi tài liệu này, để mở cho tới khi có nhu cầu đổi.

---

## 9. Mã commit & phản hồi

Tự đọc `PROGRESS.md` lấy số C tiếp theo (thay `C0XX`). Nếu IDE AI thấy điều gì trong đặc tả này không khớp với dữ liệu thật khi triển khai (vd cách `co_du_lieu_tuan_do()` xác định "có dữ liệu tuần đó" chưa đúng thực tế phiếu nhập), ghi vào block `[KN-xx]` theo mẫu đã dùng ở `11-dac-ta-he-thong-dong-hanh.md`, gửi lại kiến trúc sư rà trước khi tự ý đổi công thức.

**Trước khi đánh dấu commit hoàn thành trong `PROGRESS.md`**: phải có kết quả script đối chiếu ở §7 mục 1 đính kèm — không đánh dấu "done" chỉ vì code chạy không lỗi (đúng bài học đã ghi nhận từ sự cố C001–C027).
