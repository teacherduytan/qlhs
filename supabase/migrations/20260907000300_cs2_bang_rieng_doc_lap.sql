-- Doi huong theo yeu cau moi: KHONG dung chung bang hoc_sinh cho tinh nang
-- thu thap thong tin lien lac/CCCD CS2 nua (bo luon co che chong trung lop
-- da lam o spec 17 - khong con can thiet vi khong con dung chung du lieu).
-- Tach hoan toan sang 2 bang moi cs2_hoc_sinh / cs2_hoc_sinh_lienlac_lichsu,
-- khong dung cham gi den hoc_sinh cua lop 11C5.

-- 1. Hoan tac phan da them nham vao hoc_sinh o migration 20260907000200 -----
drop table if exists public.hoc_sinh_lienlac_lichsu;

alter table public.hoc_sinh
  drop column if exists email,
  drop column if exists dia_chi_hien_tai,
  drop column if exists cccd,
  drop column if exists ngay_cap_nhat_lienlac,
  drop column if exists so_lan_sua_lienlac;

-- Ghi chu: cot hoc_sinh.lop / hoc_sinh.co_so (migration 20260907000100) VAN
-- GIU LAI - khong lien quan gi den quyet dinh tach bang nay, la 1 cai thien
-- an toan doc lap (loc dung lop 11C5 o getStudents()/lay_du_lieu_lop_truong)
-- da duoc xac nhan chay on tren Supabase, khong co ly do de hoan tac.

-- 2. Bang moi hoan toan doc lap ---------------------------------------------
create table if not exists public.cs2_hoc_sinh (
  ma_hs text primary key,
  ho text not null,
  ten text not null,
  lop text not null,
  co_so text not null default 'CS2',
  email text,
  dia_chi_hien_tai text,
  cccd text,
  ngay_cap_nhat_lienlac timestamptz,
  so_lan_sua_lienlac integer not null default 0,
  ngay_nhap_hoc date,
  ngay_roi_lop date,
  created_at timestamptz not null default now()
);

create index if not exists idx_cs2_hoc_sinh_lop on public.cs2_hoc_sinh(lop);
create index if not exists idx_cs2_hoc_sinh_co_so on public.cs2_hoc_sinh(co_so);

alter table public.cs2_hoc_sinh enable row level security;

drop policy if exists "authenticated can manage cs2_hoc_sinh" on public.cs2_hoc_sinh;
create policy "authenticated can manage cs2_hoc_sinh" on public.cs2_hoc_sinh
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists public.cs2_hoc_sinh_lienlac_lichsu (
  id uuid primary key default gen_random_uuid(),
  ma_hs text not null references public.cs2_hoc_sinh(ma_hs),
  gia_tri_cu jsonb,
  gia_tri_moi jsonb not null,
  nguon text not null,
  thoi_gian timestamptz not null default now()
);

create index if not exists idx_cs2_lienlac_lichsu_ma_hs on public.cs2_hoc_sinh_lienlac_lichsu(ma_hs);

alter table public.cs2_hoc_sinh_lienlac_lichsu enable row level security;

drop policy if exists "authenticated can read cs2_hoc_sinh_lienlac_lichsu" on public.cs2_hoc_sinh_lienlac_lichsu;
create policy "authenticated can read cs2_hoc_sinh_lienlac_lichsu" on public.cs2_hoc_sinh_lienlac_lichsu
  for select using (auth.role() = 'authenticated');

-- 3. RPC (dinh nghia lai, gio doc/ghi cs2_hoc_sinh thay vi hoc_sinh) --------

create or replace function public.danh_sach_lop_theo_co_so(p_co_so text)
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(distinct lop order by lop), array[]::text[])
  from public.cs2_hoc_sinh
  where co_so = p_co_so and ngay_roi_lop is null;
$$;

revoke all on function public.danh_sach_lop_theo_co_so(text) from public;
grant execute on function public.danh_sach_lop_theo_co_so(text) to anon;
grant execute on function public.danh_sach_lop_theo_co_so(text) to authenticated;

create or replace function public.tra_cuu_hoc_sinh(p_ma_hs text, p_lop text, p_co_so text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select ma_hs, ho, ten, email, dia_chi_hien_tai, cccd, so_lan_sua_lienlac, ngay_cap_nhat_lienlac
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
    'cccd', v_row.cccd,
    'so_lan_sua_lienlac', v_row.so_lan_sua_lienlac,
    'ngay_cap_nhat_lienlac', v_row.ngay_cap_nhat_lienlac
  );
end;
$$;

revoke all on function public.tra_cuu_hoc_sinh(text, text, text) from public;
grant execute on function public.tra_cuu_hoc_sinh(text, text, text) to anon;
grant execute on function public.tra_cuu_hoc_sinh(text, text, text) to authenticated;

create or replace function public.cap_nhat_thongtin_hs(
  p_ma_hs text,
  p_lop text,
  p_co_so text,
  p_email text,
  p_dia_chi text,
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
  v_dia_chi text := btrim(coalesce(p_dia_chi, ''));
  v_cccd text := btrim(coalesce(p_cccd, ''));
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
  if v_dia_chi = '' then
    raise exception 'Địa chỉ nhà đang sinh sống không được để trống.';
  end if;
  if v_cccd !~ '^[0-9]{12}$' then
    raise exception 'Số CCCD/mã định danh phải gồm đúng 12 chữ số.';
  end if;

  select so_lan_sua_lienlac, jsonb_build_object('email', email, 'dia_chi_hien_tai', dia_chi_hien_tai, 'cccd', cccd)
  into v_so_lan_truoc, v_old
  from public.cs2_hoc_sinh
  where ma_hs = v_ma_hs;

  if v_so_lan_truoc = 0 then
    v_old := null;
  end if;

  v_new := jsonb_build_object('email', v_email, 'dia_chi_hien_tai', v_dia_chi, 'cccd', v_cccd);

  update public.cs2_hoc_sinh
  set email = v_email,
      dia_chi_hien_tai = v_dia_chi,
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

revoke all on function public.cap_nhat_thongtin_hs(text, text, text, text, text, text) from public;
grant execute on function public.cap_nhat_thongtin_hs(text, text, text, text, text, text) to anon;
grant execute on function public.cap_nhat_thongtin_hs(text, text, text, text, text, text) to authenticated;

create or replace function public.them_nhanh_hoc_sinh(p_ma_hs text, p_ten_hs text, p_lop text, p_co_so text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs text := btrim(coalesce(p_ma_hs, ''));
  v_ten_hs text := btrim(coalesce(p_ten_hs, ''));
  v_lop text := btrim(coalesce(p_lop, ''));
  v_co_so text := btrim(coalesce(p_co_so, ''));
  v_ho text;
  v_ten text;
  v_cut integer;
begin
  if v_ma_hs = '' then
    raise exception 'Chưa nhập mã học sinh.';
  end if;
  if v_ten_hs = '' then
    raise exception 'Chưa nhập tên học sinh.';
  end if;
  if v_ten_hs ~ '[0-9]' then
    raise exception 'Tên học sinh không được chứa số.';
  end if;
  if v_lop = '' or v_co_so = '' then
    raise exception 'Chưa chọn lớp/cơ sở.';
  end if;
  if exists (select 1 from public.cs2_hoc_sinh where ma_hs = v_ma_hs) then
    raise exception 'Mã học sinh "%" đã tồn tại trong hệ thống.', v_ma_hs;
  end if;

  v_cut := length(v_ten_hs) - length(reverse(split_part(reverse(v_ten_hs), ' ', 1)));
  if v_cut > 0 then
    v_ho := btrim(substring(v_ten_hs from 1 for v_cut));
    v_ten := btrim(substring(v_ten_hs from v_cut + 1));
  else
    v_ho := '';
    v_ten := v_ten_hs;
  end if;

  insert into public.cs2_hoc_sinh (ma_hs, ho, ten, lop, co_so, ngay_nhap_hoc)
  values (v_ma_hs, v_ho, v_ten, v_lop, v_co_so, current_date);
end;
$$;

revoke all on function public.them_nhanh_hoc_sinh(text, text, text, text) from public;
grant execute on function public.them_nhanh_hoc_sinh(text, text, text, text) to authenticated;
