create type public.dien_hoc_sinh as enum ('2B', 'BT', 'NT');
create type public.nhom_diem as enum ('CC', 'VS', 'NN', 'KL', 'KT');
create type public.pham_vi_danh_muc as enum ('ca_nhan', 'tap_the', 'to_truc');
create type public.loai_ghi_nhan as enum (
  'chuyen_can',
  've_sinh',
  'ne_nep',
  'trat_tu_ky_luat',
  'hoc_tap',
  'khen_thuong'
);
create type public.loai_du_lieu_import as enum ('hoc_sinh', 'ghi_nhan', 'phu_huynh', 'ban_can_su');
create type public.trang_thai_import as enum ('thanh_cong', 'loi_mot_phan', 'that_bai', 'da_xoa');
create type public.loai_tuan as enum ('hoc_binh_thuong', 'nghi_le');
create type public.muc_do_xu_ly as enum ('nhe', 'vua', 'nang', 'tich_cuc');

create table public.hoc_sinh (
  ma_hs text primary key,
  tt integer not null,
  ho text not null,
  ten text not null,
  dien public.dien_hoc_sinh not null,
  nu boolean not null default false,
  dan_toc text not null default '',
  ngay_sinh date,
  sdt_1 text,
  sdt_2 text,
  ngay_nhap_hoc date,
  ngay_roi_lop date,
  "to" integer,
  token_ho_so text not null unique,
  la_co_do boolean not null default false,
  anh_dai_dien text,
  ghi_chu text
);

create table public.phu_huynh (
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  ho_ten_ph text not null,
  quan_he text not null,
  sdt text not null,
  uu_tien_lien_he boolean not null default false,
  primary key (ma_hs, ho_ten_ph, sdt)
);

create table public.ban_can_su (
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  chuc_vu text not null,
  "to" integer,
  ngay_bat_dau date,
  primary key (ma_hs, chuc_vu)
);

create table public.danh_muc_xu_ly (
  ma_xu_ly text primary key,
  ten_xu_ly text not null,
  noi_dung_xu_ly text not null unique,
  muc_do public.muc_do_xu_ly not null,
  ghi_chu text
);

create table public.danh_muc_diem (
  ma_danh_muc text primary key,
  nhom public.nhom_diem not null,
  ten_muc text not null,
  diem numeric not null,
  nghiem_trong boolean not null default false,
  pham_vi public.pham_vi_danh_muc not null,
  mo_ta text,
  de_xuat_xu_ly text,
  ma_xu_ly_de_xuat text references public.danh_muc_xu_ly(ma_xu_ly) on update cascade on delete set null
);

create table public.cau_hinh_tuan (
  tuan_so integer primary key,
  tu_ngay date not null,
  den_ngay date not null,
  so_ngay integer not null default 5,
  loai_tuan public.loai_tuan not null default 'hoc_binh_thuong',
  check (den_ngay >= tu_ngay),
  check (so_ngay >= 0)
);

create table public.nhat_ky_import (
  ma_log text primary key,
  thoi_gian timestamptz not null default now(),
  loai_du_lieu public.loai_du_lieu_import not null,
  so_dong integer not null default 0,
  nguoi_thuc_hien text,
  trang_thai public.trang_thai_import not null,
  duong_dan_file_goc text,
  ghi_chu text,
  check (so_dong >= 0)
);

create table public.ghi_nhan (
  ma_ghi_nhan text primary key,
  ma_hs text references public.hoc_sinh(ma_hs) on update cascade on delete set null,
  to_lien_quan integer,
  ngay date not null,
  tuan_so integer not null references public.cau_hinh_tuan(tuan_so) on update cascade,
  dien_tai_thoi_diem text,
  tiet text,
  mon_hoc text,
  loai public.loai_ghi_nhan not null,
  ma_danh_muc text references public.danh_muc_diem(ma_danh_muc) on update cascade on delete restrict,
  noi_dung text,
  so_lan integer not null default 1,
  ly_do text,
  da_xu_ly boolean not null default false,
  hinh_thuc_xu_ly text,
  goi_phu_huynh boolean not null default false,
  ghi_so_dau_bai text,
  diem_so_mon numeric,
  diem_cong_tru numeric,
  nguoi_ghi text,
  nguon text,
  ma_log_import text references public.nhat_ky_import(ma_log) on update cascade on delete set null,
  trang_thai_xu_ly_tap_the text not null default '',
  su_kien_goc text,
  check (so_lan >= 1),
  check (trang_thai_xu_ly_tap_the in ('', 'chua_xu_ly', 'da_gan_ca_nhan', 'da_ap_dung_ca_lop', 'bo_qua')),
  check (
    (ma_hs is not null)
    or (to_lien_quan is not null)
    or (trang_thai_xu_ly_tap_the = 'chua_xu_ly')
  )
);

create index idx_hoc_sinh_to on public.hoc_sinh ("to");
create index idx_hoc_sinh_token_ho_so on public.hoc_sinh (token_ho_so);
create index idx_danh_muc_diem_nhom on public.danh_muc_diem (nhom);
create index idx_ghi_nhan_ma_hs on public.ghi_nhan (ma_hs);
create index idx_ghi_nhan_ma_danh_muc on public.ghi_nhan (ma_danh_muc);
create index idx_ghi_nhan_tuan_so on public.ghi_nhan (tuan_so);
create index idx_ghi_nhan_ngay on public.ghi_nhan (ngay);
create index idx_ghi_nhan_ma_log_import on public.ghi_nhan (ma_log_import);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.hoc_sinh,
  public.phu_huynh,
  public.ban_can_su,
  public.danh_muc_xu_ly,
  public.danh_muc_diem,
  public.cau_hinh_tuan,
  public.nhat_ky_import,
  public.ghi_nhan
to authenticated;

alter table public.hoc_sinh enable row level security;
alter table public.phu_huynh enable row level security;
alter table public.ban_can_su enable row level security;
alter table public.danh_muc_xu_ly enable row level security;
alter table public.danh_muc_diem enable row level security;
alter table public.cau_hinh_tuan enable row level security;
alter table public.nhat_ky_import enable row level security;
alter table public.ghi_nhan enable row level security;

create policy "authenticated can manage hoc_sinh" on public.hoc_sinh
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage phu_huynh" on public.phu_huynh
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage ban_can_su" on public.ban_can_su
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage danh_muc_xu_ly" on public.danh_muc_xu_ly
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage danh_muc_diem" on public.danh_muc_diem
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage cau_hinh_tuan" on public.cau_hinh_tuan
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage nhat_ky_import" on public.nhat_ky_import
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage ghi_nhan" on public.ghi_nhan
  for all to authenticated using (true) with check (true);
