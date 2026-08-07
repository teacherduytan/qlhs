# 12 — Đặc tả dữ liệu: Hệ thống Rank "Tinh Tú" theo tuần

> Nối tiếp `11-dac-ta-he-thong-dong-hanh.md`. Phần này thêm lớp **xếp bậc/thăng cấp theo tuần** phong cách game lên trên hệ thống đồng hành đã có. Đi kèm 2 file code mẫu đã bàn: `rankTinhTu.ts` (dữ liệu + hàm tính) và `TheNhanVatTuan.tsx` (thẻ hiển thị). Tài liệu này mô tả phần **dữ liệu hệ thống** để IDE AI triển khai đúng và bền.
>
> **Nguyên tắc kiến trúc (giữ nguyên như tài liệu 11)**: ngưỡng bậc, mức thưởng huy hiệu **KHÔNG hardcode** — nằm trong bảng Supabase, sửa được qua trang quản lý luật, không cần deploy lại. 2 file `.ts` mẫu chỉ là **seed khởi đầu + khai báo kiểu**; giá trị thật đọc từ CSDL.
>
> **Bắt buộc đọc trước khi code**: tài liệu 11 (đã định nghĩa lớp chỉ số + huy hiệu), `src/features/scoring/scoring.ts` (điểm rèn luyện tuần đã có sẵn), và 2 file mẫu nói trên.

---

## 1. Điểm tuần được tính thế nào (chốt với giáo viên: kết hợp cả hai)

```
điểm_tuần = điểm_rèn_luyện_tuần  +  (số_huy_hiệu_đạt × điểm_thưởng_mỗi_huy_hiệu)
```

- **điểm_rèn_luyện_tuần**: tái dùng nguyên hàm đã có trong `scoring.ts` (trung bình/tổng hợp 4 nhóm CC/VS/NN/KL theo tuần). **Không viết lại cách tính điểm.** Cần xác nhận thang thực tế mà `scoring.ts` trả về (0–100 hay khác) để đặt mốc bậc cho khớp — nếu lệch thang, ghi vào mục Phản hồi ở tài liệu 11.
- **số_huy_hiệu_đạt**: đếm huy hiệu tuần đó từ hệ thống ở tài liệu 11 (`dong_hanh_huy_hieu` áp lên chỉ số của em).
- **điểm_thưởng_mỗi_huy_hiệu**: mặc định 4, để trong cấu hình (mục 2c), giáo viên chỉnh được.

## 2. Các bảng Supabase mới

Migration mới trong `supabase/migrations/`. RLS + policy `"authenticated can manage ..."` giống các bảng khác. Tên cột snake_case không dấu.

### 2a. `rank_bac_tinh_tu` — định nghĩa thang bậc (sửa được trên web)

```sql
create table public.rank_bac_tinh_tu (
  bac integer primary key,             -- 1..7, càng cao càng mạnh
  ma text not null unique,             -- 'sao_bang', 'mat_troi'... (dùng lưu lịch sử)
  ten text not null,                   -- 'Sao Băng', 'Mặt Trời'
  icon text not null,                  -- emoji: '☄️', '☀️'
  diem_toi_thieu numeric not null,     -- điểm_tuần >= mốc này thì đạt bậc này
  mo_ta text,                          -- câu ngắn cho học sinh hiểu ý nghĩa
  dang_bat boolean not null default true,
  check (diem_toi_thieu >= 0)
);
```

Seed 7 bậc đúng như `rankTinhTu.ts` (Sao Băng 0 → Sao Nhỏ 50 → Hành Tinh 65 → Mặt Trăng 75 → Mặt Trời 85 → Chòm Sao 95 → Thiên Hà 105). Ghi comment trong migration: đây là mốc mặc định, giáo viên chỉnh qua trang quản lý.

> Vì sao mốc để trong bảng chứ không cứng trong code: giáo viên sẽ tinh chỉnh độ khó khi dùng thử thực tế (bậc cao quá không ai đạt, hoặc thấp quá ai cũng Thiên Hà thì mất ý nghĩa). Đây chính là lý do toàn hệ thống thiết kế "luật là dữ liệu".

### 2b. `rank_lich_su_tuan` — lưu bậc từng em từng tuần (để reset tuần nhưng xem lại được)

Bậc **reset mỗi tuần** (mỗi tuần tính lại từ đầu), nhưng lưu snapshot để xem lịch sử và so với tuần trước.

```sql
create table public.rank_lich_su_tuan (
  id bigint generated always as identity primary key,
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  tuan_so integer not null references public.cau_hinh_tuan(tuan_so) on update cascade,
  diem_ren_luyen numeric not null,     -- điểm gốc lúc chốt
  so_huy_hieu integer not null default 0,
  diem_thuong numeric not null default 0,
  diem_tuan numeric not null,          -- tổng cuối
  bac_dat integer not null references public.rank_bac_tinh_tu(bac),
  thoi_diem_chot timestamptz not null default now(),
  unique (ma_hs, tuan_so)              -- mỗi em mỗi tuần 1 dòng, tính lại thì upsert
);
```

**Cách ghi**: không sinh sẵn hàng loạt. Khi trang cá nhân/thẻ nhân vật của một em được mở cho một tuần, tính rank rồi **upsert** vào bảng này (last-write-wins). Nhờ vậy dữ liệu lịch sử tự đầy dần theo thực tế sử dụng, và "Tuần trước: 🌙 Mặt Trăng" tra được từ dòng `tuan_so - 1`.

> Cân nhắc kỹ thuật cho IDE AI: nếu thấy việc upsert-khi-xem gây khó (ví dụ học sinh xem bản công khai không có quyền ghi), thì tách — bản công khai chỉ ĐỌC `rank_lich_su_tuan`, còn việc ghi/chốt do phía giáo viên (hoặc một RPC `security definer`) làm. Nếu chọn hướng này, ghi vào mục Phản hồi tài liệu 11 để thống nhất.

### 2c. Cấu hình chung — thêm vào bảng cấu hình luật đã có, KHÔNG tạo bảng lẻ

Thêm `diem_thuong_moi_huy_hieu` (mặc định 4) vào nơi lưu cấu hình chung của hệ thống đồng hành. Nếu tài liệu 11 chưa có bảng cấu hình dạng key-value, tạo 1 bảng nhỏ:

```sql
create table if not exists public.dong_hanh_cau_hinh (
  khoa text primary key,               -- 'diem_thuong_moi_huy_hieu'
  gia_tri text not null,               -- lưu dạng text, code parse
  mo_ta text
);
insert into public.dong_hanh_cau_hinh (khoa, gia_tri, mo_ta)
values ('diem_thuong_moi_huy_hieu', '4', 'Điểm cộng thêm cho mỗi huy hiệu đạt trong tuần, dùng khi xếp bậc tinh tú.')
on conflict (khoa) do nothing;
```

## 3. Lớp code

- `src/features/companion/rankTinhTu.ts`: dùng file mẫu đã gửi làm nền, **sửa lại để đọc `THANG_TINH_TU` và `DIEM_THUONG_MOI_HUY_HIEU` từ CSDL** thay vì hằng số cứng (giữ hằng số làm fallback khi chưa tải xong / offline). Hàm `tinhRankTuan()` giữ nguyên chữ ký.
- `src/features/companion/TheNhanVatTuan.tsx`: dùng file mẫu đã gửi. Nhận dữ liệu đã tính qua props, không tự query.
- Nơi gọi: trang cá nhân học sinh (mục 6 tài liệu 11). Thẻ nhân vật đặt **trên cùng**, trước các phần lời mở đầu/huy hiệu/điều cần chú ý — vì đây là thứ học sinh muốn thấy đầu tiên.
- Nối dữ liệu: điểm rèn luyện từ `scoring.ts`; số huy hiệu từ lớp áp luật huy hiệu (tài liệu 11); truyền vào `tinhRankTuan()`; kết quả đưa vào `<TheNhanVatTuan>`. Tra `rank_lich_su_tuan` tuần trước để hiện `bacTuanTruoc`.

## 4. Trang quản lý luật — thêm tab

Trong `RuleManagerPage.tsx` (tài liệu 11 mục 5), thêm 1 tab **"Bậc tinh tú"**:
- Bảng CRUD cho `rank_bac_tinh_tu`: sửa tên, icon, mốc điểm `diem_toi_thieu`, bật/tắt từng bậc.
- Ô sửa `diem_thuong_moi_huy_hieu`.
- **Xem thử ngay**: chọn 1 em + 1 tuần → hiện điểm rèn luyện, số huy hiệu, điểm tuần, bậc đạt — để giáo viên chỉnh mốc và thấy kết quả liền (giống cơ chế preview đã có).

## 5. Hiển thị ở bản công khai — ranh giới an toàn

- Thẻ nhân vật + bậc + huy hiệu + điểm tuần: **hiện tự động** cho học sinh/phụ huynh (đây là con số khách quan, không phải nhận xét, nên không cần duyệt — thống nhất với nguyên tắc tài liệu 11).
- Mở rộng `lay_ho_so_cong_khai` (SECURITY DEFINER) trả thêm dữ liệu rank tuần đang xem + bậc tuần trước.
- **Tuyệt đối không** biến rank thành bảng xếp hạng công khai để học sinh so kè nhau (đã cảnh báo ở tài liệu 10 mục 4/7). Mỗi em chỉ thấy thẻ của chính mình; không có màn hình "top lớp".

## 6. Việc KHÔNG làm

- KHÔNG bảng xếp hạng công khai giữa các học sinh.
- KHÔNG hardcode mốc bậc / điểm thưởng trong TypeScript (chỉ để làm fallback).
- KHÔNG dùng rank để trừng phạt (không "bị tụt hạng thì phạt") — đây là công cụ ghi nhận, không phải hình phạt.
- KHÔNG gọi API AI ngoài.

## 7. Kiểm thử bắt buộc trên trình duyệt thật

1. Một em điểm rèn luyện cao + vài huy hiệu → xác nhận bậc, thanh tiến độ, "còn N điểm" tính đúng.
2. Sửa mốc `diem_toi_thieu` của 1 bậc trên trang quản lý → mở lại thẻ 1 em → bậc đổi theo, **không cần deploy**.
3. Đổi `diem_thuong_moi_huy_hieu` từ 4 → 8 → xác nhận điểm tuần và bậc thay đổi.
4. Xem 2 tuần liên tiếp của 1 em → "Tuần trước: ..." hiện đúng bậc tuần trước từ `rank_lich_su_tuan`.
5. Mở bản công khai (link học sinh) → thấy thẻ nhân vật; xác nhận **không** có màn hình xếp hạng giữa các em.
6. Em ở bậc cao nhất (Thiên Hà) → thẻ hiện trạng thái "đã đạt bậc cao nhất", không vỡ thanh tiến độ.

## 8. Mã commit & phản hồi

Tự đọc `PROGRESS.md` lấy số C tiếp theo. Nếu có khuyến nghị điều chỉnh (vd thang điểm `scoring.ts` khác giả định, hay cách ghi `rank_lich_su_tuan` cần đổi), ghi vào **mục 11 Phản hồi của tài liệu 11** theo mẫu `[KN-xx]`, giáo viên gửi lại kiến trúc sư rà.
