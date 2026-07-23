create table if not exists public.nhom_diem_danh (
  ma_nhom text primary key,
  ten_nhom text not null,
  so_buoi_ngay smallint not null default 1,
  ghi_chu text
);

insert into public.nhom_diem_danh (ma_nhom, ten_nhom, so_buoi_ngay, ghi_chu) values
  ('CHINH_KHOA', 'Diem danh chinh khoa', 2, 'Ca lop 11C5, tach buoi Sang/Chieu'),
  ('AN_TRUA', 'Diem danh an trua', 1, 'Chi hoc sinh dien BT/NT cua 11C5'),
  ('NGU_TRUA', 'Diem danh ngu trua', 1, 'Nhom ngu trua, co the gom hoc sinh ngoai lop')
on conflict (ma_nhom) do update set
  ten_nhom = excluded.ten_nhom,
  so_buoi_ngay = excluded.so_buoi_ngay,
  ghi_chu = excluded.ghi_chu;

create table if not exists public.hoc_sinh_ngoai_lop (
  ma_hs_ngoai text primary key,
  ho_ten text not null,
  lop text not null,
  sdt text
);

create table if not exists public.thanh_vien_nhom_diem_danh (
  ma_nhom text not null references public.nhom_diem_danh(ma_nhom) on update cascade on delete cascade,
  ma_hs text references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  ma_hs_ngoai text references public.hoc_sinh_ngoai_lop(ma_hs_ngoai) on update cascade on delete cascade,
  check ((ma_hs is not null) <> (ma_hs_ngoai is not null))
);

create unique index if not exists uniq_thanh_vien_nhom_hoc_sinh
  on public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  where ma_hs is not null;

create unique index if not exists uniq_thanh_vien_nhom_hoc_sinh_ngoai
  on public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs_ngoai)
  where ma_hs_ngoai is not null;

insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'CHINH_KHOA', ma_hs
  from public.hoc_sinh
on conflict do nothing;

insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'AN_TRUA', ma_hs
  from public.hoc_sinh
  where dien in ('BT', 'NT')
on conflict do nothing;

insert into public.thanh_vien_nhom_diem_danh (ma_nhom, ma_hs)
  select 'NGU_TRUA', ma_hs
  from public.hoc_sinh
  where dien in ('BT', 'NT') and nu = false
on conflict do nothing;

create table if not exists public.diem_danh (
  id uuid primary key default gen_random_uuid(),
  ma_nhom text not null references public.nhom_diem_danh(ma_nhom) on update cascade on delete cascade,
  ma_hs text references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  ma_hs_ngoai text references public.hoc_sinh_ngoai_lop(ma_hs_ngoai) on update cascade on delete cascade,
  ngay date not null,
  tuan_so integer not null references public.cau_hinh_tuan(tuan_so) on update cascade,
  buoi text not null default 'ca_ngay' check (buoi in ('sang', 'chieu', 'ca_ngay')),
  trang_thai text not null check (
    trang_thai in ('vang_co_phep', 'vang_khong_phep', 'tre', 'vang_co_phep_sang', 'vang_khong_phep_sang')
  ),
  ghi_chu text,
  nguoi_ghi text,
  created_at timestamptz default now(),
  check ((ma_hs is not null) <> (ma_hs_ngoai is not null))
);

create unique index if not exists uniq_diem_danh_hoc_sinh
  on public.diem_danh (ma_nhom, ma_hs, ngay, buoi)
  where ma_hs is not null;

create unique index if not exists uniq_diem_danh_hoc_sinh_ngoai
  on public.diem_danh (ma_nhom, ma_hs_ngoai, ngay, buoi)
  where ma_hs_ngoai is not null;

create index if not exists idx_diem_danh_tuan on public.diem_danh (tuan_so);
create index if not exists idx_diem_danh_ngay on public.diem_danh (ngay);

create table if not exists public.lien_lac_phu_huynh (
  id uuid primary key default gen_random_uuid(),
  diem_danh_id uuid not null references public.diem_danh(id) on delete cascade,
  hinh_thuc text check (hinh_thuc in ('dien_thoai', 'goi_zalo', 'nhan_tin_zalo', 'sms')),
  noi_dung text,
  nguoi_lien_lac text,
  thoi_gian timestamptz default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.nhom_diem_danh,
  public.hoc_sinh_ngoai_lop,
  public.thanh_vien_nhom_diem_danh,
  public.diem_danh,
  public.lien_lac_phu_huynh
to authenticated;

alter table public.nhom_diem_danh enable row level security;
alter table public.hoc_sinh_ngoai_lop enable row level security;
alter table public.thanh_vien_nhom_diem_danh enable row level security;
alter table public.diem_danh enable row level security;
alter table public.lien_lac_phu_huynh enable row level security;

drop policy if exists "authenticated can manage nhom_diem_danh" on public.nhom_diem_danh;
create policy "authenticated can manage nhom_diem_danh" on public.nhom_diem_danh
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can manage hoc_sinh_ngoai_lop" on public.hoc_sinh_ngoai_lop;
create policy "authenticated can manage hoc_sinh_ngoai_lop" on public.hoc_sinh_ngoai_lop
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can manage thanh_vien_nhom_diem_danh" on public.thanh_vien_nhom_diem_danh;
create policy "authenticated can manage thanh_vien_nhom_diem_danh" on public.thanh_vien_nhom_diem_danh
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can manage diem_danh" on public.diem_danh;
create policy "authenticated can manage diem_danh" on public.diem_danh
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can manage lien_lac_phu_huynh" on public.lien_lac_phu_huynh;
create policy "authenticated can manage lien_lac_phu_huynh" on public.lien_lac_phu_huynh
  for all to authenticated using (true) with check (true);

create or replace function public.tinh_bao_cao_si_so(
  p_ngay date,
  p_buoi text,
  p_tre_tinh_co_mat boolean default true
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tuan_so integer;
  v_buoi text;
  v_co_mat jsonb;
  v_tong jsonb;
  v_vang jsonb;
begin
  v_buoi := lower(btrim(coalesce(p_buoi, '')));
  if v_buoi not in ('sang', 'chieu') then
    raise exception 'Buoi diem danh khong hop le: %', p_buoi;
  end if;

  select tuan_so
  into v_tuan_so
  from public.cau_hinh_tuan
  where tu_ngay <= p_ngay and p_ngay <= den_ngay
  order by tuan_so desc
  limit 1;

  if v_tuan_so is null then
    raise exception 'Ngay nay chua co trong lich diem danh.';
  end if;

  with members as (
    select hs.ma_hs, hs.ho, hs.ten, hs.dien
    from public.thanh_vien_nhom_diem_danh tv
    join public.hoc_sinh hs on hs.ma_hs = tv.ma_hs
    where tv.ma_nhom = 'CHINH_KHOA'
  ),
  totals as (
    select dien, count(*)::integer as so_luong
    from members
    group by dien
  )
  select jsonb_build_object(
    'NT', coalesce(max(so_luong) filter (where dien = 'NT'), 0),
    'BT', coalesce(max(so_luong) filter (where dien = 'BT'), 0),
    '2B', coalesce(max(so_luong) filter (where dien = '2B'), 0)
  )
  into v_tong
  from totals;

  with members as (
    select hs.ma_hs, hs.ho, hs.ten, hs.dien
    from public.thanh_vien_nhom_diem_danh tv
    join public.hoc_sinh hs on hs.ma_hs = tv.ma_hs
    where tv.ma_nhom = 'CHINH_KHOA'
  ),
  present_members as (
    select m.*
    from members m
    where not exists (
      select 1
      from public.diem_danh dd
      where dd.ma_nhom = 'CHINH_KHOA'
        and dd.ma_hs = m.ma_hs
        and dd.ngay = p_ngay
        and dd.buoi = v_buoi
        and (
          dd.trang_thai in ('vang_co_phep', 'vang_khong_phep')
          or (dd.trang_thai = 'tre' and p_tre_tinh_co_mat = false)
        )
    )
  ),
  present_counts as (
    select dien, count(*)::integer as so_luong
    from present_members
    group by dien
  )
  select jsonb_build_object(
    'NT', coalesce(max(so_luong) filter (where dien = 'NT'), 0),
    'BT', coalesce(max(so_luong) filter (where dien = 'BT'), 0),
    '2B', coalesce(max(so_luong) filter (where dien = '2B'), 0)
  )
  into v_co_mat
  from present_counts;

  select coalesce(
    jsonb_agg(concat_ws(' ', hs.ho, hs.ten) || ' (' || hs.dien || ')' order by hs.ten, hs.ho),
    '[]'::jsonb
  )
  into v_vang
  from public.diem_danh dd
  join public.hoc_sinh hs on hs.ma_hs = dd.ma_hs
  where dd.ma_nhom = 'CHINH_KHOA'
    and dd.ngay = p_ngay
    and dd.buoi = v_buoi
    and (
      dd.trang_thai in ('vang_co_phep', 'vang_khong_phep')
      or (dd.trang_thai = 'tre' and p_tre_tinh_co_mat = false)
    );

  return jsonb_build_object(
    'ngay', p_ngay,
    'buoi', case when v_buoi = 'sang' then 'SANG' else 'CHIEU' end,
    'tuan_so', v_tuan_so,
    'sheet_name', 'Supabase - CHINH_KHOA - Tuan ' || v_tuan_so,
    'tre_tinh_co_mat', p_tre_tinh_co_mat,
    'co_mat', coalesce(v_co_mat, jsonb_build_object('NT', 0, 'BT', 0, '2B', 0)),
    'tong', coalesce(v_tong, jsonb_build_object('NT', 0, 'BT', 0, '2B', 0)),
    'vang', v_vang,
    'generated_at', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
end;
$$;

grant execute on function public.tinh_bao_cao_si_so(date, text, boolean) to authenticated;
