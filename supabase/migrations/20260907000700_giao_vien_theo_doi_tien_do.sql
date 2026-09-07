-- Tab "Giao vien theo doi tien do" trong trang tra cuu cong khai (/cs2/tra-cuu)
-- - GVCN tung lop dang nhap bang chinh ten lop (vd "11C5") + mat khau chung
-- "cs2" (tuong tu do bao mat don gian nhu admincs2/admincs2 da co, khong can
-- tao tai khoan Supabase Auth rieng cho tung lop vi khong biet truoc het
-- danh sach lop se co).
--
-- Khong dung Supabase Auth cho vai tro nay - client van chay o role anon,
-- nen MOI RPC lien quan deu tu kiem tra lai p_lop + p_mat_khau ben trong
-- (khong tin session phia client), tranh truong hop sua state cuc bo de gia
-- mao dang nhap. Mat khau "cs2" hardcode ngay trong ham, khong luu bang
-- rieng vi dung chung cho tat ca lop.

create or replace function public._qlhs_cs2_xac_thuc_giao_vien(p_lop text, p_mat_khau text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lop is null or btrim(p_lop) = '' or coalesce(p_mat_khau, '') <> 'cs2' then
    return false;
  end if;
  return exists (select 1 from public.cs2_hoc_sinh where lop = btrim(p_lop));
end;
$$;

revoke all on function public._qlhs_cs2_xac_thuc_giao_vien(text, text) from public;

create or replace function public.giao_vien_dang_nhap(p_lop text, p_mat_khau text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._qlhs_cs2_xac_thuc_giao_vien(p_lop, p_mat_khau);
end;
$$;

revoke all on function public.giao_vien_dang_nhap(text, text) from public;
grant execute on function public.giao_vien_dang_nhap(text, text) to anon;
grant execute on function public.giao_vien_dang_nhap(text, text) to authenticated;

create or replace function public.giao_vien_danh_sach_lop(p_lop text, p_mat_khau text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._qlhs_cs2_xac_thuc_giao_vien(p_lop, p_mat_khau) then
    raise exception 'Sai lớp hoặc mật khẩu.';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'ma_hs', hs.ma_hs,
          'ho', hs.ho,
          'ten', hs.ten,
          'lop', hs.lop,
          'email', hs.email,
          'dia_chi_hien_tai', hs.dia_chi_hien_tai,
          'cccd', hs.cccd,
          'so_lan_sua_lienlac', hs.so_lan_sua_lienlac,
          'ngay_cap_nhat_lienlac', hs.ngay_cap_nhat_lienlac
        )
        order by hs.ho, hs.ten
      )
      from public.cs2_hoc_sinh hs
      where hs.lop = btrim(p_lop) and hs.ngay_roi_lop is null
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.giao_vien_danh_sach_lop(text, text) from public;
grant execute on function public.giao_vien_danh_sach_lop(text, text) to anon;
grant execute on function public.giao_vien_danh_sach_lop(text, text) to authenticated;

create or replace function public.giao_vien_them_nhanh_hoc_sinh(p_lop text, p_mat_khau text, p_ten_hs text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lop text := btrim(coalesce(p_lop, ''));
  v_ten_hs text := btrim(coalesce(p_ten_hs, ''));
  v_ho text;
  v_ten text;
  v_cut integer;
  v_ma_hs text;
begin
  if not public._qlhs_cs2_xac_thuc_giao_vien(p_lop, p_mat_khau) then
    raise exception 'Sai lớp hoặc mật khẩu.';
  end if;
  if v_ten_hs = '' then
    raise exception 'Chưa nhập tên học sinh.';
  end if;
  if v_ten_hs ~ '[0-9]' then
    raise exception 'Tên học sinh không được chứa số.';
  end if;

  v_cut := length(v_ten_hs) - length(reverse(split_part(reverse(v_ten_hs), ' ', 1)));
  if v_cut > 0 then
    v_ho := btrim(substring(v_ten_hs from 1 for v_cut));
    v_ten := btrim(substring(v_ten_hs from v_cut + 1));
  else
    v_ho := '';
    v_ten := v_ten_hs;
  end if;

  v_ma_hs := public.sinh_ma_hs_tudong();

  insert into public.cs2_hoc_sinh (ma_hs, ho, ten, lop, co_so, ngay_nhap_hoc)
  values (v_ma_hs, v_ho, v_ten, v_lop, 'CS2', current_date);

  return v_ma_hs;
end;
$$;

revoke all on function public.giao_vien_them_nhanh_hoc_sinh(text, text, text) from public;
grant execute on function public.giao_vien_them_nhanh_hoc_sinh(text, text, text) to anon;
grant execute on function public.giao_vien_them_nhanh_hoc_sinh(text, text, text) to authenticated;
