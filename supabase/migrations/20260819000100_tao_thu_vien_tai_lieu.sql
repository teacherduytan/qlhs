-- Thu vien tai lieu hoc sinh (dinh kem anh/tai lieu) — xem docs/11-thu-vien-tai-lieu-hoc-sinh.md
-- Tai lieu khong bat buoc gan voi 1 ghi_nhan cu the (khac ban v1 chua trien khai).

create table if not exists danh_muc_tai_lieu (
  id uuid primary key default gen_random_uuid(),
  ten text not null unique,
  thu_tu integer not null default 0,
  tinh_la_cam_ket boolean not null default false,
  active boolean not null default true
);

insert into danh_muc_tai_lieu (ten, thu_tu, tinh_la_cam_ket) values
  ('Bản tường trình', 1, false),
  ('Bản kiểm điểm', 2, true),
  ('Bản cam kết', 3, true),
  ('Đơn xin phép', 4, false),
  ('Khác', 99, false)
on conflict (ten) do nothing;

create table if not exists tai_lieu (
  id uuid primary key default gen_random_uuid(),
  danh_muc_tai_lieu_id uuid not null references danh_muc_tai_lieu(id),
  ghi_nhan_id text references ghi_nhan(ma_ghi_nhan) on delete set null,
  duong_dan_luu_tru text not null,
  ten_file_goc text,
  loai_tep text,
  kich_thuoc_byte integer,
  ngay_viet date,
  ghi_chu text,
  nguoi_tai_len uuid references auth.users(id),
  thoi_gian_tai_len timestamptz not null default now()
);

create table if not exists tai_lieu_hoc_sinh (
  tai_lieu_id uuid not null references tai_lieu(id) on delete cascade,
  ma_hs text not null references hoc_sinh(ma_hs),
  primary key (tai_lieu_id, ma_hs)
);

create index if not exists idx_tai_lieu_ghi_nhan on tai_lieu(ghi_nhan_id);
create index if not exists idx_tai_lieu_hoc_sinh_ma_hs on tai_lieu_hoc_sinh(ma_hs);

alter table danh_muc_tai_lieu enable row level security;
alter table tai_lieu enable row level security;
alter table tai_lieu_hoc_sinh enable row level security;

create policy "gv_toan_quyen_danh_muc_tai_lieu" on danh_muc_tai_lieu
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "gv_toan_quyen_tai_lieu" on tai_lieu
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "gv_toan_quyen_tai_lieu_hoc_sinh" on tai_lieu_hoc_sinh
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Bucket Storage rieng cho tai lieu, private, chi giao vien da dang nhap moi doc/ghi duoc.
-- Path: {nam_hoc}/{timestamp}_{random4}.{ext} — khong theo prefix ma_hs vi 1 file
-- co the thuoc nhieu hoc sinh (xem bang tai_lieu_hoc_sinh).
insert into storage.buckets (id, name, public)
values ('bien-ban-vi-pham', 'bien-ban-vi-pham', false)
on conflict (id) do nothing;

create policy "gv_toan_quyen_storage_tai_lieu" on storage.objects
  for all using (bucket_id = 'bien-ban-vi-pham' and auth.uid() is not null)
  with check (bucket_id = 'bien-ban-vi-pham' and auth.uid() is not null);
