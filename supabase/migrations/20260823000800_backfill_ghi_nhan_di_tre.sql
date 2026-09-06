-- Backfill: tao Ghi nhan CC01 cho CAC DONG diem_danh 'tre' DA CO SAN TRUOC
-- KHI migration 20260823000700 duoc dan len Supabase. Ly do can migration
-- rieng nay: upsert_diem_danh() chi tao Ghi nhan tai DUNG THOI DIEM luu
-- diem danh - khong hoi cuu nhung dong da luu TU TRUOC do (vi du GVCN da
-- danh dau "Tre" cho vai em truoc khi ban vua dan len). Neu khong chay
-- migration nay, nhung lan "Tre" cu se KHONG BAO GIO tu co Ghi nhan cho
-- toi khi GVCN vo tinh luu lai dung ngay/buoi do lan nua.
--
-- An toan chay lai nhieu lan (idempotent): chi tao cho (ma_hs, ngay) CHUA
-- co san 1 dong Ghi nhan nguon = 'diem_danh_tu_dong' nao (dua vao unique
-- index da tao o migration 20260823000700 - BAT BUOC dan migration do
-- TRUOC migration nay). Neu danh_muc_diem chua co ma CC01, khong dong nao
-- duoc tao (JOIN khong khop), khong loi, chi khong co gi de backfill.
with hoc_sinh_tre as (
  select distinct dd.ma_hs, dd.ngay, dd.tuan_so
  from public.diem_danh dd
  where dd.ma_nhom = 'CHINH_KHOA'
    and dd.trang_thai = 'tre'
    and dd.ma_hs is not null
    and not exists (
      select 1
      from public.ghi_nhan g
      where g.ma_hs = dd.ma_hs and g.ngay = dd.ngay and g.nguon = 'diem_danh_tu_dong'
    )
),
ma_so_goc as (
  select coalesce(max(substring(g.ma_ghi_nhan from 3))::integer, 0) as so_lon_nhat
  from public.ghi_nhan g
  where g.ma_ghi_nhan ~ '^GN[0-9]+$'
),
danh_so as (
  select
    ht.*,
    row_number() over (order by ht.ma_hs, ht.ngay) as stt
  from hoc_sinh_tre ht
)
insert into public.ghi_nhan (
  ma_ghi_nhan, ma_hs, to_lien_quan, ngay, tuan_so, loai, ma_danh_muc,
  noi_dung, so_lan, diem_cong_tru, nguoi_ghi, nguon
)
select
  'GN' || lpad((ds.stt + gc.so_lon_nhat)::text, 6, '0'),
  ds.ma_hs, hs."to", ds.ngay, ds.tuan_so, 'chuyen_can', dm.ma_danh_muc,
  dm.ten_muc, 1, dm.diem, null, 'diem_danh_tu_dong'
from danh_so ds
join public.hoc_sinh hs on hs.ma_hs = ds.ma_hs
join public.danh_muc_diem dm on dm.ma_danh_muc = 'CC01'
cross join ma_so_goc gc
on conflict (ma_hs, ngay) where nguon = 'diem_danh_tu_dong' do nothing;
