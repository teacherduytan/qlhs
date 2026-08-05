-- Tinh nang "Goi + Nhan tin (SMS) nhanh cho phu huynh" (xem
-- docs/1X-tinh-nang-goi-sms-phu-huynh.md). Doc gia dinh bang cau_hinh_tuan
-- dung khoa "ma_tuan" (text) nhung schema that dung "tuan_so" (integer
-- primary key, xem migration 20260722000100) - dieu chinh theo dung schema
-- that thay vi lam theo dac ta.

alter type public.loai_du_lieu_import add value if not exists 'tin_nhan_phu_huynh';

create table public.noi_dung_tin_nhan (
  id uuid primary key default gen_random_uuid(),
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  loai_ky text not null check (loai_ky in ('tuan', 'thang')),
  tuan_so integer references public.cau_hinh_tuan(tuan_so),
  thang integer check (thang between 1 and 12),
  nam integer,
  -- Khoa gop 1 cot duy nhat cho ca 2 kieu ky (tuan/thang) de chi can 1 unique
  -- index KHONG partial - tranh phai xu ly 2 partial unique index rieng cho
  -- tung loai_ky (Postgres yeu cau ON CONFLICT khop dung predicate cua
  -- partial index, supabase-js .upsert() khong ho tro chi dinh predicate).
  ky_key text generated always as (
    case
      when loai_ky = 'tuan' then 'T' || tuan_so::text
      else 'M' || lpad(thang::text, 2, '0') || '-' || nam::text
    end
  ) stored,
  noi_dung text not null,
  nguon_import text,
  created_by text,
  created_at timestamptz not null default now(),

  constraint chk_ky_hop_le check (
    (loai_ky = 'tuan' and tuan_so is not null and thang is null and nam is null)
    or
    (loai_ky = 'thang' and thang is not null and nam is not null and tuan_so is null)
  ),
  constraint chk_noi_dung_khong_rong check (btrim(noi_dung) <> '')
);

-- Import lai dung 1 ky (tuan hoac thang) da co se CAP NHAT ban ghi do
-- (upsert theo ma_hs + ky_key), khong tao ban trung - dung quyet dinh
-- thiet ke da chot voi giao vien.
create unique index uq_tin_nhan_ky on public.noi_dung_tin_nhan (ma_hs, ky_key);

comment on table public.noi_dung_tin_nhan is
  'Noi dung SMS goi y cho tung hoc sinh, luu theo tuan/thang, giu lich su nhieu lan (khong ghi de).';

-- Bao mat: bang chua noi dung lien lac phu huynh - CHI cho giao vien da
-- dang nhap (Supabase Auth) doc/ghi, tuyet doi khong lo qua route cong khai
-- /#/hs/<token> hay RPC SECURITY DEFINER dung cho ho so cong khai (dung
-- nguyen tac da ap dung cho sdt_1/sdt_2 - khong grant gi cho role anon).
alter table public.noi_dung_tin_nhan enable row level security;

create policy "authenticated can manage noi_dung_tin_nhan" on public.noi_dung_tin_nhan
  for all to authenticated using (true) with check (true);
