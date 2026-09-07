-- Cho phep GVCN sua lai thong tin hoc sinh CS2 ngay tu trang quan tri (thay
-- vi chi hoc sinh tu sua duoc qua trang cong khai) - vd hoc sinh doc thong
-- tin qua dien thoai nho GVCN nhap ho, hoac can sua lai ho/ten/lop bi sai
-- (2 truong nay hoc sinh khong tu sua duoc qua trang cong khai). Ghi lai
-- lich su voi nguon = 'gvcn_sua' (da du tinh san trong thiet ke bang
-- cs2_hoc_sinh_lienlac_lichsu.nguon tu dau, gio moi thuc su co duong dan
-- tao ra gia tri nay).
create or replace function public.cap_nhat_thongtin_hs_admin(
  p_ma_hs text,
  p_ho text,
  p_ten text,
  p_lop text,
  p_email text,
  p_dia_chi_so_nha text,
  p_dia_chi_tinh_thanh text,
  p_dia_chi_phuong_xa text,
  p_cccd text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs text := btrim(coalesce(p_ma_hs, ''));
  v_ho text := btrim(coalesce(p_ho, ''));
  v_ten text := btrim(coalesce(p_ten, ''));
  v_lop text := btrim(coalesce(p_lop, ''));
  v_email text := btrim(coalesce(p_email, ''));
  v_so_nha text := btrim(coalesce(p_dia_chi_so_nha, ''));
  v_tinh_thanh text := btrim(coalesce(p_dia_chi_tinh_thanh, ''));
  v_phuong_xa text := btrim(coalesce(p_dia_chi_phuong_xa, ''));
  v_cccd text := btrim(coalesce(p_cccd, ''));
  v_dia_chi_day_du text;
  v_old jsonb;
  v_new jsonb;
begin
  if not exists (select 1 from public.cs2_hoc_sinh where ma_hs = v_ma_hs) then
    raise exception 'Không tìm thấy học sinh mã "%".', v_ma_hs;
  end if;
  if v_ten = '' then
    raise exception 'Chưa nhập tên học sinh.';
  end if;
  if v_ten ~ '[0-9]' or v_ho ~ '[0-9]' then
    raise exception 'Họ/tên học sinh không được chứa số.';
  end if;
  if v_lop = '' then
    raise exception 'Chưa chọn lớp.';
  end if;
  if v_email <> '' and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Email không đúng định dạng.';
  end if;
  if v_cccd <> '' and v_cccd !~ '^[0-9]{12}$' then
    raise exception 'Số CCCD/mã định danh phải gồm đúng 12 chữ số.';
  end if;

  v_dia_chi_day_du := nullif(concat_ws(', ', nullif(v_so_nha, ''), nullif(v_phuong_xa, ''), nullif(v_tinh_thanh, '')), '');

  select jsonb_build_object('email', email, 'dia_chi_hien_tai', dia_chi_hien_tai, 'cccd', cccd)
  into v_old
  from public.cs2_hoc_sinh
  where ma_hs = v_ma_hs;

  v_new := jsonb_build_object(
    'email', nullif(v_email, ''),
    'dia_chi_hien_tai', v_dia_chi_day_du,
    'cccd', nullif(v_cccd, '')
  );

  update public.cs2_hoc_sinh
  set ho = v_ho,
      ten = v_ten,
      lop = v_lop,
      email = nullif(v_email, ''),
      dia_chi_so_nha = nullif(v_so_nha, ''),
      dia_chi_tinh_thanh = nullif(v_tinh_thanh, ''),
      dia_chi_phuong_xa = nullif(v_phuong_xa, ''),
      dia_chi_hien_tai = v_dia_chi_day_du,
      cccd = nullif(v_cccd, '')
  where ma_hs = v_ma_hs;

  -- Chi ghi lich su neu 1 trong 3 truong lien lac thuc su thay doi - tranh
  -- lich su nhieu dong "khong doi gi" moi lan GVCN chi sua ho/ten/lop.
  if v_old is distinct from v_new then
    insert into public.cs2_hoc_sinh_lienlac_lichsu (ma_hs, gia_tri_cu, gia_tri_moi, nguon)
    values (v_ma_hs, v_old, v_new, 'gvcn_sua');
  end if;
end;
$$;

revoke all on function public.cap_nhat_thongtin_hs_admin(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.cap_nhat_thongtin_hs_admin(text, text, text, text, text, text, text, text, text) to authenticated;
