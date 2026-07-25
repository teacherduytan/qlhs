-- Cho phep lop truong de xuat ghi nhan ngay ca khi khong tim thay danh muc
-- phu hop trong he thong: chon "de xuat danh muc moi" thay vi bat buoc chon
-- 1 ma co san. Giao vien duyet se chon danh muc gan dung co san, hoac tao
-- danh muc moi tu chinh de xuat do, truoc khi tao ghi_nhan that.

alter table public.de_xuat_ghi_nhan
  alter column ma_danh_muc drop not null;

alter table public.de_xuat_ghi_nhan
  add column if not exists de_xuat_nhom text check (de_xuat_nhom in ('CC', 'VS', 'NN', 'KL', 'KT'));

comment on column public.de_xuat_ghi_nhan.de_xuat_nhom is
  'Chi co gia tri khi ma_danh_muc la null, tuc luc gui hoc sinh chon "de xuat danh muc moi" thay vi mot ma co san.';

drop function if exists public.gui_de_xuat_ghi_nhan(text, text, text, text, text);

create or replace function public.gui_de_xuat_ghi_nhan(
  p_token text,
  p_pin text,
  p_ma_hs text,
  p_ma_danh_muc text,
  p_noi_dung text,
  p_de_xuat_nhom text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs_lt text;
  v_ten_lt text;
  v_id uuid;
  v_ma_danh_muc text := nullif(btrim(coalesce(p_ma_danh_muc, '')), '');
  v_de_xuat_nhom text := nullif(btrim(coalesce(p_de_xuat_nhom, '')), '');
begin
  v_ma_hs_lt := public._qlhs_lop_truong_ma_hs(p_token, p_pin);
  if v_ma_hs_lt is null then
    raise exception 'Token hoac ma PIN khong dung.';
  end if;

  select concat_ws(' ', hs.ho, hs.ten) into v_ten_lt
  from public.hoc_sinh hs
  where hs.ma_hs = v_ma_hs_lt;

  if p_ma_hs is null or not exists (select 1 from public.hoc_sinh where ma_hs = p_ma_hs) then
    raise exception 'Khong tim thay hoc sinh can ghi nhan.';
  end if;

  if v_ma_danh_muc is not null then
    if not exists (
      select 1 from public.danh_muc_diem
      where ma_danh_muc = v_ma_danh_muc and pham_vi = 'ca_nhan'
    ) then
      raise exception 'Danh muc khong hop le.';
    end if;
  else
    if v_de_xuat_nhom is null or v_de_xuat_nhom not in ('CC', 'VS', 'NN', 'KL', 'KT') then
      raise exception 'Can chon nhom cho danh muc de xuat moi.';
    end if;
    if p_noi_dung is null or btrim(p_noi_dung) = '' then
      raise exception 'Can mo ta noi dung cho danh muc de xuat moi.';
    end if;
  end if;

  insert into public.de_xuat_ghi_nhan (ma_hs, ma_danh_muc, noi_dung, nguoi_de_xuat, ma_hs_de_xuat, de_xuat_nhom)
  values (
    p_ma_hs,
    v_ma_danh_muc,
    nullif(btrim(coalesce(p_noi_dung, '')), ''),
    v_ten_lt,
    v_ma_hs_lt,
    case when v_ma_danh_muc is null then v_de_xuat_nhom else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text) from public;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text) to anon;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text) to authenticated;
