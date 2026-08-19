-- 1 tai_lieu co the co nhieu trang (vd chup 2 to giay cua cung 1 ban tuong trinh) —
-- tach duong_dan_luu_tru/ten_file_goc/loai_tep/kich_thuoc_byte tu tai_lieu sang
-- bang con tai_lieu_trang, moi dong la 1 file/anh, sap theo thu_tu.

create table if not exists tai_lieu_trang (
  id uuid primary key default gen_random_uuid(),
  tai_lieu_id uuid not null references tai_lieu(id) on delete cascade,
  thu_tu integer not null default 1,
  duong_dan_luu_tru text not null,
  ten_file_goc text,
  loai_tep text,
  kich_thuoc_byte integer
);

create index if not exists idx_tai_lieu_trang_tai_lieu on tai_lieu_trang(tai_lieu_id);

alter table tai_lieu_trang enable row level security;
create policy "gv_toan_quyen_tai_lieu_trang" on tai_lieu_trang
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Chuyen du lieu cu (neu bang tai_lieu da co du lieu that tu migration truoc) sang
-- tai_lieu_trang truoc khi drop cot cu, tranh mat du lieu neu da tung tai len thu.
insert into tai_lieu_trang (tai_lieu_id, thu_tu, duong_dan_luu_tru, ten_file_goc, loai_tep, kich_thuoc_byte)
select id, 1, duong_dan_luu_tru, ten_file_goc, loai_tep, kich_thuoc_byte
from tai_lieu
where duong_dan_luu_tru is not null
  and not exists (select 1 from tai_lieu_trang where tai_lieu_trang.tai_lieu_id = tai_lieu.id);

alter table tai_lieu drop column if exists duong_dan_luu_tru;
alter table tai_lieu drop column if exists ten_file_goc;
alter table tai_lieu drop column if exists loai_tep;
alter table tai_lieu drop column if exists kich_thuoc_byte;
