-- ============================================================================
-- QLHS 11C5 - He thong quan ly hoc sinh
-- (c) Nguyen Duy Tan - Giao vien Tin hoc, GVCN 11C5
-- ============================================================================
--
-- He thong Rank "Tinh Tu" theo tuan (docs/thethanghang/12-dac-ta-rank-tinh-tu.md),
-- noi tiep He thong Dong hanh (C211). Diem tuan = diem_ren_luyen (scoring.ts,
-- thang 0-100) + so_huy_hieu_dat * diem_thuong_moi_huy_hieu. Toan bo moc bac va
-- diem thuong la DU LIEU sua duoc qua RuleManagerPage, khong hardcode.

-- 1. Thang bac: 7 bac mac dinh lay tu docs/thethanghang/rankTinhTu.ts, giao vien
-- chinh lai qua trang quan ly luat.
create table public.rank_bac_tinh_tu (
  bac integer primary key,
  ma text not null unique,
  ten text not null,
  icon text not null,
  diem_toi_thieu numeric not null,
  mo_ta text,
  dang_bat boolean not null default true,
  check (diem_toi_thieu >= 0)
);

insert into public.rank_bac_tinh_tu (bac, ma, ten, icon, diem_toi_thieu, mo_ta) values
  (1, 'sao_bang', 'Sao Băng', '☄️', 0, 'Vừa xuất hiện — khởi đầu của mọi hành trình.'),
  (2, 'sao_nho', 'Sao Nhỏ', '⭐', 50, 'Bắt đầu toả sáng đều đặn.'),
  (3, 'hanh_tinh', 'Hành Tinh', '🪐', 65, 'Đã có quỹ đạo ổn định, vững vàng.'),
  (4, 'mat_trang', 'Mặt Trăng', '🌙', 75, 'Sáng rõ, ai nhìn vào cũng thấy được.'),
  (5, 'mat_troi', 'Mặt Trời', '☀️', 85, 'Tự toả năng lượng, lan toả tích cực quanh mình.'),
  (6, 'chom_sao', 'Chòm Sao', '✨', 95, 'Nhiều điểm sáng hợp lại — mẫu mực nhiều mặt.'),
  (7, 'thien_ha', 'Thiên Hà', '🌌', 105, 'Bậc cao nhất — rực rỡ toàn diện.');

-- 2. Lich su bac tung em tung tuan - bac RESET moi tuan, luu snapshot de xem lai
-- va so voi tuan truoc. Khong sinh san hang loat - upsert khi the nhan vat cua
-- 1 em duoc mo cho 1 tuan (xem RPC chot_rank_tuan_cong_khai o migration sau).
create table public.rank_lich_su_tuan (
  id bigint generated always as identity primary key,
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  tuan_so integer not null references public.cau_hinh_tuan(tuan_so) on update cascade,
  diem_ren_luyen numeric not null,
  so_huy_hieu integer not null default 0,
  diem_thuong numeric not null default 0,
  diem_tuan numeric not null,
  bac_dat integer not null references public.rank_bac_tinh_tu(bac),
  thoi_diem_chot timestamptz not null default now(),
  unique (ma_hs, tuan_so)
);

-- 3. Cau hinh chung dang key-value cho He thong Dong hanh (dung chung, khong
-- rieng cho rank - hien tai chi co 1 khoa diem_thuong_moi_huy_hieu).
create table public.dong_hanh_cau_hinh (
  khoa text primary key,
  gia_tri text not null,
  mo_ta text
);

insert into public.dong_hanh_cau_hinh (khoa, gia_tri, mo_ta) values
  ('diem_thuong_moi_huy_hieu', '4', 'Điểm cộng thêm cho mỗi huy hiệu đạt trong tuần, dùng khi xếp bậc tinh tú.');

alter table public.rank_bac_tinh_tu enable row level security;
alter table public.rank_lich_su_tuan enable row level security;
alter table public.dong_hanh_cau_hinh enable row level security;

create policy "authenticated can manage rank_bac_tinh_tu" on public.rank_bac_tinh_tu
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage rank_lich_su_tuan" on public.rank_lich_su_tuan
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage dong_hanh_cau_hinh" on public.dong_hanh_cau_hinh
  for all to authenticated using (true) with check (true);
