# Hướng dẫn: thiết kế lại hệ thống điểm danh cho Supabase (dựa theo logic Excel gốc)

> File Excel gốc (`Diem_danh_11C5...xlsx`) dùng mô hình "1 sheet/tuần × 1 sheet/mục đích" vì Google Sheets không có JOIN/WHERE thật — đây là cách lách giới hạn công cụ, **không phải chuẩn thiết kế cần giữ nguyên**. Thiết kế dưới đây tổng quát hóa lại cho CSDL quan hệ, dùng chung 1 mô hình cho mọi "danh sách theo mục đích" (không riêng điểm danh).
>
> Đưa file này cho IDE AI.

## 0. Mô hình tổng quát

Thay vì tách sheet theo mục đích, dùng: **1 roster gốc (`hoc_sinh`, đã có) + định nghĩa "nhóm mục đích" (`nhom_diem_danh`) + bảng thành viên nối 2 cái lại (`thanh_vien_nhom_diem_danh`)**. Muốn thêm mục đích mới (câu lạc bộ, đội tuyển...) sau này chỉ cần thêm 1 dòng dữ liệu, không cần bảng mới.

## 1. Migration schema

```sql
-- Định nghĩa từng nhóm điểm danh (dữ liệu, không phải cấu trúc bảng)
create table public.nhom_diem_danh (
  ma_nhom text primary key,
  ten_nhom text not null,
  so_buoi_ngay smallint not null default 1,  -- Chính khóa = 2 (sáng+chiều), còn lại = 1
  ghi_chu text
);

insert into public.nhom_diem_danh (ma_nhom, ten_nhom, so_buoi_ngay, ghi_chu) values
  ('CHINH_KHOA', 'Điểm danh chính khóa', 2, 'Cả lớp 11C5, tách buổi Sáng/Chiều'),
  ('AN_TRUA', 'Điểm danh ăn trưa', 1, 'Chỉ học sinh diện BT/NT của 11C5'),
  ('NGU_TRUA', 'Điểm danh ngủ trưa', 1, 'Nhóm gộp 11C5 + 11C3, nam BT/NT, có thêm trạng thái vắng buổi sáng riêng');

-- Học sinh "ngoài lớp" (ví dụ 11C3 trong nhóm Ngủ trưa) — hồ sơ RÚT GỌN,
-- không đầy đủ như hoc_sinh vì không thuộc quyền quản lý của GVCN 11C5
create table public.hoc_sinh_ngoai_lop (
  ma_hs_ngoai text primary key,
  ho_ten text not null,
  lop text not null,
  sdt text
);

-- Thành viên từng nhóm — thay thế "danh sách gốc theo từng mục đích" của Sheets
create table public.thanh_vien_nhom_diem_danh (
  ma_nhom text not null references public.nhom_diem_danh(ma_nhom),
  ma_hs text references public.hoc_sinh(ma_hs),
  ma_hs_ngoai text references public.hoc_sinh_ngoai_lop(ma_hs_ngoai),
  check ((ma_hs is not null) <> (ma_hs_ngoai is not null))
);
create unique index uniq_thanh_vien_nhom
  on public.thanh_vien_nhom_diem_danh (ma_nhom, coalesce(ma_hs, ma_hs_ngoai));

-- Seed thành viên CHINH_KHOA: toàn bộ 36 học sinh
insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'CHINH_KHOA', ma_hs from public.hoc_sinh;

-- Seed thành viên AN_TRUA: chỉ diện BT/NT
insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'AN_TRUA', ma_hs from public.hoc_sinh where dien in ('BT','NT');

-- Seed thành viên NGU_TRUA: nam, diện BT/NT của 11C5
-- (phần học sinh 11C3 thêm sau, xem mục 2 — cần nhập tay vào hoc_sinh_ngoai_lop trước)
insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'NGU_TRUA', ma_hs from public.hoc_sinh where dien in ('BT','NT') and nu = false;

-- Bảng điểm danh — CHỈ GHI NGOẠI LỆ, giữ đúng triết lý "để trống = có mặt" của Sheets gốc
create table public.diem_danh (
  id uuid primary key default gen_random_uuid(),
  ma_nhom text not null references public.nhom_diem_danh(ma_nhom),
  ma_hs text references public.hoc_sinh(ma_hs),
  ma_hs_ngoai text references public.hoc_sinh_ngoai_lop(ma_hs_ngoai),
  ngay date not null,
  tuan_so integer not null references public.cau_hinh_tuan(tuan_so),
  buoi text not null default 'ca_ngay' check (buoi in ('sang','chieu','ca_ngay')),
  trang_thai text not null check (
    trang_thai in ('vang_co_phep','vang_khong_phep','tre','vang_co_phep_sang','vang_khong_phep_sang')
  ),
  ghi_chu text,
  nguoi_ghi text,
  created_at timestamptz default now(),
  check ((ma_hs is not null) <> (ma_hs_ngoai is not null))
);
create unique index uniq_diem_danh
  on public.diem_danh (ma_nhom, coalesce(ma_hs, ma_hs_ngoai), ngay, buoi);
create index idx_diem_danh_tuan on public.diem_danh (tuan_so);
create index idx_diem_danh_ngay on public.diem_danh (ngay);

-- Liên lạc phụ huynh — gắn trực tiếp với đúng lượt vắng, thay cho công thức tô đỏ thủ công
create table public.lien_lac_phu_huynh (
  id uuid primary key default gen_random_uuid(),
  diem_danh_id uuid not null references public.diem_danh(id) on delete cascade,
  hinh_thuc text check (hinh_thuc in ('dien_thoai','goi_zalo','nhan_tin_zalo','sms')),
  noi_dung text,
  nguoi_lien_lac text,
  thoi_gian timestamptz default now()
);

-- Cấp quyền + RLS — theo đúng mẫu đã áp dụng cho các bảng trước
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.nhom_diem_danh,
  public.hoc_sinh_ngoai_lop,
  public.thanh_vien_nhom_diem_danh,
  public.diem_danh,
  public.lien_lac_phu_huynh
to authenticated;

alter table public.nhom_diem_danh enable row level security;
alter table public.hoc_sinh_ngoai_lop enable row level security;
alter table public.thanh_vien_nhom_diem_danh enable row level security;
alter table public.diem_danh enable row level security;
alter table public.lien_lac_phu_huynh enable row level security;

create policy "authenticated can manage nhom_diem_danh" on public.nhom_diem_danh
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage hoc_sinh_ngoai_lop" on public.hoc_sinh_ngoai_lop
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage thanh_vien_nhom_diem_danh" on public.thanh_vien_nhom_diem_danh
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage diem_danh" on public.diem_danh
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage lien_lac_phu_huynh" on public.lien_lac_phu_huynh
  for all to authenticated using (true) with check (true);
```

## 2. Việc cần làm tay trước khi chạy migration (thầy tự làm)

- Xác nhận danh sách học sinh 11C3 tham gia nhóm Ngủ trưa (họ tên, SĐT nếu có) — Excel ghi chú "CHƯA CÓ SĐT của 11C3", nên phần này vốn đã thiếu ở bản gốc. Sau khi migration chạy, nhập tay các dòng này vào `hoc_sinh_ngoai_lop` qua Table Editor, rồi thêm vào `thanh_vien_nhom_diem_danh` với `ma_nhom = 'NGU_TRUA'`.
- Nếu chưa muốn triển khai "Ăn trưa"/"Ngủ trưa" ngay (xem mục 5 — mức độ ưu tiên), có thể tạo bảng trước nhưng chưa cần nhập liệu, không ảnh hưởng gì.

## 3. Di chuyển dữ liệu lịch sử từ Excel/Sheets

**Chỉ cần import các dòng NGOẠI LỆ** (Vắng có phép/Vắng không phép/Trễ...) — không cần import các ô "có mặt" (mặc định, để trống), vì bảng `diem_danh` chỉ lưu ngoại lệ giống hệt nguyên tắc gốc. Đây là điểm giúp việc import nhẹ hơn hẳn so với các bảng khác.

Với mỗi sheet `Chính khóa - Tuần N`: quét từng ô có giá trị khác rỗng trong vùng ngày/buổi (cột F trở đi), map thành 1 dòng `diem_danh` với `ma_nhom = 'CHINH_KHOA'`, `buoi` tương ứng Sáng/Chiều, `ngay` lấy từ header cột, `tuan_so = N`.

Map giá trị tiếng Việt sang enum:
- "Vắng có phép" → `vang_co_phep`
- "Vắng không phép" → `vang_khong_phep`
- "Trễ" → `tre`
- "Vắng có phép (sáng)" → `vang_co_phep_sang` (chỉ dùng cho nhóm NGU_TRUA)
- "Vắng không phép (sáng)" → `vang_khong_phep_sang` (chỉ dùng cho nhóm NGU_TRUA)

Tương tự cho `Ăn trưa - Tuần N` (`ma_nhom = 'AN_TRUA'`, `buoi = 'ca_ngay'`) và `Ngủ trưa - Tuần N` (`ma_nhom = 'NGU_TRUA'`, `buoi = 'ca_ngay'`, cần map cột "Lớp" trong sheet sang `ma_hs` (nếu 11C5) hoặc `ma_hs_ngoai` (nếu 11C3, sau khi đã nhập ở mục 2).

Với `Liên lạc PH - Tuần N`: mỗi ô đã điền "Hình thức liên lạc" + "Nội dung ghi nhận" tương ứng với đúng 1 dòng `diem_danh` (cùng học sinh, ngày) — insert vào `lien_lac_phu_huynh` với `diem_danh_id` tra theo (ma_hs, ngay).

## 4. Sinh `ghi_nhan` (chuyên cần) từ `diem_danh` — CẦN QUYẾT ĐỊNH THÊM, CHƯA TỰ LÀM

`ghi_nhan.loai = 'chuyen_can'` đã tồn tại sẵn trong schema — đúng hướng để biến các vi phạm chuyên cần lặp lại thành điểm thi đua trừ. Nhưng **quy tắc cụ thể (bao nhiêu lần vắng/trễ thì trừ bao nhiêu điểm, ứng với `ma_danh_muc` nào trong nhóm CC)** nằm trong tài liệu rubric thi đua chính thức của trường, không có trong Excel điểm danh này.

**Không tự đoán ngưỡng hay tự tạo mã danh mục mới cho việc này** — theo đúng nguyên tắc đã áp dụng xuyên suốt dự án. Việc cần làm: đối chiếu `danh_muc_diem` nhóm `CC` hiện có, xác nhận với thầy Tân mã nào ứng với "vắng không phép" / "đi trễ" theo đúng rubric, rồi mới viết hàm/trigger sinh `ghi_nhan` tự động — có cơ chế chống trùng (ví dụ 1 unique constraint hoặc kiểm tra đã tồn tại `ghi_nhan` cho cùng tuần/học sinh/lý do trước khi tạo mới).

## 5. Mức độ ưu tiên triển khai — không làm tất cả cùng lúc

Theo báo cáo trước, app hiện tại **mới chỉ code phần "Chính khóa"**, còn "Ăn trưa"/"Ngủ trưa" vẫn hoàn toàn thủ công trên Excel. Đề xuất thứ tự:

1. **Ưu tiên 1**: chuyển "Chính khóa" sang bảng `diem_danh` (nhóm `CHINH_KHOA`) + viết lại `calculateAttendanceReport` đọc từ Supabase thay vì Sheet (bắt buộc, vì Sheet sẽ ngừng cập nhật) + "Liên lạc PH" theo mục 6.
2. **Ưu tiên 2** (làm sau, không gấp): "Ăn trưa" — logic đơn giản hơn Ngủ trưa, không có vấn đề đa lớp.
3. **Ưu tiên 3** (làm sau cùng): "Ngủ trưa" — cần xử lý thêm `hoc_sinh_ngoai_lop` (11C3), phức tạp nhất.
4. **Việc tách riêng, không phụ thuộc thứ tự trên**: mục 4 (sinh `ghi_nhan` tự động) — chỉ làm sau khi đã có đủ dữ liệu `diem_danh` thật và đã chốt quy tắc với thầy Tân.

## 6. Viết lại `calculateAttendanceReport` (báo cáo sĩ số)

Hàm hiện tại đọc Sheet `Diem_danh_11C5` để tính: số có mặt theo diện (`2B`/`BT`/`NT`) và danh sách học sinh vắng, cho 1 ngày + 1 buổi cụ thể. Sau khi Chính khóa chuyển sang `diem_danh`, viết lại theo hướng:

```sql
-- Số có mặt theo diện, cho 1 ngày + 1 buổi
select hs.dien, count(*) as so_luong
from public.thanh_vien_nhom_diem_danh tv
join public.hoc_sinh hs on hs.ma_hs = tv.ma_hs
where tv.ma_nhom = 'CHINH_KHOA'
  and not exists (
    select 1 from public.diem_danh dd
    where dd.ma_hs = hs.ma_hs
      and dd.ngay = :ngay_can_tinh
      and dd.buoi = :buoi_can_tinh
  )
group by hs.dien;

-- Danh sách vắng cùng ngày/buổi đó
select hs.ho, hs.ten, dd.trang_thai
from public.diem_danh dd
join public.hoc_sinh hs on hs.ma_hs = dd.ma_hs
where dd.ma_nhom = 'CHINH_KHOA' and dd.ngay = :ngay_can_tinh and dd.buoi = :buoi_can_tinh
  and dd.trang_thai in ('vang_co_phep', 'vang_khong_phep');
```

`buildAttendanceFormUrl` (tạo link Google Form prefill) **không cần đổi** — vẫn nhận kết quả tính toán ở trên rồi build URL như cũ. 8 ô số suất ăn vẫn là nhập tay trên UI, không liên quan bảng `diem_danh`.

## 7. "Tổng hợp năm học" — không cần bảng riêng

Thay cho việc "nhờ Claude cộng dồn thêm dòng mỗi khi thêm tuần mới", giờ chỉ là 1 câu `GROUP BY`:

```sql
select tuan_so, ma_nhom, trang_thai, count(*) 
from public.diem_danh
group by tuan_so, ma_nhom, trang_thai
order by tuan_so, ma_nhom;
```

Luôn khớp thực tế, không cần đồng bộ thủ công.

## 8. Checklist trước khi báo hoàn thành (áp dụng riêng cho Ưu tiên 1)

- [x] Bảng `nhom_diem_danh`, `hoc_sinh_ngoai_lop`, `thanh_vien_nhom_diem_danh`, `diem_danh`, `lien_lac_phu_huynh` đã tạo, RLS + grant đầy đủ
- [x] Dữ liệu lịch sử "Chính khóa" 4 tuần đã import vào `diem_danh` (chỉ các ô ngoại lệ), đối chiếu số dòng khớp số ô đã điền trong Excel
- [x] `calculateAttendanceReport` đã đọc từ Supabase, không còn đọc Sheet khi giáo viên đã đăng nhập Supabase
- [ ] Tự kiểm tra thật: mở trang Báo cáo sĩ số, chọn 1 ngày/buổi có học sinh vắng trong dữ liệu đã import, xác nhận số liệu đúng
- [x] Không tự tạo `ghi_nhan` chuyên cần tự động khi chưa xác nhận quy tắc với thầy Tân (mục 4)
- [x] "Ăn trưa"/"Ngủ trưa" (Ưu tiên 2-3) chưa cần hoàn thành trong đợt này

## 9. Trạng thái triển khai C127/C128 (23/07/2026)

- Đã apply migration `20260723000500_thiet_ke_diem_danh_supabase.sql` lên Supabase.
- Số dòng seed hiện tại: `nhom_diem_danh` = 3, `CHINH_KHOA` = 36 học sinh, `AN_TRUA` = 17 học sinh, `NGU_TRUA` = 7 học sinh.
- RPC `tinh_bao_cao_si_so` đã kiểm tra với ngày `2026-07-20`, buổi sáng: trả tổng `2B=19`, `BT=16`, `NT=1`.
- `src/data/SupabaseDataSource.ts` đã chuyển `calculateAttendanceReport` sang gọi RPC Supabase; `buildAttendanceFormUrl` vẫn dùng Apps Script để tạo Google Form prefill.
- Ngày 23/07/2026 đã nhận 2 CSV đã trích từ Excel điểm danh gốc và import xong dữ liệu thật: `chinh_khoa_ngoai_le_4tuan.csv` có 22 dòng ngoại lệ, đã upsert thành 22 dòng `diem_danh`; `lien_lac_ph_da_ghi_4tuan.csv` có 15 lượt liên lạc, nở thành 22 dòng `lien_lac_phu_huynh` vì một số lượt áp dụng cho cả sáng và chiều.
- Không có học sinh nào trong CSV bị lệch tên khi khớp với `hoc_sinh.ho || ' ' || hoc_sinh.ten`.
- RPC `tinh_bao_cao_si_so('2026-07-09'::date, 'sang', true)` trả tổng `2B=19`, `BT=16`, `NT=1`; có mặt `2B=17`, `BT=15`, `NT=1`; danh sách vắng gồm Đỗ Tâm Nhi, Nguyễn Như Quỳnh, Hoàng Thị Ngọc Trâm.
- Chưa tự bấm UI bằng trình duyệt tự động vì `.env` chỉ có `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, không có tài khoản test hoặc session giáo viên Supabase. Khi có session, mở `/#/bao-cao-si-so`, chọn `09/07/2026` + `Sáng`, bấm `Tính toán` để kiểm màn hình hiển thị đúng dữ liệu RPC ở trên.
