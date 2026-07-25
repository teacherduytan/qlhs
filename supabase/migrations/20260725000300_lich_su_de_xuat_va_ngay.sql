-- Lop truong co the gui de xuat cho ngay khac hom nay (vi du nhap vao cuoi
-- tuan cho loi xay ra hom Thu Bay/Chu Nhat), va can xem/sua/xoa lai chinh
-- de xuat cua minh khi con o trang thai cho_duyet.

alter table public.de_xuat_ghi_nhan
  add column if not exists ngay date not null default current_date;

comment on column public.de_xuat_ghi_nhan.ngay is
  'Ngay xay ra su viec do lop truong chon, co the khac ngay gui (vi du gui bu cuoi tuan). Dung ngay nay khi tao ghi_nhan that luc duyet.';

-- gui_de_xuat_ghi_nhan: them tham so p_ngay
drop function if exists public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text);

create or replace function public.gui_de_xuat_ghi_nhan(
  p_token text,
  p_pin text,
  p_ma_hs text,
  p_ma_danh_muc text,
  p_noi_dung text,
  p_de_xuat_nhom text default null,
  p_ngay date default null
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

  insert into public.de_xuat_ghi_nhan (ma_hs, ma_danh_muc, noi_dung, nguoi_de_xuat, ma_hs_de_xuat, de_xuat_nhom, ngay)
  values (
    p_ma_hs,
    v_ma_danh_muc,
    nullif(btrim(coalesce(p_noi_dung, '')), ''),
    v_ten_lt,
    v_ma_hs_lt,
    case when v_ma_danh_muc is null then v_de_xuat_nhom else null end,
    coalesce(p_ngay, current_date)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text, date) from public;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text, date) to anon;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text, text, date) to authenticated;

-- Lop truong xem lai lich su chinh minh da gui (moi trang thai), de sua/xoa
-- khi con cho_duyet.
create or replace function public.lay_lich_su_de_xuat_lop_truong(p_token text, p_pin text)
returns setof public.de_xuat_ghi_nhan
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs_lt text;
begin
  v_ma_hs_lt := public._qlhs_lop_truong_ma_hs(p_token, p_pin);
  if v_ma_hs_lt is null then
    return;
  end if;

  return query
  select *
  from public.de_xuat_ghi_nhan
  where ma_hs_de_xuat = v_ma_hs_lt
  order by thoi_gian desc;
end;
$$;

revoke all on function public.lay_lich_su_de_xuat_lop_truong(text, text) from public;
grant execute on function public.lay_lich_su_de_xuat_lop_truong(text, text) to anon;
grant execute on function public.lay_lich_su_de_xuat_lop_truong(text, text) to authenticated;

-- Sua de xuat cua chinh minh, chi khi con cho_duyet.
create or replace function public.sua_de_xuat_ghi_nhan(
  p_token text,
  p_pin text,
  p_id uuid,
  p_ma_hs text,
  p_ma_danh_muc text,
  p_noi_dung text,
  p_de_xuat_nhom text default null,
  p_ngay date default null
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
    ngay = coalesce(p_ngay, ngay)
  where id = p_id;
end;
$$;

revoke all on function public.sua_de_xuat_ghi_nhan(text, text, uuid, text, text, text, text, date) from public;
grant execute on function public.sua_de_xuat_ghi_nhan(text, text, uuid, text, text, text, text, date) to anon;
grant execute on function public.sua_de_xuat_ghi_nhan(text, text, uuid, text, text, text, text, date) to authenticated;

-- Xoa de xuat cua chinh minh, chi khi con cho_duyet.
create or replace function public.xoa_de_xuat_ghi_nhan(p_token text, p_pin text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs_lt text;
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
    raise exception 'De xuat da duoc giao vien xu ly, khong xoa duoc nua.';
  end if;

  delete from public.de_xuat_ghi_nhan where id = p_id;
end;
$$;

revoke all on function public.xoa_de_xuat_ghi_nhan(text, text, uuid) from public;
grant execute on function public.xoa_de_xuat_ghi_nhan(text, text, uuid) to anon;
grant execute on function public.xoa_de_xuat_ghi_nhan(text, text, uuid) to authenticated;
