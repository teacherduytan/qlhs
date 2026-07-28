-- Mo rong quyen "Nhap de xuat ghi nhan cho lop" tu chi Lop truong sang
-- ca Lop pho hoc tap. Moi RPC cong khai lien quan (xac_thuc_pin_lop_truong,
-- lay_du_lieu_lop_truong, gui_de_xuat_ghi_nhan, sua_de_xuat_ghi_nhan,
-- xoa_de_xuat_ghi_nhan, lay_lich_su_de_xuat_lop_truong) deu di qua ham
-- helper _qlhs_lop_truong_ma_hs nen chi can sua 1 cho la ap dung het.

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
  where bcs.ma_hs = v_ma_hs and bcs.chuc_vu in ('Lớp trưởng', 'Lớp phó học tập')
  limit 1;

  if v_pin is null or v_pin <> p_pin then
    return null;
  end if;

  return v_ma_hs;
end;
$$;
