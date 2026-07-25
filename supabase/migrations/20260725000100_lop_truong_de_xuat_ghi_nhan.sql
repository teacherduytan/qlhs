-- Cho phep hoc sinh giu chuc vu "Lop truong" tu nhap de xuat ghi nhan (vi pham
-- hoac tich cuc) cho ban cung lop, qua dung link ho so cong khai /hs/:token.
-- Giao vien phai duyet moi de xuat truoc khi no tro thanh ghi_nhan that va
-- tinh vao diem - khong tin tuong tuyet doi vao thao tac tu phia hoc sinh.
--
-- Xac thuc: ngoai token, lop truong phai nhap dung ma PIN rieng (giao vien
-- cap/doi trong ban_can_su.ma_pin). PIN luu dang van ban thuong (khong hash)
-- vi day la app quy mo 1 lop, khong phai he thong dang nhap that; ma_pin
-- khong bao gio duoc grant SELECT cho anon/authenticated, chi doc duoc ben
-- trong cac function security definer duoi day.

alter table public.ban_can_su
  add column if not exists ma_pin text;

create table if not exists public.de_xuat_ghi_nhan (
  id uuid primary key default gen_random_uuid(),
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  ma_danh_muc text not null references public.danh_muc_diem(ma_danh_muc) on update cascade,
  noi_dung text,
  nguoi_de_xuat text not null,
  ma_hs_de_xuat text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  trang_thai text not null default 'cho_duyet' check (trang_thai in ('cho_duyet', 'da_duyet', 'tu_choi')),
  ghi_chu_giao_vien text,
  ma_ghi_nhan text references public.ghi_nhan(ma_ghi_nhan) on update cascade on delete set null,
  thoi_gian timestamptz not null default now()
);

create index if not exists idx_de_xuat_ghi_nhan_trang_thai on public.de_xuat_ghi_nhan (trang_thai);

alter table public.de_xuat_ghi_nhan enable row level security;

grant select, insert, update, delete on public.de_xuat_ghi_nhan to authenticated;

drop policy if exists "authenticated can manage de_xuat_ghi_nhan" on public.de_xuat_ghi_nhan;
create policy "authenticated can manage de_xuat_ghi_nhan" on public.de_xuat_ghi_nhan
  for all to authenticated using (true) with check (true);

-- Khong grant gi cho anon tren ban_can_su/de_xuat_ghi_nhan; moi thao tac cua
-- hoc sinh (lop truong) di qua 2 function security definer ben duoi.

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
  where bcs.ma_hs = v_ma_hs and bcs.chuc_vu = 'Lớp trưởng'
  limit 1;

  if v_pin is null or v_pin <> p_pin then
    return null;
  end if;

  return v_ma_hs;
end;
$$;

revoke all on function public._qlhs_lop_truong_ma_hs(text, text) from public;

create or replace function public.xac_thuc_pin_lop_truong(p_token text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._qlhs_lop_truong_ma_hs(p_token, p_pin) is not null;
end;
$$;

revoke all on function public.xac_thuc_pin_lop_truong(text, text) from public;
grant execute on function public.xac_thuc_pin_lop_truong(text, text) to anon;
grant execute on function public.xac_thuc_pin_lop_truong(text, text) to authenticated;

create or replace function public.gui_de_xuat_ghi_nhan(
  p_token text,
  p_pin text,
  p_ma_hs text,
  p_ma_danh_muc text,
  p_noi_dung text
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

  if p_ma_danh_muc is null
    or not exists (
      select 1 from public.danh_muc_diem
      where ma_danh_muc = p_ma_danh_muc and pham_vi = 'ca_nhan'
    )
  then
    raise exception 'Danh muc khong hop le.';
  end if;

  insert into public.de_xuat_ghi_nhan (ma_hs, ma_danh_muc, noi_dung, nguoi_de_xuat, ma_hs_de_xuat)
  values (p_ma_hs, p_ma_danh_muc, nullif(btrim(coalesce(p_noi_dung, '')), ''), v_ten_lt, v_ma_hs_lt)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text) from public;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text) to anon;
grant execute on function public.gui_de_xuat_ghi_nhan(text, text, text, text, text) to authenticated;

-- Lop truong can danh sach ban cung lop + danh muc ca nhan de dien form de xuat.
-- Chi tra du lieu khi token + PIN dung; PIN sai tra ve 0 dong (khong loi, khong
-- lo thong tin token/PIN nao dung).
create or replace function public.lay_du_lieu_lop_truong(p_token text, p_pin text)
returns table (
  students jsonb,
  catalog jsonb
)
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
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('ma_hs', hs.ma_hs, 'ho', hs.ho, 'ten', hs.ten, 'tt', hs.tt)
          order by hs.tt
        )
        from public.hoc_sinh hs
        where hs.ngay_roi_lop is null
      ),
      '[]'::jsonb
    ) as students,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ma_danh_muc', dm.ma_danh_muc,
            'nhom', dm.nhom,
            'ten_muc', dm.ten_muc,
            'diem', dm.diem,
            'pham_vi', dm.pham_vi
          )
          order by dm.nhom, dm.ma_danh_muc
        )
        from public.danh_muc_diem dm
        where dm.pham_vi = 'ca_nhan'
      ),
      '[]'::jsonb
    ) as catalog;
end;
$$;

revoke all on function public.lay_du_lieu_lop_truong(text, text) from public;
grant execute on function public.lay_du_lieu_lop_truong(text, text) to anon;
grant execute on function public.lay_du_lieu_lop_truong(text, text) to authenticated;
