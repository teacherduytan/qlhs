-- Chuan hoa cach nhap dia chi hoc sinh CS2: thay 1 o textarea tu do bang 3
-- phan co cau truc (So nha/duong - tu do, Tinh/Thanh pho - chon tu danh sach
-- hanh chinh that, Phuong/Xa - chon tu danh sach hanh chinh that, loc theo
-- tinh da chon o frontend). Luu ten day du (khong luu code) de doc duoc
-- truc tiep tu CSDL ma khong can tra lai bang hanh chinh.
--
-- dia_chi_hien_tai duoc GIU LAI nhung tro thanh cot suy ra (ghep tu 3 phan
-- tren) - khong con duoc client ghi truc tiep nua, chi de hien thi gon o
-- bang danh sach quan tri (Cs2AdminPage.tsx) ma khong phai sua code o do.

alter table public.cs2_hoc_sinh
  add column if not exists dia_chi_so_nha text,
  add column if not exists dia_chi_tinh_thanh text,
  add column if not exists dia_chi_phuong_xa text;

-- cap_nhat_thongtin_hs doi tham so (6 -> 8) nen can drop ham cu truoc, vi
-- "create or replace function" khong cho phep doi danh sach tham so (se tao
-- ra 1 ham qua tai (overload) moi thay vi thay the ham cu).
drop function if exists public.cap_nhat_thongtin_hs(text, text, text, text, text, text);

create or replace function public.cap_nhat_thongtin_hs(
  p_ma_hs text,
  p_lop text,
  p_co_so text,
  p_email text,
  p_dia_chi_so_nha text,
  p_dia_chi_tinh_thanh text,
  p_dia_chi_phuong_xa text,
  p_cccd text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs text := btrim(coalesce(p_ma_hs, ''));
  v_email text := btrim(coalesce(p_email, ''));
  v_so_nha text := btrim(coalesce(p_dia_chi_so_nha, ''));
  v_tinh_thanh text := btrim(coalesce(p_dia_chi_tinh_thanh, ''));
  v_phuong_xa text := btrim(coalesce(p_dia_chi_phuong_xa, ''));
  v_cccd text := btrim(coalesce(p_cccd, ''));
  v_dia_chi_day_du text;
  v_exists boolean;
  v_so_lan_truoc integer;
  v_old jsonb;
  v_new jsonb;
  v_so_lan_moi integer;
begin
  select exists(
    select 1 from public.cs2_hoc_sinh
    where ma_hs = v_ma_hs and lop = p_lop and co_so = p_co_so and ngay_roi_lop is null
  ) into v_exists;

  if not v_exists then
    raise exception 'Không tìm thấy học sinh với thông tin đã nhập, vui lòng kiểm tra lại.';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Email không đúng định dạng.';
  end if;
  if v_so_nha = '' then
    raise exception 'Vui lòng nhập số nhà, tên đường.';
  end if;
  if v_tinh_thanh = '' then
    raise exception 'Vui lòng chọn Tỉnh/Thành phố.';
  end if;
  if v_phuong_xa = '' then
    raise exception 'Vui lòng chọn Phường/Xã.';
  end if;
  if v_cccd !~ '^[0-9]{12}$' then
    raise exception 'Số CCCD/mã định danh phải gồm đúng 12 chữ số.';
  end if;

  v_dia_chi_day_du := concat_ws(', ', v_so_nha, v_phuong_xa, v_tinh_thanh);

  select so_lan_sua_lienlac, jsonb_build_object('email', email, 'dia_chi_hien_tai', dia_chi_hien_tai, 'cccd', cccd)
  into v_so_lan_truoc, v_old
  from public.cs2_hoc_sinh
  where ma_hs = v_ma_hs;

  if v_so_lan_truoc = 0 then
    v_old := null;
  end if;

  v_new := jsonb_build_object('email', v_email, 'dia_chi_hien_tai', v_dia_chi_day_du, 'cccd', v_cccd);

  update public.cs2_hoc_sinh
  set email = v_email,
      dia_chi_so_nha = v_so_nha,
      dia_chi_tinh_thanh = v_tinh_thanh,
      dia_chi_phuong_xa = v_phuong_xa,
      dia_chi_hien_tai = v_dia_chi_day_du,
      cccd = v_cccd,
      ngay_cap_nhat_lienlac = now(),
      so_lan_sua_lienlac = so_lan_sua_lienlac + 1
  where ma_hs = v_ma_hs
  returning so_lan_sua_lienlac into v_so_lan_moi;

  insert into public.cs2_hoc_sinh_lienlac_lichsu (ma_hs, gia_tri_cu, gia_tri_moi, nguon)
  values (v_ma_hs, v_old, v_new, 'hs_tu_dien');

  return jsonb_build_object('so_lan_sua_lienlac', v_so_lan_moi);
end;
$$;

revoke all on function public.cap_nhat_thongtin_hs(text, text, text, text, text, text, text, text) from public;
grant execute on function public.cap_nhat_thongtin_hs(text, text, text, text, text, text, text, text) to anon;
grant execute on function public.cap_nhat_thongtin_hs(text, text, text, text, text, text, text, text) to authenticated;

-- tra_cuu_hoc_sinh giu nguyen chu ky (3 tham so, tra ve jsonb) - chi doi noi
-- dung jsonb tra ve de them 3 truong dia chi rieng (dung pre-fill lai dung
-- dropdown Tinh/Xa khi hoc sinh sua lai thong tin da nop truoc do).
create or replace function public.tra_cuu_hoc_sinh(p_ma_hs text, p_lop text, p_co_so text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select ma_hs, ho, ten, email, dia_chi_hien_tai, dia_chi_so_nha, dia_chi_tinh_thanh, dia_chi_phuong_xa, cccd,
         so_lan_sua_lienlac, ngay_cap_nhat_lienlac
  into v_row
  from public.cs2_hoc_sinh
  where ma_hs = btrim(coalesce(p_ma_hs, ''))
    and lop = p_lop
    and co_so = p_co_so
    and ngay_roi_lop is null
  limit 1;

  if v_row.ma_hs is null then
    raise exception 'Không tìm thấy học sinh với thông tin đã nhập, vui lòng kiểm tra lại.';
  end if;

  return jsonb_build_object(
    'ma_hs', v_row.ma_hs,
    'ten_hs', concat_ws(' ', v_row.ho, v_row.ten),
    'email', v_row.email,
    'dia_chi_hien_tai', v_row.dia_chi_hien_tai,
    'dia_chi_so_nha', v_row.dia_chi_so_nha,
    'dia_chi_tinh_thanh', v_row.dia_chi_tinh_thanh,
    'dia_chi_phuong_xa', v_row.dia_chi_phuong_xa,
    'cccd', v_row.cccd,
    'so_lan_sua_lienlac', v_row.so_lan_sua_lienlac,
    'ngay_cap_nhat_lienlac', v_row.ngay_cap_nhat_lienlac
  );
end;
$$;

revoke all on function public.tra_cuu_hoc_sinh(text, text, text) from public;
grant execute on function public.tra_cuu_hoc_sinh(text, text, text) to anon;
grant execute on function public.tra_cuu_hoc_sinh(text, text, text) to authenticated;
