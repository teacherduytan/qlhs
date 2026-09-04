-- Chi tiet hoc phi - cot dong dieu khien bang du lieu (xem
-- docs/hocphiPHxem/15-chi-tiet-hoc-phi-dong-cot.md). So luong/ten khoan thu
-- doi theo tung ky (thang) nen KHONG duoc hardcode danh sach cot trong code -
-- moi ky co 1 bang cau hinh cot rieng (hoc_phi_cot_cau_hinh), cac hoc sinh
-- trong cung ky deu tra theo dung tap cot do.
--
-- Doi chieu voi schema da co (migration 20260823000400_trang_phu_huynh.sql):
-- bang "thong bao" cho trang phu huynh la noi_dung_tin_nhan (cot loai_thong_bao
-- da phan biet 'chung'/'hoc_phi'), va da co san bang phieu_thu_hoc_phi (thiet
-- ke CU o C257 - 1 danh sach khoan thu PHANG gan truc tiep vao 1 thong bao,
-- KHONG co khai niem "ky" dung chung cot cho nhieu hoc sinh, khong co "loai"
-- thu/giam_tru/no). Thiet ke moi nay THAY THE cach dung phieu_thu_hoc_phi cho
-- muc dich hien chi tiet hoc phi - GIU NGUYEN bang phieu_thu_hoc_phi (khong
-- xoa, tranh rui ro neu da co du lieu that) nhung tu nay khong import/doc
-- qua bang do nua, chuyen han sang 3 bang moi + noi voi noi_dung_tin_nhan qua
-- cot ma_ky moi.

-- ============================================================
-- 1. Noi thong bao hoc phi voi dung 1 ky cu the (de biet mo chi tiet ky nao).
-- ============================================================
alter table public.noi_dung_tin_nhan add column if not exists ma_ky text;

-- ============================================================
-- 2. hoc_phi_ky - 1 dong = 1 ky thu (vd thang 9/2026).
-- ============================================================
create table public.hoc_phi_ky (
  id uuid primary key default gen_random_uuid(),
  ma_ky text not null unique,
  ten_ky text not null,
  lop text,
  ngay_cap_nhat date,
  created_at timestamptz not null default now()
);

alter table public.noi_dung_tin_nhan
  add constraint fk_noi_dung_tin_nhan_ma_ky foreign key (ma_ky)
  references public.hoc_phi_ky (ma_ky) on update cascade on delete set null;

-- ============================================================
-- 3. hoc_phi_cot_cau_hinh - dinh nghia cot cho 1 ky (dong/config, khong phai du lieu hoc sinh).
-- ============================================================
create table public.hoc_phi_cot_cau_hinh (
  id uuid primary key default gen_random_uuid(),
  ky_id uuid not null references public.hoc_phi_ky (id) on delete cascade,
  ma_cot text not null,
  ten_cot text not null,
  loai text not null check (loai in ('thu', 'giam_tru', 'no')),
  thu_tu integer not null default 0,
  an_neu_bang_khong boolean not null default true,
  unique (ky_id, ma_cot)
);

-- ============================================================
-- 4. hoc_phi_tong - tong thu chinh thuc cua 1 hoc sinh trong 1 ky (lay thang
--    tu nguon Excel, khong tinh lai tu chi tiet - xem muc 5 dac ta).
-- ============================================================
create table public.hoc_phi_tong (
  id uuid primary key default gen_random_uuid(),
  ky_id uuid not null references public.hoc_phi_ky (id) on delete cascade,
  ma_hs text not null references public.hoc_sinh (ma_hs) on update cascade on delete cascade,
  tong_thu numeric not null default 0,
  unique (ky_id, ma_hs)
);

-- ============================================================
-- 5. hoc_phi_chi_tiet - gia tri tung cot cho 1 hoc sinh trong 1 ky (key-value,
--    tra theo ma_cot - component render PHAI lap qua hoc_phi_cot_cau_hinh
--    roi tra gia_tri o day, khong duoc doan vi tri cot).
-- ============================================================
create table public.hoc_phi_chi_tiet (
  id uuid primary key default gen_random_uuid(),
  ky_id uuid not null references public.hoc_phi_ky (id) on delete cascade,
  ma_hs text not null references public.hoc_sinh (ma_hs) on update cascade on delete cascade,
  ma_cot text not null,
  gia_tri numeric not null default 0,
  unique (ky_id, ma_hs, ma_cot)
);

create index idx_hoc_phi_chi_tiet_hs on public.hoc_phi_chi_tiet (ma_hs);
create index idx_hoc_phi_cot_ky on public.hoc_phi_cot_cau_hinh (ky_id);

-- ============================================================
-- RLS: giao vien (authenticated) toan quyen quan ly qua trang import; phu
-- huynh (anon) KHONG duoc cap policy doc thang len 4 bang nay - chi doc duoc
-- qua RPC security definer ben duoi co xac thuc token+sdt+mat khau, dung
-- nguyen tac da ap dung cho sdt_1/sdt_2/mat_khau_ph (khong bao gio grant
-- thang du lieu rieng tu cho anon).
-- ============================================================
alter table public.hoc_phi_ky enable row level security;
alter table public.hoc_phi_cot_cau_hinh enable row level security;
alter table public.hoc_phi_tong enable row level security;
alter table public.hoc_phi_chi_tiet enable row level security;

create policy "authenticated can manage hoc_phi_ky" on public.hoc_phi_ky
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage hoc_phi_cot_cau_hinh" on public.hoc_phi_cot_cau_hinh
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage hoc_phi_tong" on public.hoc_phi_tong
  for all to authenticated using (true) with check (true);
create policy "authenticated can manage hoc_phi_chi_tiet" on public.hoc_phi_chi_tiet
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 6. RPC doc chi tiet hoc phi cho phu huynh.
--
-- Khac voi chu ky de xuat trong dac ta (lay_chi_tiet_hoc_phi(p_ma_hs, p_ma_ky)
-- - nhan thang ma_hs tu ben ngoai): doi thanh xac thuc DUNG token+sdt+mat khau
-- nhu moi RPC cong khai khac trong he thong (lay_ho_so_cong_khai*,
-- lay_thong_bao_phu_huynh) - RPC nhan ma_hs "tran" tu client se cho phep bat
-- ky ai doan/thu ma_hs (vd "HS001") de xem hoc phi cua hoc sinh khac ma khong
-- can biet token/mat khau, pha vo dung nguyen tac bao mat da ap dung xuyen
-- suot du an nay. ma_hs duoc tu xac dinh o server tu p_token da xac thuc,
-- khong nhan tu client.
-- ============================================================
create or replace function public.lay_chi_tiet_hoc_phi(
  p_token text,
  p_sdt text,
  p_mat_khau text,
  p_ma_ky text
)
returns jsonb
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
  v_ky_id uuid;
  v_result jsonb;
begin
  if p_token is null or btrim(p_token) = '' or p_ma_ky is null or btrim(p_ma_ky) = '' then
    return null;
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
    return null;
  end if;

  if v_sdt_input = '' or (v_sdt_input <> v_sdt1 and v_sdt_input <> v_sdt2) then
    return null;
  end if;

  if v_mat_khau_input <> coalesce(v_mat_khau_luu, '123') then
    return null;
  end if;

  select ky.id into v_ky_id from public.hoc_phi_ky ky where ky.ma_ky = p_ma_ky limit 1;
  if v_ky_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'ma_ky', ky.ma_ky,
    'ten_ky', ky.ten_ky,
    'ngay_cap_nhat', ky.ngay_cap_nhat,
    'tong_thu', coalesce((select ht.tong_thu from public.hoc_phi_tong ht where ht.ky_id = ky.id and ht.ma_hs = v_ma_hs), 0),
    'cot_hoc_phi', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ma_cot', cc.ma_cot,
            'ten_cot', cc.ten_cot,
            'loai', cc.loai,
            'thu_tu', cc.thu_tu,
            'an_neu_bang_khong', cc.an_neu_bang_khong
          )
          order by cc.thu_tu asc
        )
        from public.hoc_phi_cot_cau_hinh cc
        where cc.ky_id = ky.id
      ),
      '[]'::jsonb
    ),
    'chi_tiet', coalesce(
      (
        select jsonb_object_agg(ct.ma_cot, ct.gia_tri)
        from public.hoc_phi_chi_tiet ct
        where ct.ky_id = ky.id and ct.ma_hs = v_ma_hs
      ),
      '{}'::jsonb
    )
  )
  into v_result
  from public.hoc_phi_ky ky
  where ky.id = v_ky_id;

  return v_result;
end;
$$;

revoke all on function public.lay_chi_tiet_hoc_phi(text, text, text, text) from public;
grant execute on function public.lay_chi_tiet_hoc_phi(text, text, text, text) to anon;
grant execute on function public.lay_chi_tiet_hoc_phi(text, text, text, text) to authenticated;

-- ============================================================
-- 7. Cap nhat lay_thong_bao_phu_huynh (goc o migration 20260823000400) de tra
--    them 'ma_ky' cho tung thong bao - frontend can gia tri nay de biet goi
--    lay_chi_tiet_hoc_phi() voi ky nao khi phu huynh bam vao 1 thong bao hoc
--    phi. Dung create or replace (khong doi kieu cot tra ve cua "returns
--    table" nen khong can drop function truoc).
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
            'ma_ky', nt.ma_ky
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
