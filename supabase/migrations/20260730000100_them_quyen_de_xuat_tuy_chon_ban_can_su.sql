-- Truoc day quyen "Nhap de xuat ghi nhan cho lop" gan cung vao 2 ten chuc vu
-- co dinh (Lop truong, Lop pho hoc tap - xem migration 20260726000100). Gio
-- doi sang co che linh hoat hon: giao vien tu tick chon cho TUNG hoc sinh
-- trong Ban can su, khong phu thuoc chuc vu cu the nao - vi du co the cap
-- quyen cho Lop pho ky luat, hoac khong cap cho Lop pho hoc tap neu khong
-- can. Them cot boolean rieng thay vi tiep tuc gan cung danh sach ten chuc
-- vu trong code.

alter table public.ban_can_su
  add column if not exists duoc_de_xuat_ghi_nhan boolean not null default false;

comment on column public.ban_can_su.duoc_de_xuat_ghi_nhan is
  'Giao vien tu tick chon: hoc sinh nay co duoc gui de xuat ghi nhan qua link ho so cong khai hay khong (doc lap voi ten chuc vu).';

-- Backfill: giu nguyen quyen dang co cho 2 chuc vu truoc day duoc gan cung
-- (Lop truong, Lop pho hoc tap), tranh mat quyen dot ngot khi nang cap.
update public.ban_can_su
set duoc_de_xuat_ghi_nhan = true
where chuc_vu in ('Lớp trưởng', 'Lớp phó học tập');

-- Ham helper dung chung cho moi RPC lien quan den de xuat ghi nhan (xem
-- migration 20260725000100/20260726000100) - doi dieu kien tu "chuc_vu in
-- (...)" sang "duoc_de_xuat_ghi_nhan = true".
create or replace function public._qlhs_lop_truong_ma_hs(p_token text, p_pin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs text;
  v_pin text;
begin
  if p_token is null or btrim(p_token) = '' or p_pin is null or btrim(p_pin) = '' then
    return null;
  end if;

  select hs.ma_hs into v_ma_hs
  from public.hoc_sinh hs
  where hs.token_ho_so = p_token
  limit 1;

  if v_ma_hs is null then
    return null;
  end if;

  select bcs.ma_pin into v_pin
  from public.ban_can_su bcs
  where bcs.ma_hs = v_ma_hs and bcs.duoc_de_xuat_ghi_nhan = true
  limit 1;

  if v_pin is null or v_pin <> p_pin then
    return null;
  end if;

  return v_ma_hs;
end;
$$;

-- lay_ho_so_cong_khai: them "duoc_de_xuat_ghi_nhan" vao ban_can_su tra ve,
-- de StudentProfilePage.tsx biet chinh xac hoc sinh dang xem co duoc hien
-- form gui de xuat hay khong ma khong can doan qua ten chuc vu.
create or replace function public.lay_ho_so_cong_khai(
  p_token text,
  p_sdt text,
  p_mat_khau text
)
returns table (
  student jsonb,
  records jsonb,
  catalog jsonb,
  week_config jsonb,
  ban_can_su jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sdt_input text := regexp_replace(coalesce(p_sdt, ''), '\D', '', 'g');
  v_mat_khau_input text := regexp_replace(coalesce(p_mat_khau, ''), '\D', '', 'g');
  v_ma_hs text;
  v_sdt_luu text;
begin
  if p_token is null or btrim(p_token) = '' then
    return;
  end if;

  select hs.ma_hs, regexp_replace(coalesce(hs.sdt_1, ''), '\D', '', 'g')
  into v_ma_hs, v_sdt_luu
  from public.hoc_sinh hs
  where hs.token_ho_so = p_token
  limit 1;

  if v_ma_hs is null or v_sdt_luu = '' then
    return;
  end if;

  if v_sdt_input <> v_sdt_luu then
    return;
  end if;

  if v_mat_khau_input = '' or v_mat_khau_input <> right(v_sdt_luu, 3) then
    return;
  end if;

  return query
  select
    jsonb_build_object(
      'ma_hs', hs.ma_hs,
      'tt', hs.tt,
      'ho', hs.ho,
      'ten', hs.ten,
      'dien', hs.dien,
      'nu', hs.nu,
      'dan_toc', hs.dan_toc,
      'ngay_sinh', hs.ngay_sinh,
      'sdt_1', null,
      'sdt_2', null,
      'ngay_nhap_hoc', hs.ngay_nhap_hoc,
      'ngay_roi_lop', hs.ngay_roi_lop,
      'to', hs."to",
      'token_ho_so', hs.token_ho_so,
      'la_co_do', hs.la_co_do,
      'anh_dai_dien', hs.anh_dai_dien,
      'ghi_chu', hs.ghi_chu
    ) as student,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ma_ghi_nhan', gn.ma_ghi_nhan,
            'ma_hs', gn.ma_hs,
            'ngay', gn.ngay,
            'tuan_so', gn.tuan_so,
            'dien_tai_thoi_diem', gn.dien_tai_thoi_diem,
            'tiet', gn.tiet,
            'mon_hoc', gn.mon_hoc,
            'loai', gn.loai,
            'ma_danh_muc', gn.ma_danh_muc,
            'noi_dung', gn.noi_dung,
            'so_lan', gn.so_lan,
            'ly_do', gn.ly_do,
            'da_xu_ly', gn.da_xu_ly,
            'hinh_thuc_xu_ly', gn.hinh_thuc_xu_ly,
            'goi_phu_huynh', gn.goi_phu_huynh,
            'ghi_so_dau_bai', gn.ghi_so_dau_bai,
            'diem_so_mon', gn.diem_so_mon,
            'diem_cong_tru', gn.diem_cong_tru,
            'nguon', gn.nguon
          )
          order by gn.ngay desc, gn.ma_ghi_nhan desc
        )
        from public.ghi_nhan gn
        where gn.ma_hs = hs.ma_hs
      ),
      '[]'::jsonb
    ) as records,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ma_danh_muc', dm.ma_danh_muc,
            'nhom', dm.nhom,
            'ten_muc', dm.ten_muc,
            'diem', dm.diem,
            'nghiem_trong', dm.nghiem_trong,
            'pham_vi', dm.pham_vi
          )
          order by dm.nhom asc, dm.ma_danh_muc asc
        )
        from public.danh_muc_diem dm
      ),
      '[]'::jsonb
    ) as catalog,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'tuan_so', ch.tuan_so,
            'tu_ngay', ch.tu_ngay,
            'den_ngay', ch.den_ngay,
            'so_ngay', ch.so_ngay,
            'loai_tuan', ch.loai_tuan
          )
          order by ch.tuan_so asc
        )
        from public.cau_hinh_tuan ch
      ),
      '[]'::jsonb
    ) as week_config,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ma_hs', bcs.ma_hs,
            'chuc_vu', bcs.chuc_vu,
            'to', bcs."to",
            'ngay_bat_dau', bcs.ngay_bat_dau,
            'duoc_de_xuat_ghi_nhan', bcs.duoc_de_xuat_ghi_nhan
          )
          order by bcs."to" asc, bcs.chuc_vu asc
        )
        from public.ban_can_su bcs
        where bcs.ma_hs = hs.ma_hs
      ),
      '[]'::jsonb
    ) as ban_can_su
  from (
    select *
    from public.hoc_sinh
    where token_ho_so = p_token
    limit 1
  ) hs;
end;
$$;

revoke all on function public.lay_ho_so_cong_khai(text, text, text) from public;
grant execute on function public.lay_ho_so_cong_khai(text, text, text) to anon;
grant execute on function public.lay_ho_so_cong_khai(text, text, text) to authenticated;
