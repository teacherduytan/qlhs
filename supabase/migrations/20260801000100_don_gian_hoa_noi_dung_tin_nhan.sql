-- Ban thiet ke ban dau (migration 20260731000100) dung ky tuan/thang lam
-- khoa chinh, upsert theo ky. Doc dac ta ban moi (docs/10-tinh-nang-goi-sms-phu-huynh.md)
-- doi huong don gian hoa: KHONG con khai niem tuan/thang trong JSON import -
-- moi lan import la 1 ban ghi MOI (khong upsert/ghi de), lich su hinh thanh
-- tu nhien qua nhieu lan import; "noi dung hien tai" = ban ghi da_duyet=true
-- moi nhat theo created_at. Chuan bi san cot nguon/da_duyet cho giai doan 2
-- (he thong tu sinh noi dung, can GVCN duyet truoc khi gui).
--
-- Bang chua rat it/chua co du lieu that (tinh nang moi lam o C203, chua xac
-- nhan da ap dung migration cu len Supabase that hay chua) nen drop va tao
-- lai cho gon thay vi ALTER nhieu buoc phuc tap (bo cot generated ky_key,
-- doi kieu created_by tu text sang uuid...). Neu migration cu (20260731000100)
-- da chay tren Supabase that VA DA CO DU LIEU, thao tac nay se XOA SACH du
-- lieu do - kiem tra truoc khi chay tren moi truong that.

drop table if exists public.noi_dung_tin_nhan;

create table public.noi_dung_tin_nhan (
  id uuid primary key default gen_random_uuid(),
  ma_hs text not null references public.hoc_sinh(ma_hs) on update cascade on delete cascade,
  noi_dung text not null,
  ghi_chu text, -- nhan tu do cho GV (vi du "Tuan 4") - chi de hien thi, khong rang buoc cau truc
  nguon text not null default 'nhap_tay' check (nguon in ('nhap_tay', 'tu_dong')),
  -- 'nhap_tay' = import JSON thu cong (giai doan nay); 'tu_dong' = he thong tu sinh (giai doan 2, chua dung)
  da_duyet boolean not null default true,
  -- mac dinh true vi noi dung 'nhap_tay' do GV tu soan = coi nhu da duyet;
  -- noi dung 'tu_dong' sau nay nen default false, can GV duyet truoc khi gui
  --
  -- Giu them cot nay NGOAI dac ta goc: de tiep tuc ho tro "xoa nguyen luot
  -- import" (da lam o C205) - dac ta ban moi khong nhac cot nay nhung khong
  -- cam, va tinh nang xoa theo lo da duoc yeu cau truoc do nen giu lai.
  nguon_import text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  constraint chk_noi_dung_khong_rong check (btrim(noi_dung) <> '')
);

create index idx_tin_nhan_hs on public.noi_dung_tin_nhan (ma_hs, created_at desc);

comment on table public.noi_dung_tin_nhan is
  'Noi dung SMS goi y cho tung hoc sinh - moi lan import la 1 ban ghi moi (lich su tu nhien), "hien tai" = ban ghi da_duyet moi nhat.';

-- Bao mat: giu nguyen nguyen tac da ap dung cho sdt_1/sdt_2 - chi
-- authenticated (giao vien da dang nhap) duoc doc/ghi, khong cap gi cho anon,
-- khong lo qua route cong khai /#/hs/<token>.
alter table public.noi_dung_tin_nhan enable row level security;

create policy "authenticated can manage noi_dung_tin_nhan" on public.noi_dung_tin_nhan
  for all to authenticated using (true) with check (true);
