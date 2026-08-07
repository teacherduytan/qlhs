-- He thong Dong hanh (rule-based, giao vien sua luat tren web, khong hardcode
-- nguong/cau chu trong TypeScript). Theo dac ta docs/11-dac-ta-he-thong-dong-hanh.md.
--
-- LUU Y (xem [KN-01] cuoi file docs/11-dac-ta-he-thong-dong-hanh.md): file Excel
-- "bang-du-lieu-he-thong-dong-hanh.xlsx" duoc dac ta nhac toi de lay du lieu seed
-- that KHONG CO trong repo tai thoi diem trien khai nay, nen du lieu seed ben duoi
-- (5 luat canh bao, 5 huy hieu, 5 cau dinh huong) la vi du khoi tao hop ly do AI tu
-- viet, KHONG PHAI du lieu that tu file Excel goc. Giao vien can ra soat va sua lai
-- qua trang quan ly (RuleManagerPage) truoc khi dung that.

-- 1. Tu dien chi so: liet ke cac chi so ma computeMetrics.ts biet tinh, de dropdown
-- trong trang quan ly luat hien dung danh sach. Seed san, giao vien hiem khi sua.
create table public.dong_hanh_chi_so (
  ma_chi_so text primary key,
  ten_hien_thi text not null,
  kieu text not null check (kieu in ('so', 'so_theo_ma', 'boolean')),
  mo_ta text,
  thu_tu integer not null default 0
);

insert into public.dong_hanh_chi_so (ma_chi_so, ten_hien_thi, kieu, mo_ta, thu_tu) values
  ('vang_khong_phep', 'So buoi vang khong phep (tuan nay)', 'so', 'Dem tu diem_danh, ma_nhom CHINH_KHOA, trang_thai = vang_khong_phep.', 10),
  ('vang_co_phep', 'So buoi vang co phep (tuan nay)', 'so', 'Dem tu diem_danh, ma_nhom CHINH_KHOA, trang_thai = vang_co_phep.', 20),
  ('di_tre', 'So buoi di tre (tuan nay)', 'so', 'Dem tu diem_danh, ma_nhom CHINH_KHOA, trang_thai = tre.', 30),
  ('so_lan_theo_ma', 'So lan vi pham theo 1 ma danh muc cu the', 'so_theo_ma', 'Dung chung voi cot "Ma danh muc ap dung" cua luat, vd chi ap dung cho ma NN11.', 40),
  ('co_nghiem_trong', 'Co vi pham nghiem trong trong tuan', 'boolean', 'True neu co it nhat 1 ghi_nhan thuoc danh muc nghiem_trong=true trong tuan.', 50),
  ('so_loi_tuan_nay', 'Tong so loi (ghi nhan tru diem) tuan nay', 'so', '', 60),
  ('so_loi_tuan_truoc', 'Tong so loi (ghi nhan tru diem) tuan truoc', 'so', '', 70),
  ('xu_huong_loi', 'Chenh lech so loi tuan nay - tuan truoc', 'so', 'Duong = tang loi, am hoac 0 = giam/khong doi.', 80),
  ('co_ghi_nhan_tich_cuc', 'Co it nhat 1 ghi nhan tich cuc trong tuan', 'boolean', '', 90),
  ('co_vi_pham_ne_nep', 'Co it nhat 1 vi pham nhom Ne nep (NN) trong tuan', 'boolean', '', 100);

-- 2. Luat canh bao & nhac nho
create table public.dong_hanh_luat (
  ma_luat text primary key,
  ten_luat text not null,
  ma_chi_so text not null references public.dong_hanh_chi_so(ma_chi_so),
  phep_so_sanh text not null check (phep_so_sanh in ('>=', '>', '=', '<', '<=')),
  nguong numeric,
  ma_danh_muc_ap_dung text,
  muc_do text not null check (muc_do in ('khan', 'canh_bao', 'nhac_som', 'nhac_nhe')),
  cau_hien_thi text not null,
  uu_tien integer not null default 100,
  nhom_che text,
  can_duyet boolean not null default true,
  dang_bat boolean not null default true,
  thu_tu integer not null default 0
);

insert into public.dong_hanh_luat
  (ma_luat, ten_luat, ma_chi_so, phep_so_sanh, nguong, ma_danh_muc_ap_dung, muc_do, cau_hien_thi, uu_tien, nhom_che, thu_tu)
values
  ('CB1', 'Vang 1 buoi - nhac som', 'vang_khong_phep', '>=', 1, null, 'nhac_som', 'Tuan nay em vang khong phep {n} buoi, em chu y sap xep di hoc day du hon nhe.', 50, 'vang', 10),
  ('CB2', 'Vang 2 buoi tro len - canh bao', 'vang_khong_phep', '>=', 2, null, 'canh_bao', 'Tuan nay em vang khong phep {n} buoi, GVCN can trao doi truc tiep voi phu huynh.', 20, 'vang', 20),
  ('CB3', 'Di tre 2 lan tro len', 'di_tre', '>=', 2, null, 'nhac_nhe', 'Tuan nay em di tre {n} lan, em co gang sap xep di hoc dung gio hon nhe.', 60, 'tre', 30),
  ('CB4', 'Co vi pham nghiem trong', 'co_nghiem_trong', '=', 1, null, 'khan', 'Tuan nay em co vi pham nghiem trong, GVCN can trao doi truc tiep va lien he phu huynh som.', 1, null, 40),
  ('CB5', 'Xu huong loi tang manh so voi tuan truoc', 'xu_huong_loi', '>=', 2, null, 'canh_bao', 'So loi tuan nay cua em tang {n} so voi tuan truoc, can theo doi sat hon.', 30, null, 50);

-- 3. Luat huy hieu (tu dong, khong can duyet). dieu_kien la mang AND cac dieu kien don.
create table public.dong_hanh_huy_hieu (
  ma_huy_hieu text primary key,
  ten_huy_hieu text not null,
  icon text,
  dieu_kien jsonb not null,
  mo_ta text,
  tu_dong boolean not null default true,
  dang_bat boolean not null default true,
  thu_tu integer not null default 0
);

insert into public.dong_hanh_huy_hieu (ma_huy_hieu, ten_huy_hieu, icon, dieu_kien, mo_ta, thu_tu) values
  ('chuyen_can_tron_tuan', 'Chuyen can tron tuan', '🌟',
    '[{"ma_chi_so":"vang_khong_phep","phep":"=","nguong":0},{"ma_chi_so":"vang_co_phep","phep":"=","nguong":0},{"ma_chi_so":"di_tre","phep":"=","nguong":0}]'::jsonb,
    'Di hoc day du, dung gio ca tuan, khong vang khong tre buoi nao.', 10),
  ('ne_nep_guong_mau', 'Ne nep guong mau', '🎯',
    '[{"ma_chi_so":"co_vi_pham_ne_nep","phep":"=","nguong":0}]'::jsonb,
    'Khong co vi pham nhom Ne nep nao trong tuan.', 20),
  ('ngoi_sao_tich_cuc', 'Ngoi sao tich cuc', '⭐',
    '[{"ma_chi_so":"co_ghi_nhan_tich_cuc","phep":"=","nguong":1}]'::jsonb,
    'Co it nhat 1 ghi nhan tich cuc trong tuan.', 30),
  ('tuan_sach_loi', 'Tuan sach loi', '✅',
    '[{"ma_chi_so":"so_loi_tuan_nay","phep":"=","nguong":0}]'::jsonb,
    'Khong co loi (ghi nhan tru diem) nao trong tuan.', 40),
  ('tien_bo_ro_ret', 'Tien bo ro ret', '📈',
    '[{"ma_chi_so":"xu_huong_loi","phep":"<=","nguong":-2}]'::jsonb,
    'So loi tuan nay giam it nhat 2 so voi tuan truoc.', 50);

-- 4. Kho cau "huong cai thien"
create table public.dong_hanh_cau_dinh_huong (
  ma_cau text primary key,
  gan_voi text not null,
  cau text not null,
  dang_bat boolean not null default true,
  thu_tu integer not null default 0
);

insert into public.dong_hanh_cau_dinh_huong (ma_cau, gan_voi, cau, thu_tu) values
  ('CDH-VANG', 'vang', 'Em co gang sap xep thoi gian de di hoc day du hon, neu co viec ban nho bao truoc voi GVCN.', 10),
  ('CDH-TRE', 'tre', 'Em chuan bi som hon vao buoi sang de khong bi tre gio vao lop.', 20),
  ('CDH-NE-NEP', 'ne_nep', 'Em chu y giu trat tu va nghiem tuc thuc hien noi quy lop hoc.', 30),
  ('CDH-KY-LUAT', 'khan', 'Em can nghiem tuc rut kinh nghiem va khong de tai pham trong thoi gian toi.', 40),
  ('CDH-MAC-DINH-TOT', 'mac_dinh_tot', 'Em tiep tuc phat huy tinh than hoc tap va ren luyen tot nhu hien tai nhe!', 50);

-- 5. Trang thai duyet cau canh bao/dinh huong theo tung hoc sinh, tung tuan.
-- Khong sinh san hang loat - chi ghi khi giao vien bam duyet/an.
-- Cot "loai" KHONG co trong dac ta goc (xem [KN-03]) - AI trien khai them de
-- phan biet 1 dong duyet la cau canh bao (ma_luat tro toi dong_hanh_luat.ma_luat)
-- hay cau dinh huong (ma_luat tro toi dong_hanh_cau_dinh_huong.ma_cau, dung chung
-- cot ma_luat vi 2 khong gian ma khong trung nhau: 'CBx' vs 'CDH-xxx'), de trang
-- ca nhan cong khai (khong co danh sach luat/cau goc) van tach duoc 2 nhom de
-- hien dung thu tu "Dieu can chu y" roi "Huong cai thien" theo muc 6 dac ta.
create table public.dong_hanh_duyet (
  id bigint generated always as identity primary key,
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  tuan_so integer not null references public.cau_hinh_tuan(tuan_so) on update cascade,
  loai text not null default 'canh_bao' check (loai in ('canh_bao', 'dinh_huong')),
  ma_luat text,
  noi_dung_da_duyet text,
  trang_thai text not null default 'cho_duyet' check (trang_thai in ('cho_duyet', 'da_duyet', 'da_an')),
  nguoi_duyet text,
  thoi_diem timestamptz not null default now(),
  unique (ma_hs, tuan_so, loai, ma_luat)
);

alter table public.dong_hanh_chi_so enable row level security;
alter table public.dong_hanh_luat enable row level security;
alter table public.dong_hanh_huy_hieu enable row level security;
alter table public.dong_hanh_cau_dinh_huong enable row level security;
alter table public.dong_hanh_duyet enable row level security;

create policy "authenticated can manage dong_hanh_chi_so" on public.dong_hanh_chi_so
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage dong_hanh_luat" on public.dong_hanh_luat
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage dong_hanh_huy_hieu" on public.dong_hanh_huy_hieu
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage dong_hanh_cau_dinh_huong" on public.dong_hanh_cau_dinh_huong
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage dong_hanh_duyet" on public.dong_hanh_duyet
  for all to authenticated using (true) with check (true);
