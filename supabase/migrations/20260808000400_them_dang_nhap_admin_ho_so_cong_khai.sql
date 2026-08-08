-- ============================================================================
-- QLHS 11C5 - He thong quan ly hoc sinh
-- (c) Nguyen Duy Tan - Giao vien Tin hoc, GVCN 11C5
-- ============================================================================
--
-- Them tai khoan "admin" dung chung tren FORM DANG NHAP CONG KHAI cua tung
-- hoc sinh (/hs/:token) - go dung sdt = 'admin', mat khau = 'admin123@@'
-- se bo qua buoc kiem tra SDT/mat khau that cua hoc sinh, cho phep giao vien
-- xem dung nhu ban cong khai cua BAT KY token nao ma khong can biet SDT that
-- cua em do. Van phai biet dung token (link rieng tung em) - tai khoan admin
-- KHONG bo qua yeu cau token, chi bo qua buoc doi khop SDT/mat khau.
--
-- LUU Y BAO MAT: bat ky ai biet ca 2 thu "link token cua 1 em" + "mat khau
-- admin nay" deu xem duoc ho so cong khai cua em do (nhung KHONG xem duoc
-- SDT that, van bi an nhu cu). Giu mat khau admin nay rieng tu, chi giao vien
-- biet, khong chia se chung voi hoc sinh/phu huynh.
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
  ban_can_su jsonb,
  attendance jsonb,
  huy_hieu jsonb,
  duyet jsonb,
  rank_bac jsonb,
  rank_lich_su jsonb,
  dong_hanh_cau_hinh jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_la_admin boolean := btrim(coalesce(p_sdt, '')) = 'admin' and coalesce(p_mat_khau, '') = 'admin123@@';
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

  if not v_la_admin then
    if v_sdt_input <> v_sdt_luu then
      return;
    end if;

    if v_mat_khau_input = '' or v_mat_khau_input <> right(v_sdt_luu, 3) then
      return;
    end if;
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
    ) as ban_can_su,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', dd.id,
            'ma_hs', dd.ma_hs,
            'ngay', dd.ngay,
            'tuan_so', dd.tuan_so,
            'buoi', dd.buoi,
            'trang_thai', dd.trang_thai
          )
          order by dd.ngay desc, dd.buoi asc
        )
        from public.diem_danh dd
        where dd.ma_hs = hs.ma_hs and dd.ma_nhom = 'CHINH_KHOA'
      ),
      '[]'::jsonb
    ) as attendance,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ma_huy_hieu', hh.ma_huy_hieu,
            'ten_huy_hieu', hh.ten_huy_hieu,
            'icon', hh.icon,
            'dieu_kien', hh.dieu_kien,
            'mo_ta', hh.mo_ta,
            'thu_tu', hh.thu_tu
          )
          order by hh.thu_tu asc, hh.ma_huy_hieu asc
        )
        from public.dong_hanh_huy_hieu hh
        where hh.dang_bat = true
      ),
      '[]'::jsonb
    ) as huy_hieu,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', dhd.id,
            'tuan_so', dhd.tuan_so,
            'loai', dhd.loai,
            'ma_luat', dhd.ma_luat,
            'noi_dung_da_duyet', dhd.noi_dung_da_duyet
          )
          order by dhd.tuan_so desc
        )
        from public.dong_hanh_duyet dhd
        where dhd.ma_hs = hs.ma_hs and dhd.trang_thai = 'da_duyet'
      ),
      '[]'::jsonb
    ) as duyet,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'bac', rb.bac,
            'ma', rb.ma,
            'ten', rb.ten,
            'icon', rb.icon,
            'diem_toi_thieu', rb.diem_toi_thieu,
            'mo_ta', rb.mo_ta
          )
          order by rb.bac asc
        )
        from public.rank_bac_tinh_tu rb
        where rb.dang_bat = true
      ),
      '[]'::jsonb
    ) as rank_bac,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'tuan_so', rl.tuan_so,
            'diem_ren_luyen', rl.diem_ren_luyen,
            'so_huy_hieu', rl.so_huy_hieu,
            'diem_thuong', rl.diem_thuong,
            'diem_tuan', rl.diem_tuan,
            'bac_dat', rl.bac_dat
          )
          order by rl.tuan_so desc
        )
        from public.rank_lich_su_tuan rl
        where rl.ma_hs = hs.ma_hs
      ),
      '[]'::jsonb
    ) as rank_lich_su,
    coalesce(
      (
        select jsonb_object_agg(dc.khoa, dc.gia_tri)
        from public.dong_hanh_cau_hinh dc
      ),
      '{}'::jsonb
    ) as dong_hanh_cau_hinh
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
