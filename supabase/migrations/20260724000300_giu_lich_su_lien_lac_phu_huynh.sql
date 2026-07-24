-- upsert_diem_danh xoa hang diem_danh khi giao vien doi trang thai ve 'co_mat'
-- (dung quy uoc "khong co dong nghia la co mat"). Vi lien_lac_phu_huynh dang
-- tham chieu diem_danh_id "on delete cascade", moi lan sua lai ve co_mat se
-- xoa mat vinh vien noi dung da lien lac voi phu huynh, du cuoc goi la that.
--
-- Sua: doi sang "on delete set null" + them cac cot chup nhanh ngu canh
-- (ma_hs, ho_ten, ngay, buoi) ngay luc ghi, de khi dong diem_danh goc bi xoa,
-- lich su lien lac van doc duoc ro la da lien lac cho ai, ngay nao, buoi nao.

alter table public.lien_lac_phu_huynh
  add column if not exists ma_hs text,
  add column if not exists ho_ten text,
  add column if not exists ngay date,
  add column if not exists buoi text check (buoi in ('sang', 'chieu', 'ca_ngay'));

update public.lien_lac_phu_huynh llph
set
  ma_hs = dd.ma_hs,
  ho_ten = concat_ws(' ', hs.ho, hs.ten),
  ngay = dd.ngay,
  buoi = dd.buoi
from public.diem_danh dd
left join public.hoc_sinh hs on hs.ma_hs = dd.ma_hs
where llph.diem_danh_id = dd.id;

alter table public.lien_lac_phu_huynh
  alter column diem_danh_id drop not null;

alter table public.lien_lac_phu_huynh
  drop constraint if exists lien_lac_phu_huynh_diem_danh_id_fkey;

alter table public.lien_lac_phu_huynh
  add constraint lien_lac_phu_huynh_diem_danh_id_fkey
    foreign key (diem_danh_id) references public.diem_danh(id) on delete set null;

comment on column public.lien_lac_phu_huynh.ma_hs is
  'Chup nhanh luc ghi, khong doi theo diem_danh goc (vi diem_danh co the bi xoa sau).';
comment on column public.lien_lac_phu_huynh.ho_ten is
  'Chup nhanh ho ten hoc sinh luc ghi, phong khi diem_danh_id tro thanh null.';
