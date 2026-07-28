-- Them dang nhap cho trang cong khai ho so hoc sinh: username = sdt_1,
-- mat khau = 3 so cuoi cua sdt_1. RPC cu lay_ho_so_cong_khai(p_token) chi
-- can biet token la xem duoc du lieu (link ro ri la lo du lieu). Doi RPC
-- yeu cau them p_sdt + p_mat_khau, xac thuc dung server-side (security
-- definer) truoc khi tra du lieu - dung dinh dang chuan hoa (chi giu chu
-- so) de tranh sai lech do khoang trang/dau gach ngang khi nhap so dien
-- thoai. Van giu nguyen viec khong tra sdt_1/sdt_2 that trong ket qua
-- (bao mat rieng tu phu huynh) - so dien thoai chi dung de xac thuc,
-- khong hien thi lai.

drop function if exists public.lay_ho_so_cong_khai(text);

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
            'ngay_bat_dau', bcs.ngay_bat_dau
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
