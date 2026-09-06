-- Noi diem danh "Di tre" voi he thong Ghi nhan vi pham (theo yeu cau nguoi
-- dung: danh dau tre trong diem danh phai tu tao 1 dong Ghi nhan tru diem
-- ren luyen nhu vi pham that, dung ma danh muc CC01 nguoi dung da xac nhan
-- dang dung cho "di tre" trong danh_muc_diem cua ho). Nho vay tab Bao cao
-- (doc thang tu ghi_nhan) tu dong hien dung lich su vi phap "di tre" cua
-- hoc sinh ma khong can sua gi them o ReportsPage.tsx/scoring.ts - day chi
-- la 1 dong GhiNhan binh thuong nhu moi loai vi pham khac.
--
-- Dong bo 2 CHIEU voi diem_danh: danh dau 'tre' -> tu tao/cap nhat dung 1
-- dong GhiNhan MOI NGAY cho hoc sinh do (khong nhan doi neu tre ca buoi
-- sang lan chieu cung ngay); doi trang thai khoi 'tre' (ve co_mat/vang...)
-- ma khong con buoi nao khac trong ngay la 'tre' thi tu xoa dong GhiNhan da
-- tu sinh do - tranh de lai "vi pham ma" khong con dung voi diem danh thuc
-- te. Chi dong bo dong GhiNhan CO nguon = 'diem_danh_tu_dong' (tu may sinh)
-- - khong bao gio dung cham vao GhiNhan giao vien tu tay nhap, du trung
-- ma_hs/ngay/ma_danh_muc.
create unique index if not exists uniq_ghi_nhan_di_tre_tu_dong
  on public.ghi_nhan (ma_hs, ngay)
  where nguon = 'diem_danh_tu_dong';

create or replace function public.upsert_diem_danh(
  p_ma_hs text,
  p_ngay date,
  p_tuan_so integer,
  p_buoi text,
  p_trang_thai text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_nguoi_ghi text := auth.jwt() ->> 'email';
  v_con_tre boolean;
begin
  if p_trang_thai is null or p_trang_thai = 'co_mat' then
    delete from public.diem_danh
    where ma_nhom = 'CHINH_KHOA' and ma_hs = p_ma_hs and ngay = p_ngay and buoi = p_buoi;

    select exists (
      select 1 from public.diem_danh
      where ma_nhom = 'CHINH_KHOA' and ma_hs = p_ma_hs and ngay = p_ngay and trang_thai = 'tre'
    ) into v_con_tre;

    if not v_con_tre then
      delete from public.ghi_nhan
      where ma_hs = p_ma_hs and ngay = p_ngay and nguon = 'diem_danh_tu_dong';
    end if;

    return null;
  end if;

  insert into public.diem_danh (ma_nhom, ma_hs, ngay, tuan_so, buoi, trang_thai, nguoi_ghi)
  values ('CHINH_KHOA', p_ma_hs, p_ngay, p_tuan_so, p_buoi, p_trang_thai, v_nguoi_ghi)
  on conflict (ma_nhom, ma_hs, ngay, buoi) where ma_hs is not null
  do update set trang_thai = excluded.trang_thai, nguoi_ghi = excluded.nguoi_ghi
  returning id into v_id;

  if p_trang_thai = 'tre' then
    insert into public.ghi_nhan (
      ma_ghi_nhan, ma_hs, to_lien_quan, ngay, tuan_so, loai, ma_danh_muc,
      noi_dung, so_lan, diem_cong_tru, nguoi_ghi, nguon
    )
    select
      'GN' || lpad((
        coalesce(
          (select max(substring(g.ma_ghi_nhan from 3))::integer
           from public.ghi_nhan g
           where g.ma_ghi_nhan ~ '^GN[0-9]+$'),
          0
        ) + 1
      )::text, 6, '0'),
      p_ma_hs, hs."to", p_ngay, p_tuan_so, 'chuyen_can', dm.ma_danh_muc,
      dm.ten_muc, 1, dm.diem, v_nguoi_ghi, 'diem_danh_tu_dong'
    from public.danh_muc_diem dm
    join public.hoc_sinh hs on hs.ma_hs = p_ma_hs
    where dm.ma_danh_muc = 'CC01'
    on conflict (ma_hs, ngay) where nguon = 'diem_danh_tu_dong'
    do update set
      tuan_so = excluded.tuan_so,
      noi_dung = excluded.noi_dung,
      diem_cong_tru = excluded.diem_cong_tru,
      nguoi_ghi = excluded.nguoi_ghi;
  else
    select exists (
      select 1 from public.diem_danh
      where ma_nhom = 'CHINH_KHOA' and ma_hs = p_ma_hs and ngay = p_ngay and trang_thai = 'tre'
    ) into v_con_tre;

    if not v_con_tre then
      delete from public.ghi_nhan
      where ma_hs = p_ma_hs and ngay = p_ngay and nguon = 'diem_danh_tu_dong';
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.upsert_diem_danh(text, date, integer, text, text) to authenticated;

-- Them danh sach rieng hoc sinh "tre" (doc lap voi p_tre_tinh_co_mat) vao
-- ket qua tinh_bao_cao_si_so, dung yeu cau nguoi dung: "cho hien them 1 ds
-- rieng hs di tre du hoc sinh do khong duoc tinh la vang" khi dang bat tuy
-- chon tinh tre la co mat. Giu nguyen toan bo logic cu (v_co_mat/v_tong/
-- v_vang), chi them 1 truy van moi cho v_tre.
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
  v_tre jsonb;
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

  select coalesce(
    jsonb_agg(concat_ws(' ', hs.ho, hs.ten) || ' (' || hs.dien || ')' order by hs.ten, hs.ho),
    '[]'::jsonb
  )
  into v_tre
  from public.diem_danh dd
  join public.hoc_sinh hs on hs.ma_hs = dd.ma_hs
  where dd.ma_nhom = 'CHINH_KHOA'
    and dd.ngay = p_ngay
    and dd.buoi = v_buoi
    and dd.trang_thai = 'tre';

  return jsonb_build_object(
    'ngay', p_ngay,
    'buoi', case when v_buoi = 'sang' then 'SANG' else 'CHIEU' end,
    'tuan_so', v_tuan_so,
    'sheet_name', 'Supabase - CHINH_KHOA - Tuan ' || v_tuan_so,
    'tre_tinh_co_mat', p_tre_tinh_co_mat,
    'co_mat', coalesce(v_co_mat, jsonb_build_object('NT', 0, 'BT', 0, '2B', 0)),
    'tong', coalesce(v_tong, jsonb_build_object('NT', 0, 'BT', 0, '2B', 0)),
    'vang', v_vang,
    'tre', v_tre,
    'generated_at', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
end;
$$;

grant execute on function public.tinh_bao_cao_si_so(date, text, boolean) to authenticated;
