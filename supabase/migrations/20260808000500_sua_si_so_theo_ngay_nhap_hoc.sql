-- ============================================================================
-- QLHS 11C5 - He thong quan ly hoc sinh
-- (c) Nguyen Duy Tan - Giao vien Tin hoc, GVCN 11C5
-- ============================================================================
--
-- Fix cong thuc tinh Si so: tinh_bao_cao_si_so lay danh sach thanh vien thang
-- tu thanh_vien_nhom_diem_danh, KHONG loc theo hoc_sinh.ngay_nhap_hoc/
-- ngay_roi_lop. Hau qua: 1 hoc sinh moi duoc them vao lop bi tinh nham vao
-- si so cua CA NHUNG NGAY TRUOC KHI em do nhap hoc (bao cao qua khu bi phinh
-- to sai), va 1 hoc sinh da roi lop van tiep tuc bi dem vao si so nhung ngay
-- sau khi roi. Them dieu kien "dang la thanh vien tai p_ngay" vao ca 2 CTE
-- "members" (dung chung logic voi isActiveStudent() ben client:
-- ngay_nhap_hoc <= p_ngay VA (ngay_roi_lop la null HOAC ngay_roi_lop > p_ngay),
-- tuc ngay roi lop van con tinh la co mat, chi tu ngay hom sau moi thoi).
--
-- Ngoai ra phat hien nguyen nhan GOC con nghiem trong hon: addStudent()/import
-- hoc_sinh (SupabaseDataSource.ts) tu truoc gio KHONG tung insert vao
-- thanh_vien_nhom_diem_danh - bang nay tu khi tao (migration 20260723000500)
-- chi duoc seed 1 LAN DUY NHAT cho cac hoc sinh co san luc do. Hau qua: MOI
-- hoc sinh duoc them qua app tu truoc den gio deu KHONG CO trong bang nay,
-- nen bi loai hoan toan khoi tinh_bao_cao_si_so (khong phai chi sai so mai
-- ma la KHONG DUOC TINH luc nao ca) va khong the diem danh an/ngu trua. Da
-- sua addStudent()/importJson('hoc_sinh',...) de tu dong them dung nhom cho
-- hoc sinh moi ve sau; backfill ngay ben duoi cho cac hoc sinh da lot vao
-- ke ho nay tu truoc migration nay.
insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'CHINH_KHOA', ma_hs
  from public.hoc_sinh
on conflict do nothing;

insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'AN_TRUA', ma_hs
  from public.hoc_sinh
  where dien in ('BT', 'NT')
on conflict do nothing;

insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'NGU_TRUA', ma_hs
  from public.hoc_sinh
  where dien in ('BT', 'NT') and nu = false
on conflict do nothing;

create or replace function public.tinh_bao_cao_si_so(
  p_ngay date,
  p_buoi text,
  p_tre_tinh_co_mat boolean default true
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tuan_so integer;
  v_buoi text;
  v_co_mat jsonb;
  v_tong jsonb;
  v_vang jsonb;
begin
  v_buoi := lower(btrim(coalesce(p_buoi, '')));
  if v_buoi not in ('sang', 'chieu') then
    raise exception 'Buoi diem danh khong hop le: %', p_buoi;
  end if;

  select tuan_so
  into v_tuan_so
  from public.cau_hinh_tuan
  where tu_ngay <= p_ngay and p_ngay <= den_ngay
  order by tuan_so desc
  limit 1;

  if v_tuan_so is null then
    raise exception 'Ngay nay chua co trong lich diem danh.';
  end if;

  with members as (
    select hs.ma_hs, hs.ho, hs.ten, hs.dien
    from public.thanh_vien_nhom_diem_danh tv
    join public.hoc_sinh hs on hs.ma_hs = tv.ma_hs
    where tv.ma_nhom = 'CHINH_KHOA'
      and (hs.ngay_nhap_hoc is null or hs.ngay_nhap_hoc <= p_ngay)
      and (hs.ngay_roi_lop is null or hs.ngay_roi_lop > p_ngay)
  ),
  totals as (
    select dien, count(*)::integer as so_luong
    from members
    group by dien
  )
  select jsonb_build_object(
    'NT', coalesce(max(so_luong) filter (where dien = 'NT'), 0),
    'BT', coalesce(max(so_luong) filter (where dien = 'BT'), 0),
    '2B', coalesce(max(so_luong) filter (where dien = '2B'), 0)
  )
  into v_tong
  from totals;

  with members as (
    select hs.ma_hs, hs.ho, hs.ten, hs.dien
    from public.thanh_vien_nhom_diem_danh tv
    join public.hoc_sinh hs on hs.ma_hs = tv.ma_hs
    where tv.ma_nhom = 'CHINH_KHOA'
      and (hs.ngay_nhap_hoc is null or hs.ngay_nhap_hoc <= p_ngay)
      and (hs.ngay_roi_lop is null or hs.ngay_roi_lop > p_ngay)
  ),
  present_members as (
    select m.*
    from members m
    where not exists (
      select 1
      from public.diem_danh dd
      where dd.ma_nhom = 'CHINH_KHOA'
        and dd.ma_hs = m.ma_hs
        and dd.ngay = p_ngay
        and dd.buoi = v_buoi
        and (
          dd.trang_thai in ('vang_co_phep', 'vang_khong_phep')
          or (dd.trang_thai = 'tre' and p_tre_tinh_co_mat = false)
        )
    )
  ),
  present_counts as (
    select dien, count(*)::integer as so_luong
    from present_members
    group by dien
  )
  select jsonb_build_object(
    'NT', coalesce(max(so_luong) filter (where dien = 'NT'), 0),
    'BT', coalesce(max(so_luong) filter (where dien = 'BT'), 0),
    '2B', coalesce(max(so_luong) filter (where dien = '2B'), 0)
  )
  into v_co_mat
  from present_counts;

  select coalesce(
    jsonb_agg(concat_ws(' ', hs.ho, hs.ten) || ' (' || hs.dien || ')' order by hs.ten, hs.ho),
    '[]'::jsonb
  )
  into v_vang
  from public.diem_danh dd
  join public.hoc_sinh hs on hs.ma_hs = dd.ma_hs
  where dd.ma_nhom = 'CHINH_KHOA'
    and dd.ngay = p_ngay
    and dd.buoi = v_buoi
    and (
      dd.trang_thai in ('vang_co_phep', 'vang_khong_phep')
      or (dd.trang_thai = 'tre' and p_tre_tinh_co_mat = false)
    );

  return jsonb_build_object(
    'ngay', p_ngay,
    'buoi', case when v_buoi = 'sang' then 'SANG' else 'CHIEU' end,
    'tuan_so', v_tuan_so,
    'sheet_name', 'Supabase - CHINH_KHOA - Tuan ' || v_tuan_so,
    'tre_tinh_co_mat', p_tre_tinh_co_mat,
    'co_mat', coalesce(v_co_mat, jsonb_build_object('NT', 0, 'BT', 0, '2B', 0)),
    'tong', coalesce(v_tong, jsonb_build_object('NT', 0, 'BT', 0, '2B', 0)),
    'vang', v_vang,
    'generated_at', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
end;
$$;

grant execute on function public.tinh_bao_cao_si_so(date, text, boolean) to authenticated;
