-- Cau hinh hoa cong thuc tinh diem ren luyen tuan (xem docs/13-cau-hinh-hoa-cong-thuc-diem-ren-luyen.md)
-- Nguyen tac: pipeline tinh toan van co dinh trong code (scoring.ts), chi THAM SO cua tung buoc
-- (trong so, he so chuan hoa, nguong xep loai, he so dieu kien) nam trong cac bang duoi day.

-- ============================================================
-- BANG: diem_cau_hinh_thanh_phan
-- Dinh nghia tung thanh phan tham gia cong thuc diem xep loai thi dua tuan.
-- ============================================================
create table public.diem_cau_hinh_thanh_phan (
  ma_thanh_phan text primary key,
  ten_hien_thi text not null,
  loai_tinh text not null check (loai_tinh in ('tich_luy_danh_muc', 'trung_binh_diem_so')),
  nhom_diem_lien_ket public.nhom_diem,
  thang_goc_min numeric not null default 0,
  thang_goc_max numeric not null default 100,
  he_so_chuan_hoa numeric not null default 1,
  trong_so numeric not null default 1,
  bat_buoc boolean not null default true,
  dang_bat boolean not null default true,
  thu_tu integer not null default 0,
  check (thang_goc_max > thang_goc_min),
  check (trong_so > 0),
  check (he_so_chuan_hoa > 0),
  check (
    (loai_tinh = 'tich_luy_danh_muc' and nhom_diem_lien_ket is not null)
    or (loai_tinh = 'trung_binh_diem_so' and nhom_diem_lien_ket is null)
  )
);

-- Seed = encode nguyen ven cong thuc hien tai cua Lac Hong (trong so 1-1-1-1-2), da sua
-- lo hong thang do: HT duoc chuan hoa ve 0-100 truoc khi gop (he_so_chuan_hoa=10, vi thang
-- goc AVG(diem_so_mon) la 0-10) thay vi cong thang gia tri da nhan doi (0-20) vao tong roi
-- chia chung mau so voi 4 thanh phan con lai dang thang 0-100.
insert into public.diem_cau_hinh_thanh_phan
  (ma_thanh_phan, ten_hien_thi, loai_tinh, nhom_diem_lien_ket, thang_goc_min, thang_goc_max, he_so_chuan_hoa, trong_so, bat_buoc, thu_tu)
values
  ('CC', 'Chuyên cần',            'tich_luy_danh_muc',  'CC', 0, 100, 1,  1, true,  1),
  ('VS', 'Vệ sinh',               'tich_luy_danh_muc',  'VS', 0, 100, 1,  1, true,  2),
  ('NN', 'Nề nếp, tác phong',     'tich_luy_danh_muc',  'NN', 0, 100, 1,  1, true,  3),
  ('KL', 'Trật tự, kỷ luật',      'tich_luy_danh_muc',  'KL', 0, 100, 1,  1, true,  4),
  ('HT', 'Học tập',               'trung_binh_diem_so', null, 0, 10,  10, 2, false, 5);

-- ============================================================
-- BANG: diem_cau_hinh_he_so_dieu_kien
-- Quy tac nhan he so theo dieu kien hoc sinh (vd co do bi tru diem gap doi).
-- ============================================================
create table public.diem_cau_hinh_he_so_dieu_kien (
  id bigint generated always as identity primary key,
  ma_dieu_kien text not null unique,
  ten_hien_thi text not null,
  ma_thanh_phan text references public.diem_cau_hinh_thanh_phan(ma_thanh_phan) on update cascade on delete cascade,
  dieu_kien_hoc_sinh text not null,
  chi_ap_dung_khi_am boolean not null default true,
  he_so numeric not null default 2,
  dang_bat boolean not null default true
);

insert into public.diem_cau_hinh_he_so_dieu_kien
  (ma_dieu_kien, ten_hien_thi, ma_thanh_phan, dieu_kien_hoc_sinh, chi_ap_dung_khi_am, he_so)
values
  ('co_do_nhan_doi_loi', 'Cờ đỏ vi phạm bị trừ điểm gấp đôi', null, 'la_co_do', true, 2);

-- ============================================================
-- BANG: diem_nguong_xep_loai
-- Nguong xep loai duy nhat (khong con 2 nhanh song song 0-100 vs "60/45/30").
-- ============================================================
create table public.diem_nguong_xep_loai (
  ma_xep_loai text primary key,
  ten_hien_thi text not null,
  diem_toi_thieu numeric not null,
  thu_tu integer not null,
  check (diem_toi_thieu >= 0 and diem_toi_thieu <= 100)
);

-- Da chot voi kien truc su (09/08/2026) - xem docs/13-cau-hinh-hoa-cong-thuc-diem-ren-luyen.md muc 2c/8.
insert into public.diem_nguong_xep_loai (ma_xep_loai, ten_hien_thi, diem_toi_thieu, thu_tu) values
  ('yeu',         'Yếu',         0,  1),
  ('trung_binh',  'Trung bình',  50, 2),
  ('kha',         'Khá',         70, 3),
  ('tot',         'Tốt',         90, 4);

-- ============================================================
-- BANG: diem_cau_hinh_chung
-- Tham so toan cuc dang key-value, cung pattern voi dong_hanh_cau_hinh.
-- ============================================================
create table public.diem_cau_hinh_chung (
  khoa text primary key,
  gia_tri text not null,
  mo_ta text
);

insert into public.diem_cau_hinh_chung (khoa, gia_tri, mo_ta) values
  ('lam_tron_so_thap_phan', '2', 'Số chữ số thập phân khi làm tròn điểm xếp loại.'),
  ('phien_ban_cong_thuc', 'lac_hong_2026_v2_chuan_hoa', 'Định danh phiên bản công thức — ghi vào lịch sử nếu sau này cần snapshot.');

-- ============================================================
-- RLS + policy (giong pattern cac bang khac trong du an)
-- ============================================================
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
