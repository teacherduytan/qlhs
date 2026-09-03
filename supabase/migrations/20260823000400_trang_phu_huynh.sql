-- Trang rieng cho PHU HUYNH xem (khac voi trang hoc sinh /hs/:token da co) -
-- dang nhap bang chinh so dien thoai da luu san o ho so hoc sinh (sdt_1 HOAC
-- sdt_2 deu duoc, khac voi dang nhap hoc sinh chi nhan sdt_1), mat khau mac
-- dinh '123' cho moi phu huynh chua tung doi, duoc phep tu doi qua trang.
--
-- Noi dung trang: dong thoi gian cac "thong bao" - chinh la du lieu
-- noi_dung_tin_nhan da co san (dung chung nguon voi tinh nang "Nhan tin PH
-- theo dot" o MessageBatchesPage.tsx, C240) - khong tao nguon du lieu thong
-- bao rieng, tan dung lai. Them 1 cot phan loai de PH de phan biet loai
-- thong bao, va 1 bang rieng "phieu thu hoc phi" cho thong bao loai hoc_phi
-- co chi tiet cac khoan thu.

-- ============================================================
-- 1. Mat khau rieng cua phu huynh, luu tren chinh dong hoc_sinh (1 gia dinh -
--    1 hoc sinh trong pham vi app nay). NULL = chua tung doi, dung mac dinh '123'.
-- ============================================================
alter table public.hoc_sinh add column if not exists mat_khau_ph text;

-- ============================================================
-- 2. Phan loai thong bao tren noi_dung_tin_nhan (da co san tu C240/tu truoc).
--    'chung' = thong bao thong thuong, 'hoc_phi' = co kem phieu thu chi tiet.
-- ============================================================
alter table public.noi_dung_tin_nhan
  add column if not exists loai_thong_bao text not null default 'chung';

alter table public.noi_dung_tin_nhan
  add constraint chk_loai_thong_bao check (loai_thong_bao in ('chung', 'hoc_phi'));

-- ============================================================
-- 3. Phieu thu hoc phi - chi tiet cac khoan thu cua 1 thong bao loai hoc_phi.
--    1 thong bao co the co nhieu dong (vd "Hoc phi thang 9", "Bao hiem y te"...).
-- ============================================================
create table public.phieu_thu_hoc_phi (
  id uuid primary key default gen_random_uuid(),
  thong_bao_id uuid not null references public.noi_dung_tin_nhan(id) on update cascade on delete cascade,
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  ten_khoan_thu text not null,
  so_tien numeric not null,
  ghi_chu text,
  thu_tu integer not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_ten_khoan_thu_khong_rong check (btrim(ten_khoan_thu) <> '')
);

create index idx_phieu_thu_hoc_phi_thong_bao on public.phieu_thu_hoc_phi (thong_bao_id);
create index idx_phieu_thu_hoc_phi_ma_hs on public.phieu_thu_hoc_phi (ma_hs);

alter table public.phieu_thu_hoc_phi enable row level security;

create policy "authenticated can manage phieu_thu_hoc_phi" on public.phieu_thu_hoc_phi
  for all to authenticated using (true) with check (true);

-- Phu huynh xem qua RPC SECURITY DEFINER rieng ben duoi (khong doc thang bang
-- nay qua REST) nen KHONG can policy cho anon o day - giu nguyen tac da dung
-- cho sdt_1/sdt_2/diem_cau_hinh...: du lieu nhay cam/rieng tu chi lo qua RPC
-- co kiem tra dang nhap, khong bao gio grant thang cho anon.

-- ============================================================
-- 4. RPC dang nhap + doc thong bao cho phu huynh.
-- ============================================================
create or replace function public.lay_thong_bao_phu_huynh(
  p_token text,
  p_sdt text,
  p_mat_khau text
)
returns table (
  student jsonb,
  thong_bao jsonb,
  co_mat_khau_rieng boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sdt_input text := regexp_replace(coalesce(p_sdt, ''), '\D', '', 'g');
  v_mat_khau_input text := btrim(coalesce(p_mat_khau, ''));
  v_ma_hs text;
  v_sdt1 text;
  v_sdt2 text;
  v_mat_khau_luu text;
begin
  if p_token is null or btrim(p_token) = '' then
    return;
  end if;

  select hs.ma_hs,
         regexp_replace(coalesce(hs.sdt_1, ''), '\D', '', 'g'),
         regexp_replace(coalesce(hs.sdt_2, ''), '\D', '', 'g'),
         hs.mat_khau_ph
  into v_ma_hs, v_sdt1, v_sdt2, v_mat_khau_luu
  from public.hoc_sinh hs
  where hs.token_ho_so = p_token
  limit 1;

  if v_ma_hs is null then
    return;
  end if;

  if v_sdt_input = '' or (v_sdt_input <> v_sdt1 and v_sdt_input <> v_sdt2) then
    return;
  end if;

  if v_mat_khau_input <> coalesce(v_mat_khau_luu, '123') then
    return;
  end if;

  return query
  select
    jsonb_build_object(
      'ma_hs', hs.ma_hs,
      'ho', hs.ho,
      'ten', hs.ten,
      'to', hs."to",
      'token_ho_so', hs.token_ho_so
    ) as student,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', nt.id,
            'noi_dung', nt.noi_dung,
            'ghi_chu', nt.ghi_chu,
            'loai_thong_bao', nt.loai_thong_bao,
            'created_at', nt.created_at,
            'phieu_thu', (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'id', pt.id,
                    'ten_khoan_thu', pt.ten_khoan_thu,
                    'so_tien', pt.so_tien,
                    'ghi_chu', pt.ghi_chu
                  )
                  order by pt.thu_tu asc, pt.created_at asc
                ),
                '[]'::jsonb
              )
              from public.phieu_thu_hoc_phi pt
              where pt.thong_bao_id = nt.id
            )
          )
          order by nt.created_at desc
        )
        from public.noi_dung_tin_nhan nt
        where nt.ma_hs = hs.ma_hs and nt.da_duyet = true
      ),
      '[]'::jsonb
    ) as thong_bao,
    (v_mat_khau_luu is not null) as co_mat_khau_rieng
  from public.hoc_sinh hs
  where hs.ma_hs = v_ma_hs;
end;
$$;

revoke all on function public.lay_thong_bao_phu_huynh(text, text, text) from public;
grant execute on function public.lay_thong_bao_phu_huynh(text, text, text) to anon;
grant execute on function public.lay_thong_bao_phu_huynh(text, text, text) to authenticated;

-- ============================================================
-- 5. RPC doi mat khau phu huynh - phai dung mat khau CU truoc khi doi.
-- ============================================================
create or replace function public.doi_mat_khau_phu_huynh(
  p_token text,
  p_sdt text,
  p_mat_khau_cu text,
  p_mat_khau_moi text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sdt_input text := regexp_replace(coalesce(p_sdt, ''), '\D', '', 'g');
  v_mat_khau_cu_input text := btrim(coalesce(p_mat_khau_cu, ''));
  v_mat_khau_moi_input text := btrim(coalesce(p_mat_khau_moi, ''));
  v_ma_hs text;
  v_sdt1 text;
  v_sdt2 text;
  v_mat_khau_luu text;
begin
  if p_token is null or btrim(p_token) = '' or v_mat_khau_moi_input = '' then
    return false;
  end if;

  select hs.ma_hs,
         regexp_replace(coalesce(hs.sdt_1, ''), '\D', '', 'g'),
         regexp_replace(coalesce(hs.sdt_2, ''), '\D', '', 'g'),
         hs.mat_khau_ph
  into v_ma_hs, v_sdt1, v_sdt2, v_mat_khau_luu
  from public.hoc_sinh hs
  where hs.token_ho_so = p_token
  limit 1;

  if v_ma_hs is null then
    return false;
  end if;

  if v_sdt_input = '' or (v_sdt_input <> v_sdt1 and v_sdt_input <> v_sdt2) then
    return false;
  end if;

  if v_mat_khau_cu_input <> coalesce(v_mat_khau_luu, '123') then
    return false;
  end if;

  update public.hoc_sinh set mat_khau_ph = v_mat_khau_moi_input where ma_hs = v_ma_hs;
  return true;
end;
$$;

revoke all on function public.doi_mat_khau_phu_huynh(text, text, text, text) from public;
grant execute on function public.doi_mat_khau_phu_huynh(text, text, text, text) to anon;
grant execute on function public.doi_mat_khau_phu_huynh(text, text, text, text) to authenticated;
