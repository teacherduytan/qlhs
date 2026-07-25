-- Them Tiet/Mon hoc cho de xuat ghi nhan cua lop truong, giong cac truong
-- giao vien da co san o RecordEntryPage. Nguoi ghi khong can lop truong chon -
-- van tu dong gan theo chuc danh ("Lop truong <ten>") luc giao vien duyet,
-- khong doi logic do.

alter table public.de_xuat_ghi_nhan
  add column if not exists tiet text,
  add column if not exists mon_hoc text;

drop function if exists public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text, date);

create or replace function public.gui_de_xuat_ghi_nhan(
  p_token text,
  p_pin text,
  p_ma_hs text,
  p_ma_danh_muc text,
  p_noi_dung text,
  p_de_xuat_nhom text default null,
  p_ngay date default null,
  p_tiet text default null,
  p_mon_hoc text default null
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

  insert into public.de_xuat_ghi_nhan (
    ma_hs, ma_danh_muc, noi_dung, nguoi_de_xuat, ma_hs_de_xuat, de_xuat_nhom, ngay, tiet, mon_hoc
  )
  values (
    p_ma_hs,
    v_ma_danh_muc,
    nullif(btrim(coalesce(p_noi_dung, '')), ''),
    v_ten_lt,
    v_ma_hs_lt,
    case when v_ma_danh_muc is null then v_de_xuat_nhom else null end,
    coalesce(p_ngay, current_date),
    nullif(btrim(coalesce(p_tiet, '')), ''),
    nullif(btrim(coalesce(p_mon_hoc, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text, date, text, text) from public;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text, date, text, text) to anon;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text, date, text, text) to authenticated;

drop function if exists public.sua_de_xuat_ghi_nhan(text, text, uuid, text, text, text, text, date);

create or replace function public.sua_de_xuat_ghi_nhan(
  p_token text,
  p_pin text,
  p_id uuid,
  p_ma_hs text,
  p_ma_danh_muc text,
  p_noi_dung text,
  p_de_xuat_nhom text default null,
  p_ngay date default null,
  p_tiet text default null,
  p_mon_hoc text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs_lt text;
  v_ma_danh_muc text := nullif(btrim(coalesce(p_ma_danh_muc, '')), '');
  v_de_xuat_nhom text := nullif(btrim(coalesce(p_de_xuat_nhom, '')), '');
  v_trang_thai text;
  v_owner text;
begin
  v_ma_hs_lt := public._qlhs_lop_truong_ma_hs(p_token, p_pin);
  if v_ma_hs_lt is null then
    raise exception 'Token hoac ma PIN khong dung.';
  end if;

  select trang_thai, ma_hs_de_xuat into v_trang_thai, v_owner
  from public.de_xuat_ghi_nhan
  where id = p_id;

  if v_owner is null or v_owner <> v_ma_hs_lt then
    raise exception 'Khong tim thay de xuat nay.';
  end if;
  if v_trang_thai <> 'cho_duyet' then
    raise exception 'De xuat da duoc giao vien xu ly, khong sua duoc nua.';
  end if;

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

  update public.de_xuat_ghi_nhan
  set
    ma_hs = p_ma_hs,
    ma_danh_muc = v_ma_danh_muc,
    noi_dung = nullif(btrim(coalesce(p_noi_dung, '')), ''),
    de_xuat_nhom = case when v_ma_danh_muc is null then v_de_xuat_nhom else null end,
    ngay = coalesce(p_ngay, ngay),
    tiet = nullif(btrim(coalesce(p_tiet, '')), ''),
    mon_hoc = nullif(btrim(coalesce(p_mon_hoc, '')), '')
  where id = p_id;
end;
$$;

revoke all on function public.sua_de_xuat_ghi_nhan(text, text, uuid, text, text, text, text, date, text, text) from public;
grant execute on function public.sua_de_xuat_ghi_nhan(text, text, uuid, text, text, text, text, date, text, text) to anon;
grant execute on function public.sua_de_xuat_ghi_nhan(text, text, uuid, text, text, text, text, date, text, text) to authenticated;
